import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { handleInternalError } from '@/lib/api/error';
import { z } from 'zod';
import { resolveProvider, TaskType } from '@/lib/routing/engine';
import { getRemainingBudget, estimateCost } from '@/lib/routing/telemetry';

const SimulationPayloadSchema = z.object({
    taskType: z.enum(['code_review', 'fast_chat', 'deep_reasoning', 'default']),
    promptTokens: z.number().int().min(1),
    completionTokens: z.number().int().min(1)
});

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const parseResult = SimulationPayloadSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid simulation payload schema', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { taskType, promptTokens, completionTokens } = parseResult.data;

        // 1. Snapshot Budget Before
        const budgetRemainingBefore = await getRemainingBudget(session.workspaceId);

        let selectedProvider = '';
        let selectedModel = '';
        let policyReason = '';

        // 2. Resolve provider (simulating actual run)
        try {
            const resolution = await resolveProvider(session.workspaceId, taskType as TaskType);
            selectedProvider = resolution.provider;
            selectedModel = resolution.model;
            policyReason = resolution.reason;
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'BUDGET_EXCEEDED') {
                return NextResponse.json(
                    { error: 'Payment Required', message: 'Workspace LLM budget has been fully consumed.' },
                    { status: 402 }
                );
            }
            throw err;
        }

        // 3. Estimate cost
        const estimatedCost = estimateCost(selectedProvider, selectedModel, promptTokens, completionTokens);
        const budgetRemainingAfter = Math.max(0, budgetRemainingBefore - estimatedCost);

        // 4. Return the simulation projection
        return NextResponse.json({
            selectedProvider,
            selectedModel,
            estimatedCost,
            budgetRemainingBefore,
            budgetRemainingAfter,
            policyReason
        }, { status: 200 });

    } catch (error) {
        return handleInternalError(req, error);
    }
}
