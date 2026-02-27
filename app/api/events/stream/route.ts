import { getSession } from '@/lib/session';

/**
 * GET /api/events/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time session activity pushes.
 * Replaces client-side polling for session state changes, keeper actions,
 * and system notifications. Uses chunked transfer encoding with text/event-stream
 * content type.
 *
 * Events emitted:
 * - `heartbeat`:  Every 15s keepalive to prevent connection drop.
 * - `session:update`: Session state change (new, active, completed, stalled).
 * - `keeper:action`:  Auto-pilot action (approval, nudge, debate).
 * - `telemetry:cost`: LLM spend threshold alert.
 */
export async function GET(req: Request) {
    const session = await getSession();
    if (!session?.workspaceId) {
        return new Response('Unauthorized', { status: 401 });
    }

    const workspaceId = session.workspaceId;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // Send initial connection event
            controller.enqueue(
                encoder.encode(`event: connected\ndata: ${JSON.stringify({ workspaceId, timestamp: new Date().toISOString() })}\n\n`)
            );

            // Heartbeat interval — 15s keepalive
            const heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(
                        encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`)
                    );
                } catch {
                    // Stream is closed, clean up
                    clearInterval(heartbeatInterval);
                }
            }, 15000);

            // Check for session updates periodically (5s)
            // In a production system, this would be driven by database triggers or pub/sub.
            // For now, we use a lightweight polling approach server-side and push to clients.
            const checkInterval = setInterval(async () => {
                try {
                    const { prisma } = await import('@/lib/prisma');

                    // Fetch recent keeper actions (last 10 seconds)
                    const recentThreshold = new Date(Date.now() - 10_000);

                    const recentActions = await prisma.keeperLog.findMany({
                        where: {
                            createdAt: { gte: recentThreshold },
                            type: 'action',
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    });

                    for (const action of recentActions) {
                        controller.enqueue(
                            encoder.encode(
                                `event: keeper:action\ndata: ${JSON.stringify({
                                    id: action.id,
                                    type: action.type,
                                    message: action.message,
                                    timestamp: action.createdAt.toISOString(),
                                })}\n\n`
                            )
                        );
                    }

                    // Check for recent telemetry (cost alerts)
                    const recentTelemetry = await prisma.providerTelemetry.findMany({
                        where: {
                            workspaceId,
                            timestamp: { gte: recentThreshold },
                        },
                        orderBy: { timestamp: 'desc' },
                        take: 3,
                    });

                    for (const t of recentTelemetry) {
                        controller.enqueue(
                            encoder.encode(
                                `event: telemetry:cost\ndata: ${JSON.stringify({
                                    provider: t.provider,
                                    model: t.model,
                                    cost: t.estimatedCostUSD,
                                    timestamp: t.timestamp.toISOString(),
                                })}\n\n`
                            )
                        );
                    }
                } catch {
                    // Silently continue — transient DB errors shouldn't kill the stream
                }
            }, 5000);

            // Clean up on abort
            req.signal.addEventListener('abort', () => {
                clearInterval(heartbeatInterval);
                clearInterval(checkInterval);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable Nginx buffering
        },
    });
}
