import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { validateAllMcpLinks, validateMcpLink } from '@/server/mcp-validator';
import { handleInternalError } from '@/lib/api/error';

/**
 * GET /api/mcp-links/validate — Validate all active MCP links.
 * POST /api/mcp-links/validate — Validate a specific MCP link.
 */
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const results = await validateAllMcpLinks();
        return NextResponse.json({ results });
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

        const { linkId } = await req.json();
        if (!linkId) {
            return NextResponse.json({ error: 'linkId is required' }, { status: 400 });
        }

        const result = await validateMcpLink(linkId);
        return NextResponse.json(result);
    } catch (error) {
        return handleInternalError(req, error);
    }
}
