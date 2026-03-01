import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sessions/[id]/replay — Get the full timeline of a session
 * for step-by-step replay in the dashboard.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    const { id: sessionId } = await params;

    const snapshots = await prisma.sessionSnapshot.findMany({
        where: { sessionId },
        orderBy: { sequence: 'asc' }
    });

    if (snapshots.length === 0) {
        return NextResponse.json({
            error: 'No replay data found for this session'
        }, { status: 404 });
    }

    // Build timeline summary
    const timeline = snapshots.map(s => ({
        id: s.id,
        sequence: s.sequence,
        eventType: s.eventType,
        actor: s.actor,
        content: s.content,
        metadata: s.metadata ? JSON.parse(s.metadata) : null,
        timestamp: s.timestamp
    }));

    return NextResponse.json({
        sessionId,
        totalSteps: snapshots.length,
        startTime: snapshots[0].timestamp,
        endTime: snapshots[snapshots.length - 1].timestamp,
        timeline
    });
}
