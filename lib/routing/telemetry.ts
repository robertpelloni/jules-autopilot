import { prisma } from '@/lib/prisma';

// Pricing per 1M tokens (as of early 2024 approximation)
const PRICING_MATRIX: Record<string, { prompt: number; completion: number }> = {
    'openai:gpt-4o': { prompt: 5.0, completion: 15.0 },
    'openai:gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
    'anthropic:claude-3-5-sonnet': { prompt: 3.0, completion: 15.0 },
    'anthropic:claude-3-haiku': { prompt: 0.25, completion: 1.25 },
    'google:gemini-1.5-pro': { prompt: 3.5, completion: 10.5 },
    'google:gemini-1.5-flash': { prompt: 0.075, completion: 0.30 },
};

/**
 * Calculates the estimated cost of an LLM request in USD.
 */
export function estimateCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
    const key = `${provider}:${model}`.toLowerCase();

    // Default to the cheapest model assumed rate if unknown to avoid over-blocking
    const pricing = PRICING_MATRIX[key] || { prompt: 0.10, completion: 0.50 };

    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
}

/**
 * Records a provider's telemetry and calculates the cost.
 */
export async function recordTelemetry(params: {
    workspaceId: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
}) {
    const { workspaceId, provider, model, promptTokens, completionTokens } = params;
    const estimatedCostUSD = estimateCost(provider, model, promptTokens, completionTokens);

    await prisma.providerTelemetry.create({
        data: {
            workspaceId,
            provider,
            model,
            promptTokens,
            completionTokens,
            estimatedCostUSD
        }
    });

    return { estimatedCostUSD };
}

/**
 * Returns the currently remaining budget for the workspace this month.
 */
export async function getRemainingBudget(workspaceId: string): Promise<number> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { monthlyBudget: true }
    });

    if (!workspace) {
        throw new Error('Workspace not found');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await prisma.providerTelemetry.aggregate({
        where: {
            workspaceId,
            timestamp: { gte: startOfMonth }
        },
        _sum: {
            estimatedCostUSD: true
        }
    });

    const spent = result._sum.estimatedCostUSD || 0;
    return Math.max(0, workspace.monthlyBudget - spent);
}
