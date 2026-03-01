import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: taskId } = await params;
    try {
        const existingTask = await prisma.swarmTask.findUnique({ where: { id: taskId } });
        if (!existingTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const newRetryCount = (existingTask as any).retryCount + 1;
        const shouldEscalate = newRetryCount > 1;

        const task = await prisma.swarmTask.update({
            where: { id: taskId },
            data: {
                status: 'pending',
                result: null,
                sessionId: null,
                assignedTo: null,
                retryCount: newRetryCount,
                isEscalated: shouldEscalate || (existingTask as any).isEscalated
            } as any
        });

        // Notify daemon to resume dispatching
        try {
            const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
            await fetch(`${daemonUrl}/api/swarm/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ swarmId: task.swarmId })
            });
        } catch (err) {
            console.error('Failed to notify daemon of task retry:', err);
        }

        return NextResponse.json({ task });
    } catch (error) {
        console.error('Failed to retry swarm task:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
