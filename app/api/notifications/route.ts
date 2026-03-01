import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notifications — List notifications with unread count.
 * POST /api/notifications — Create a notification.
 * PATCH /api/notifications — Mark notifications as read/dismissed.
 */
export async function GET(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    const where: Record<string, unknown> = {};
    if (unreadOnly) where.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit
        }),
        prisma.notification.count({ where: { isRead: false } })
    ]);

    return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as {
        type?: string; title?: string; body?: string;
        severity?: string; resourceType?: string; resourceId?: string;
    };

    if (!body.type || !body.title || !body.body) {
        return NextResponse.json({ error: 'Missing type, title, or body' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
        data: {
            type: body.type,
            title: body.title,
            body: body.body,
            severity: body.severity || 'info',
            resourceType: body.resourceType || null,
            resourceId: body.resourceId || null
        }
    });

    return NextResponse.json({ notification }, { status: 201 });
}

export async function PATCH(req: Request): Promise<Response> {
    const body = await req.json() as { ids?: string[]; action?: 'read' | 'dismiss' | 'read_all' };

    if (body.action === 'read_all') {
        await prisma.notification.updateMany({
            where: { isRead: false },
            data: { isRead: true }
        });
        return NextResponse.json({ success: true });
    }

    if (!body.ids || body.ids.length === 0) {
        return NextResponse.json({ error: 'Missing notification ids' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.action === 'read') data.isRead = true;
    if (body.action === 'dismiss') { data.isRead = true; data.dismissedAt = new Date(); }

    await prisma.notification.updateMany({
        where: { id: { in: body.ids } },
        data
    });

    return NextResponse.json({ success: true, updated: body.ids.length });
}
