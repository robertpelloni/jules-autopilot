import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleInternalError } from '@/lib/api/error';

/**
 * GET /api/workflows — List all workflows with step counts.
 * POST /api/workflows — Create a new workflow with steps.
 */
export async function GET(req: Request) {
    try {
        const workflows = await prisma.workflow.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                steps: {
                    orderBy: { order: 'asc' },
                    select: { id: true, name: true, stepType: true, status: true, order: true }
                }
            }
        });

        return NextResponse.json({ workflows });
    } catch (error) {
        return handleInternalError(req, error);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, triggerType, steps } = body;

        if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
            return NextResponse.json(
                { error: 'Name and at least one step are required' },
                { status: 400 }
            );
        }

        const workflow = await prisma.workflow.create({
            data: {
                name,
                description: description || null,
                triggerType: triggerType || 'manual',
                steps: {
                    create: steps.map((step: { name: string; stepType: string; config?: string; dependsOn?: string }, index: number) => ({
                        order: index + 1,
                        name: step.name,
                        stepType: step.stepType,
                        config: step.config || '{}',
                        dependsOn: step.dependsOn || null
                    }))
                }
            },
            include: { steps: { orderBy: { order: 'asc' } } }
        });

        return NextResponse.json({ workflow }, { status: 201 });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
