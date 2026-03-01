import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: taskId } = await params;
    try {
        const task = await prisma.swarmTask.findUnique({ where: { id: taskId } });
        if (!task || task.status !== 'await_review') {
            return NextResponse.json({ error: 'Task not in review state' }, { status: 400 });
        }

        const updatedTask = await prisma.swarmTask.update({
            where: { id: taskId },
            data: { status: 'completed' }
        });

        // Notify daemon to check for dependent tasks
        try {
            const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
            await fetch(`${daemonUrl}/api/swarm/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ swarmId: task.swarmId })
            });
        } catch (err) {
            console.error('Failed to notify daemon of task approval:', err);
        }

        return NextResponse.json({ task: updatedTask });
    } catch (error) {
        console.error('Failed to approve swarm task:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
