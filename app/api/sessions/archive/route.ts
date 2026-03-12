import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { handleInternalError } from '@/lib/api/error';

/**
 * POST /api/sessions/archive — Archive old sessions for long-term storage.
 * 
 * Moves completed sessions older than a threshold to an archived state,
 * compacting their snapshots into a summary record.
 * 
 * Body: { olderThanDays?: number, dryRun?: boolean }
 */
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const olderThanDays = body.olderThanDays || 30;
        const dryRun = body.dryRun || false;

        const cutoffDate = new Date(Date.now() - olderThanDays * 86400_000);

        // Find snapshots from old sessions
        const oldSnapshots = await prisma.sessionSnapshot.findMany({
            where: {
                timestamp: { lt: cutoffDate }
            },
            select: { id: true, sessionId: true, eventType: true, timestamp: true },
            orderBy: { timestamp: 'asc' }
        });

        // Group by session
        const sessionGroups: Record<string, typeof oldSnapshots> = {};
        for (const snap of oldSnapshots) {
            if (!sessionGroups[snap.sessionId]) sessionGroups[snap.sessionId] = [];
            sessionGroups[snap.sessionId]!.push(snap);
        }

        const sessionsToArchive = Object.keys(sessionGroups).length;
        const snapshotsToRemove = oldSnapshots.length;

        if (dryRun) {
            return NextResponse.json({
                dryRun: true,
                sessionsToArchive,
                snapshotsToRemove,
                cutoffDate: cutoffDate.toISOString(),
                message: `Would archive ${sessionsToArchive} sessions with ${snapshotsToRemove} snapshots.`
            });
        }

        // Create archive summary notifications for each session
        for (const [sessionId, snapshots] of Object.entries(sessionGroups)) {
            const eventTypes = [...new Set(snapshots.map(s => s.eventType))];
            const firstTimestamp = snapshots[0]?.timestamp;
            const lastTimestamp = snapshots[snapshots.length - 1]?.timestamp;

            await prisma.notification.create({
                data: {
                    type: 'archive',
                    title: `Archived: ${sessionId}`,
                    body: JSON.stringify({
                        sessionId,
                        snapshotCount: snapshots.length,
                        eventTypes,
                        firstEvent: firstTimestamp?.toISOString(),
                        lastEvent: lastTimestamp?.toISOString(),
                        archivedAt: new Date().toISOString()
                    }),
                    severity: 'info',
                    resourceType: 'session',
                    resourceId: sessionId
                }
            });
        }

        // Delete archived snapshots
        const deleted = await prisma.sessionSnapshot.deleteMany({
            where: { id: { in: oldSnapshots.map(s => s.id) } }
        });

        return NextResponse.json({
            success: true,
            sessionsArchived: sessionsToArchive,
            snapshotsRemoved: deleted.count,
            cutoffDate: cutoffDate.toISOString()
        });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
