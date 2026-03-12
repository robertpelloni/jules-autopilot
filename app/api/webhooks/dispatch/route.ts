import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { dispatchEvent } from '@/server/webhook-dispatcher';
import { handleInternalError } from '@/lib/api/error';
import type { WebhookPayload } from '@/server/webhook-dispatcher';

/**
 * POST /api/webhooks/dispatch — Manually dispatch a test webhook event.
 * Body: { event, resourceId, data }
 */
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { event, resourceId, data } = body as Pick<WebhookPayload, 'event' | 'resourceId' | 'data'>;

        if (!event || !resourceId || !data) {
            return NextResponse.json(
                { error: 'event, resourceId, and data are required' },
                { status: 400 }
            );
        }

        const validEvents = ['session.completed', 'session.failed', 'alert.triggered', 'budget.exceeded'];
        if (!validEvents.includes(event)) {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        const result = await dispatchEvent(
            session.workspaceId,
            event as WebhookPayload['event'],
            resourceId,
            data
        );

        return NextResponse.json({
            success: true,
            message: `Dispatched to ${result.dispatched} routes. ${result.failed} failed.`,
            ...result
        });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
