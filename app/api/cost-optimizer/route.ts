import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cost-optimizer — Returns cost analytics and routing recommendations.
 * Query params: ?taskType=nudge (optional filter)
 */
export async function GET(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const taskType = url.searchParams.get('taskType') || 'all';

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await prisma.providerUsageLog.findMany({
        where: {
            createdAt: { gte: since },
            ...(taskType !== 'all' ? { taskType } : {})
        },
        orderBy: { createdAt: 'asc' }
    });

    const totalCostCents = logs.reduce((sum, l) => sum + l.costCents, 0);
    const totalRequests = logs.length;
    const avgCostPerRequest = totalRequests > 0 ? totalCostCents / totalRequests : 0;

    // Group by provider
    const providerMap = new Map<string, { totalCost: number; requestCount: number; avgLatency: number }>();
    for (const log of logs) {
        const existing = providerMap.get(log.provider) ?? { totalCost: 0, requestCount: 0, avgLatency: 0 };
        existing.totalCost += log.costCents;
        existing.avgLatency = (existing.avgLatency * existing.requestCount + log.latencyMs) / (existing.requestCount + 1);
        existing.requestCount++;
        providerMap.set(log.provider, existing);
    }
    const costByProvider = Array.from(providerMap, ([provider, data]) => ({
        provider,
        ...data,
        avgLatency: Math.round(data.avgLatency)
    }));

    // Group by task type
    const taskMap = new Map<string, { totalCost: number; requestCount: number }>();
    for (const log of logs) {
        const tt = log.taskType || 'unknown';
        const existing = taskMap.get(tt) ?? { totalCost: 0, requestCount: 0 };
        existing.totalCost += log.costCents;
        existing.requestCount++;
        taskMap.set(tt, existing);
    }
    const costByTaskType = Array.from(taskMap, ([tt, data]) => ({ taskType: tt, ...data }));

    // Daily costs for chart
    const dayMap = new Map<string, { totalCost: number; requestCount: number }>();
    for (const log of logs) {
        const date = log.createdAt.toISOString().slice(0, 10);
        const existing = dayMap.get(date) ?? { totalCost: 0, requestCount: 0 };
        existing.totalCost += log.costCents;
        existing.requestCount++;
        dayMap.set(date, existing);
    }
    const dailyCosts = Array.from(dayMap, ([date, data]) => ({ date, ...data }));

    // Simple routing recommendation
    let recommended = { provider: 'openai', model: 'gpt-4o-mini', reason: 'Default — no usage data' };
    if (costByProvider.length > 0) {
        const best = costByProvider.sort((a, b) =>
            (a.totalCost / a.requestCount) - (b.totalCost / b.requestCount)
        )[0];
        if (best) {
            recommended = {
                provider: best.provider,
                model: best.provider,
                reason: `Lowest avg cost: $${(best.totalCost / best.requestCount / 100).toFixed(4)}/req, ${best.avgLatency}ms avg latency`
            };
        }
    }

    return NextResponse.json({
        summary: {
            totalCostDollars: (totalCostCents / 100).toFixed(2),
            totalRequests,
            avgCostPerRequestCents: avgCostPerRequest.toFixed(2),
            periodDays: 30
        },
        recommended,
        costByProvider,
        costByTaskType,
        dailyCosts
    });
}
