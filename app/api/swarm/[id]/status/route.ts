import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: swarmId } = await params;
    try {
        const { status } = await request.json();

        if (status !== 'running' && status !== 'paused' && status !== 'cancelled') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const swarm = await prisma.agentSwarm.update({
            where: { id: swarmId },
            data: { status }
        });

        // Notify the daemon to refresh its dispatcher loop
        try {
            const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
            await fetch(`${daemonUrl}/api/swarm/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ swarmId })
            });
        } catch (err) {
            console.error('Failed to notify daemon of swarm status change:', err);
        }

        return NextResponse.json({ swarm });
    } catch (error) {
        console.error('Failed to update swarm status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
