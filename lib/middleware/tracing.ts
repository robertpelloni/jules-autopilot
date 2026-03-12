/**
 * Request Tracing Middleware
 * 
 * Generates unique trace IDs for each request and records metrics.
 * Attach to API routes for end-to-end request observability.
 * 
 * Usage:
 *   import { withTracing } from '@/lib/middleware/tracing';
 *   export const GET = withTracing(async (req) => { ... });
 */

import { metrics } from '@/server/metrics-collector';

/**
 * Generate a short unique trace ID.
 */
function generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}

type RouteHandler = (req: Request, context?: unknown) => Promise<Response>;

/**
 * Wrap an API route handler with tracing and metrics recording.
 */
export function withTracing(handler: RouteHandler): RouteHandler {
    return async (req: Request, context?: unknown): Promise<Response> => {
        const traceId = generateTraceId();
        const start = Date.now();
        const url = new URL(req.url);
        const path = url.pathname;
        const method = req.method;

        try {
            const response = await handler(req, context);
            const latencyMs = Date.now() - start;

            // Record metrics
            metrics.record({ path, method, statusCode: response.status, latencyMs });

            // Add trace headers to response
            const headers = new Headers(response.headers);
            headers.set('X-Trace-Id', traceId);
            headers.set('X-Response-Time', `${latencyMs}ms`);

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers
            });
        } catch (error) {
            const latencyMs = Date.now() - start;
            metrics.record({ path, method, statusCode: 500, latencyMs });

            return new Response(
                JSON.stringify({ error: 'Internal Server Error', traceId }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Trace-Id': traceId,
                        'X-Response-Time': `${latencyMs}ms`
                    }
                }
            );
        }
    };
}
