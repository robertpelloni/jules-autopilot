import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const swarm = await prisma.agentSwarm.findUnique({
            where: { id: params.id },
            include: {
                tasks: {
                    orderBy: { priority: 'asc' } as any
                }
            }
        }) as any;

        if (!swarm) {
            return NextResponse.json({ error: 'Swarm not found' }, { status: 404 });
        }

        // Parse event history from metadata
        const events = JSON.parse(swarm.metadata || '[]');

        return NextResponse.json({ swarm, events });
    } catch (error) {
        console.error('Failed to fetch swarm:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
