import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/webhooks/router — Inbound webhook endpoint that matches events
 * against configured routing rules and dispatches orchestrator actions.
 * 
 * GET /api/webhooks/router — List all webhook routes.
 */
export async function GET(): Promise<Response> {
    const routes = await prisma.webhookRoute.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ routes });
}

export async function POST(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const isConfig = url.searchParams.get('action');

    // If ?action=create, this is a config request to add a new route
    if (isConfig === 'create') {
        const body = await req.json() as {
            name?: string;
            source?: string;
            matchPath?: string;
            matchValue?: string;
            actionType?: string;
            actionConfig?: Record<string, unknown>;
            secret?: string;
        };

        if (!body.name || !body.source || !body.matchPath || !body.matchValue || !body.actionType) {
            return NextResponse.json({
                error: 'Missing required fields: name, source, matchPath, matchValue, actionType'
            }, { status: 400 });
        }

        const route = await prisma.webhookRoute.create({
            data: {
                name: body.name,
                source: body.source,
                matchPath: body.matchPath,
                matchValue: body.matchValue,
                actionType: body.actionType,
                actionConfig: JSON.stringify(body.actionConfig || {}),
                secret: body.secret || null
            }
        });

        return NextResponse.json({ route }, { status: 201 });
    }

    // Otherwise, this is an inbound webhook event to route
    const payload = await req.json();
    const source = url.searchParams.get('source') || 'unknown';

    // Find matching routes
    const routes = await prisma.webhookRoute.findMany({
        where: { isActive: true, source }
    });

    const dispatched: string[] = [];

    for (const route of routes) {
        // Simple JSON path matching (supports dot notation)
        const value = getNestedValue(payload, route.matchPath);
        if (String(value) !== route.matchValue) continue;

        // Dispatch action
        const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
        let config: Record<string, unknown> = {};
        try { config = JSON.parse(route.actionConfig); } catch { /* fallback */ }

        try {
            switch (route.actionType) {
                case 'session':
                    await fetch(`${daemonUrl}/api/sessions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: config.prompt || `Webhook: ${route.name}`, repo: config.repo })
                    });
                    break;
                case 'swarm':
                    await fetch(`${daemonUrl}/api/swarm`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: `Webhook: ${route.name}`, prompt: config.prompt || route.name })
                    });
                    break;
                case 'ci_check':
                    await fetch(`${daemonUrl}/api/ci-fix`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ repo: config.repo })
                    });
                    break;
            }

            await prisma.webhookRoute.update({
                where: { id: route.id },
                data: { hitCount: { increment: 1 }, lastTriggeredAt: new Date() }
            });

            dispatched.push(route.id);
        } catch (err) {
            console.error(`[WebhookRouter] Failed to dispatch route ${route.id}:`, err);
        }
    }

    return NextResponse.json({ matched: dispatched.length, dispatched });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const cleanPath = path.replace(/^\$\.?/, '');
    const keys = cleanPath.split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

export async function DELETE(req: Request): Promise<Response> {
    const body = await req.json() as { routeId?: string };
    if (!body.routeId) return NextResponse.json({ error: 'Missing routeId' }, { status: 400 });

    await prisma.webhookRoute.update({
        where: { id: body.routeId },
        data: { isActive: false }
    });

    return NextResponse.json({ success: true, deactivated: body.routeId });
}
