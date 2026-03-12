import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getFeatureFlags, updateFeatureFlags } from '@/server/feature-flags';
import { handleInternalError } from '@/lib/api/error';

/**
 * GET /api/system/flags — Get current feature flags.
 * PUT /api/system/flags — Update feature flags.
 */
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const flags = await getFeatureFlags();
        return NextResponse.json(flags);
    } catch (error) {
        return handleInternalError(req, error);
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const updated = await updateFeatureFlags(body);

        return NextResponse.json({ success: true, flags: updated });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
