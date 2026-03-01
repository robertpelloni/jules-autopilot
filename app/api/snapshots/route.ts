import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/snapshots — List session snapshot events.
 * Query params:
 *   - sessionId (required): The session to load events for
 *   - skip: Pagination offset (default: 0)
 *   - take: Page size (default: 50, max: 200)
 */
export async function GET(req: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        const skip = Math.max(0, parseInt(searchParams.get('skip') || '0', 10));
        const take = Math.min(200, Math.max(1, parseInt(searchParams.get('take') || '50', 10)));

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
        }

        const events = await prisma.sessionSnapshot.findMany({
            where: { sessionId },
            orderBy: { sequence: 'asc' },
            skip,
            take
        });

        return NextResponse.json({ events, sessionId, page: Math.floor(skip / take) });
    } catch (error) {
        console.error('Failed to fetch snapshots:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
