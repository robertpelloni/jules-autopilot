import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/audit — Search and filter audit logs.
 * Query params: ?actor=daemon&action=session.created&limit=50&offset=0
 */
export async function GET(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const actor = url.searchParams.get('actor');
    const action = url.searchParams.get('action');
    const resource = url.searchParams.get('resource');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    if (actor) where.actor = { contains: actor };
    if (action) where.action = { contains: action };
    if (resource) where.resource = resource;

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.auditLog.count({ where })
    ]);

    return NextResponse.json({ logs, total, limit, offset });
}
