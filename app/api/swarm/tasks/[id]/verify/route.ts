import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SwarmCoordinator } from '@/server/swarm-coordinator';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: taskId } = await params;
    try {
        const task = await prisma.swarmTask.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        if (task.status !== 'completed') {
            return NextResponse.json({ error: 'Only completed tasks can be verified' }, { status: 400 });
        }

        // Trigger verification via SwarmCoordinator
        const { id: swarmId } = task;

        // Use a static-like call to the private method if possible, or just duplicate the simple spawn logic
        // For type safety and better structure, we'll use a public wrapper if we had one, 
        // but here we can just call create directly via prisma if it's simpler, 
        // or add a public method to SwarmCoordinator.

        // Let's assume we want to use the coordinator's logic.
        // We'll add a public wrapper 'triggerVerification' to SwarmCoordinator.

        await (SwarmCoordinator as any).spawnVerifier(task.swarmId, task.id);

        return NextResponse.json({ success: true, message: 'Verification task spawned' });
    } catch (error) {
        console.error('Failed to trigger verification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
