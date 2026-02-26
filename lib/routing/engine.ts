import { prisma } from '@/lib/prisma';
import { getRemainingBudget, estimateCost } from './telemetry';

export type TaskType = 'code_review' | 'fast_chat' | 'deep_reasoning' | 'default';

export interface ResolvedProvider {
    provider: string;
    model: string;
    reason: string;
    budgetRemaining: number;
}

const DEFAULT_MODELS: Record<TaskType, { provider: string; model: string; efficient: { provider: string; model: string } }> = {
    'code_review': {
        provider: 'anthropic', model: 'claude-3-5-sonnet',
        efficient: { provider: 'anthropic', model: 'claude-3-haiku' }
    },
    'deep_reasoning': {
        provider: 'openai', model: 'gpt-4o',
        efficient: { provider: 'google', model: 'gemini-1.5-pro' } // Assumed cheaper reasoning fallback
    },
    'fast_chat': {
        provider: 'openai', model: 'gpt-4o-mini',
        efficient: { provider: 'google', model: 'gemini-1.5-flash' }
    },
    'default': {
        provider: 'openai', model: 'gpt-4o-mini',
        efficient: { provider: 'openai', model: 'gpt-4o-mini' }
    },
};

/**
 * Evaluates the best provider/model combination based on Workspace policy, 
 * the requested task type, and dynamically checking against the remaining monthly budget.
 */
export async function resolveProvider(workspaceId: string, taskType: TaskType): Promise<ResolvedProvider> {
    // 1. Evaluate current state of the budget
    const budgetRemaining = await getRemainingBudget(workspaceId);

    // If practically bankrupt, block execution
    if (budgetRemaining < 0.01) {
        throw new Error('BUDGET_EXCEEDED');
    }

    // 2. Fetch specific Workspace routing policy for this task type
    const policy = await prisma.routingPolicy.findUnique({
        where: {
            workspaceId_taskType: {
                workspaceId,
                taskType
            }
        }
    });

    // 3. Fallbacks and Base Models
    const defaults = DEFAULT_MODELS[taskType] || DEFAULT_MODELS['default'];
    let selectedProvider = defaults.provider;
    let selectedModel = defaults.model;
    let reason = `Using default configured model for task type: ${taskType}`;

    // Apply DB Policy Overrides if present and budget allows
    if (policy?.preferredProvider && policy?.preferredModel) {
        selectedProvider = policy.preferredProvider;
        selectedModel = policy.preferredModel;
        reason = `Applied workspace routing policy override for ${taskType}`;
    }

    // 4. Force Cost Efficiency Mode if low budget or explicitly forced
    const isLowBudget = budgetRemaining < 10.00; // Force efficiency mode if under $10 left

    if (isLowBudget || policy?.costEfficiencyMode) {
        selectedProvider = defaults.efficient.provider;
        selectedModel = defaults.efficient.model;
        reason = isLowBudget ?
            `Forced cost-efficiency fallback. Remaining budget dangerously low ($${budgetRemaining.toFixed(2)}).` :
            `Cost efficiency mode requested by workspace routing policy.`;
    }

    return {
        provider: selectedProvider,
        model: selectedModel,
        reason,
        budgetRemaining
    };
}
