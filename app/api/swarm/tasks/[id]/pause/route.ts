import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SwarmCoordinator } from '@/server/swarm-coordinator';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: taskId } = await params;
    try {
        await SwarmCoordinator.pauseTask(taskId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to pause task:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
