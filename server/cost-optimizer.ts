import { prisma } from '../lib/prisma';

/**
 * Provider cost table (cents per 1K tokens).
 * These are approximate rates — adjust for your contracts.
 */
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.25, output: 1.0 },
    'gpt-4o-mini': { input: 0.015, output: 0.06 },
    'gpt-4-turbo': { input: 1.0, output: 3.0 },
    'claude-3-5-sonnet': { input: 0.3, output: 1.5 },
    'claude-3-haiku': { input: 0.025, output: 0.125 },
    'deepseek-v3': { input: 0.014, output: 0.028 },
    'deepseek-r1': { input: 0.055, output: 0.22 }
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rates = COST_PER_1K_TOKENS[model] ?? { input: 0.1, output: 0.3 };
    return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

/**
 * Log a provider usage event for telemetry and cost tracking.
 */
export async function logProviderUsage(params: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    sessionId?: string;
    taskType?: string;
    success?: boolean;
}): Promise<void> {
    const costCents = estimateCost(params.model, params.inputTokens, params.outputTokens);

    await prisma.providerUsageLog.create({
        data: {
            provider: params.provider,
            model: params.model,
            inputTokens: params.inputTokens,
            outputTokens: params.outputTokens,
            latencyMs: params.latencyMs,
            costCents,
            sessionId: params.sessionId || null,
            taskType: params.taskType || null,
            success: params.success ?? true
        }
    });
}

/**
 * Analyze recent usage and recommend the optimal provider/model
 * based on cost efficiency and reliability metrics.
 */
export async function getOptimalRoute(taskType: string): Promise<{
    recommended: string;
    model: string;
    reason: string;
    avgCostCents: number;
    avgLatencyMs: number;
    successRate: number;
}> {
    // Get the last 7 days of usage data
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const logs = await prisma.providerUsageLog.findMany({
        where: {
            createdAt: { gte: since },
            ...(taskType !== 'all' ? { taskType } : {})
        }
    });

    if (logs.length === 0) {
        return {
            recommended: 'openai',
            model: 'gpt-4o-mini',
            reason: 'No usage data available. Defaulting to most cost-effective option.',
            avgCostCents: 0,
            avgLatencyMs: 0,
            successRate: 1
        };
    }

    // Aggregate by provider+model
    const aggregated = new Map<string, {
        provider: string;
        model: string;
        totalCost: number;
        totalLatency: number;
        successCount: number;
        totalCount: number;
    }>();

    for (const log of logs) {
        const key = `${log.provider}:${log.model}`;
        const existing = aggregated.get(key) ?? {
            provider: log.provider,
            model: log.model,
            totalCost: 0,
            totalLatency: 0,
            successCount: 0,
            totalCount: 0
        };

        existing.totalCost += log.costCents;
        existing.totalLatency += log.latencyMs;
        existing.totalCount++;
        if (log.success) existing.successCount++;

        aggregated.set(key, existing);
    }

    // Score each provider: lower is better
    // Score = (avgCost * 2) + (avgLatency / 1000) - (successRate * 5)
    let bestKey = '';
    let bestScore = Infinity;

    for (const [key, stats] of aggregated) {
        const avgCost = stats.totalCost / stats.totalCount;
        const avgLatency = stats.totalLatency / stats.totalCount;
        const successRate = stats.successCount / stats.totalCount;

        const score = (avgCost * 2) + (avgLatency / 1000) - (successRate * 5);
        if (score < bestScore) {
            bestScore = score;
            bestKey = key;
        }
    }

    const best = aggregated.get(bestKey)!;
    const avgCost = best.totalCost / best.totalCount;
    const avgLatency = best.totalLatency / best.totalCount;
    const successRate = best.successCount / best.totalCount;

    return {
        recommended: best.provider,
        model: best.model,
        reason: `Best cost/performance ratio: $${(avgCost / 100).toFixed(4)} avg, ${Math.round(avgLatency)}ms latency, ${(successRate * 100).toFixed(1)}% success over ${best.totalCount} requests.`,
        avgCostCents: avgCost,
        avgLatencyMs: avgLatency,
        successRate
    };
}

/**
 * Get cost analytics summary for the dashboard.
 */
export async function getCostAnalytics(): Promise<{
    totalCostCents: number;
    totalRequests: number;
    avgCostPerRequest: number;
    costByProvider: Array<{ provider: string; totalCost: number; requestCount: number }>;
    costByTaskType: Array<{ taskType: string; totalCost: number; requestCount: number }>;
    dailyCosts: Array<{ date: string; totalCost: number; requestCount: number }>;
}> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await prisma.providerUsageLog.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' }
    });

    const totalCostCents = logs.reduce((sum, l) => sum + l.costCents, 0);
    const totalRequests = logs.length;
    const avgCostPerRequest = totalRequests > 0 ? totalCostCents / totalRequests : 0;

    // Group by provider
    const providerMap = new Map<string, { totalCost: number; requestCount: number }>();
    for (const log of logs) {
        const existing = providerMap.get(log.provider) ?? { totalCost: 0, requestCount: 0 };
        existing.totalCost += log.costCents;
        existing.requestCount++;
        providerMap.set(log.provider, existing);
    }
    const costByProvider = Array.from(providerMap, ([provider, data]) => ({ provider, ...data }));

    // Group by task type
    const taskMap = new Map<string, { totalCost: number; requestCount: number }>();
    for (const log of logs) {
        const taskType = log.taskType || 'unknown';
        const existing = taskMap.get(taskType) ?? { totalCost: 0, requestCount: 0 };
        existing.totalCost += log.costCents;
        existing.requestCount++;
        taskMap.set(taskType, existing);
    }
    const costByTaskType = Array.from(taskMap, ([taskType, data]) => ({ taskType, ...data }));

    // Group by day
    const dayMap = new Map<string, { totalCost: number; requestCount: number }>();
    for (const log of logs) {
        const date = log.createdAt.toISOString().slice(0, 10);
        const existing = dayMap.get(date) ?? { totalCost: 0, requestCount: 0 };
        existing.totalCost += log.costCents;
        existing.requestCount++;
        dayMap.set(date, existing);
    }
    const dailyCosts = Array.from(dayMap, ([date, data]) => ({ date, ...data }));

    return { totalCostCents, totalRequests, avgCostPerRequest, costByProvider, costByTaskType, dailyCosts };
}
