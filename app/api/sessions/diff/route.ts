import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { diffSessions } from '@/server/session-differ';
import { handleInternalError } from '@/lib/api/error';

/**
 * POST /api/sessions/diff — Compare two session timelines.
 * Body: { sessionIdA: string, sessionIdB: string }
 */
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { sessionIdA, sessionIdB } = await req.json();

        if (!sessionIdA || !sessionIdB) {
            return NextResponse.json({ error: 'sessionIdA and sessionIdB are required' }, { status: 400 });
        }

        const diff = await diffSessions(sessionIdA, sessionIdB);
        return NextResponse.json(diff);
    } catch (error) {
        return handleInternalError(req, error);
    }
}
