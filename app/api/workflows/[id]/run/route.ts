import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeWorkflow } from '@/server/workflow-engine';
import { handleInternalError } from '@/lib/api/error';

/**
 * POST /api/workflows/[id]/run — Trigger a workflow execution.
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    try {
        const { id } = await params;
        const workflow = await prisma.workflow.findUnique({ where: { id } });

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        if (workflow.status === 'running') {
            return NextResponse.json({ error: 'Workflow is already running' }, { status: 409 });
        }

        // Execute asynchronously — don't block the API response
        executeWorkflow(id).catch(err => {
            console.error(`[WorkflowAPI] Background execution failed for ${id}:`, err);
        });

        return NextResponse.json({ message: 'Workflow execution started', workflowId: id });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
