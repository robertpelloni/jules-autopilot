import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: swarmId } = await params;
    try {
        const swarm = await prisma.agentSwarm.findUnique({
            where: { id: swarmId },
            include: { tasks: true }
        });

        if (!swarm) {
            return NextResponse.json({ error: 'Swarm not found' }, { status: 404 });
        }

        // Aggregate analytics
        const taskBreakdown = swarm.tasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            inputTokens: (t as any).inputTokens || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
            outputTokens: (t as any).outputTokens || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
            costCents: (t as any).costCents || 0 // eslint-disable-line @typescript-eslint/no-explicit-any
        }));

        const totalTokens = taskBreakdown.reduce((sum, t) => sum + t.inputTokens + t.outputTokens, 0);
        const totalCostCents = taskBreakdown.reduce((sum, t) => sum + t.costCents, 0);

        return NextResponse.json({
            swarmId,
            name: swarm.name,
            metrics: {
                totalTokens,
                totalCostCents,
                estimatedCostUSD: totalCostCents / 100,
                taskCount: swarm.tasks.length,
                completedCount: swarm.tasks.filter(t => t.status === 'completed').length
            },
            tasks: taskBreakdown
        });
    } catch (error) {
        console.error('Failed to fetch swarm analytics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
