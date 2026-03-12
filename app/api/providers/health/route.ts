import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { checkAllProviders } from '@/server/provider-health';
import { handleInternalError } from '@/lib/api/error';

/**
 * GET /api/providers/health — Check health of all enabled providers.
 */
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const results = await checkAllProviders(session.workspaceId);
        const allHealthy = results.every(r => r.healthy);

        return NextResponse.json({
            status: allHealthy ? 'all_healthy' : 'degraded',
            providers: results,
            checkedAt: new Date().toISOString()
        });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
