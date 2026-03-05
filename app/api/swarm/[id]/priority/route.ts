import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: swarmId } = await params;
    try {
        const body = await request.json();

        if (typeof body.priority !== 'number') {
            return NextResponse.json({ error: 'Priority must be a number' }, { status: 400 });
        }

        const swarm = await prisma.agentSwarm.update({
            where: { id: swarmId },
            data: { priority: body.priority }
        });

        // Optionally, update the priority of all pending tasks in the swarm
        await prisma.swarmTask.updateMany({
            where: { swarmId, status: 'pending' },
            data: { priority: body.priority }
        });

        return NextResponse.json({ success: true, swarm });
    } catch (error) {
        console.error('Failed to update priority:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
