import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { observeSession, runShadowSweep } from '@/server/shadow-pilot';
import { handleInternalError } from '@/lib/api/error';

/**
 * GET /api/shadow/observe — Run shadow sweep across all active sessions.
 * POST /api/shadow/observe — Observe a single session by ID.
 */
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const result = await runShadowSweep();
        return NextResponse.json(result);
    } catch (error) {
        return handleInternalError(req, error);
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        const observations = await observeSession(sessionId);
        return NextResponse.json({ observations });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
