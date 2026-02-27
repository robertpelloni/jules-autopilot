import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { proxyToDaemon } from '@/lib/api/daemon-proxy';

/**
 * POST /api/sessions/bulk
 * 
 * Proxies bulk session operations to the daemon:
 * - interrupt-all: Pause all active sessions
 * - continue-all: Resume all paused sessions
 * 
 * Body: { action: 'interrupt-all' | 'continue-all' }
 * 
 * Falls back gracefully if daemon is unavailable.
 */
export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.workspaceId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const action = body?.action;

    if (action !== 'interrupt-all' && action !== 'continue-all') {
        return NextResponse.json(
            { error: 'Invalid action — must be "interrupt-all" or "continue-all"' },
            { status: 400 }
        );
    }

    const result = await proxyToDaemon(`/api/sessions/${action}`, { method: 'POST' });
    if (!result.ok) {
        return NextResponse.json(result.fallback, { status: result.status });
    }

    const data = await result.response.json();
    return NextResponse.json(data);
}
