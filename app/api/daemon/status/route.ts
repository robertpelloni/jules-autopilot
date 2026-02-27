import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { proxyToDaemon } from '@/lib/api/daemon-proxy';

/**
 * GET /api/daemon/status
 * 
 * Proxies the daemon status request. Returns daemon health, keeper settings,
 * and recent log entries. Falls back gracefully if daemon is unavailable.
 */
export async function GET() {
    const session = await getSession();
    if (!session?.workspaceId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const result = await proxyToDaemon('/api/daemon/status');
    if (!result.ok) {
        return NextResponse.json(result.fallback, { status: result.status });
    }

    const data = await result.response.json();
    return NextResponse.json(data);
}

/**
 * POST /api/daemon/status
 * 
 * Start or stop the daemon via its control API.
 * Body: { action: 'start' | 'stop' }
 */
export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.workspaceId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const action = body?.action;

    if (action !== 'start' && action !== 'stop') {
        return NextResponse.json({ error: 'Invalid action — must be "start" or "stop"' }, { status: 400 });
    }

    const result = await proxyToDaemon(`/api/daemon/${action}`, { method: 'POST' });
    if (!result.ok) {
        return NextResponse.json(result.fallback, { status: result.status });
    }

    const data = await result.response.json();
    return NextResponse.json(data);
}
