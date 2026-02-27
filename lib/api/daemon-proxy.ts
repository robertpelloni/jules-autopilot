import { DAEMON_HTTP_BASE_URL } from '@/lib/config/daemon';

/**
 * Proxy helper for daemon API routes.
 *
 * Attempts to forward requests to the daemon server. If the daemon is
 * unreachable (e.g., Vercel deployment without a daemon), returns a
 * structured fallback response so the frontend degrades gracefully.
 *
 * Usage:
 * ```ts
 * const result = await proxyToDaemon('/api/daemon/status');
 * if (!result.ok) return NextResponse.json(result.fallback, { status: result.status });
 * return NextResponse.json(await result.response.json());
 * ```
 */
export async function proxyToDaemon(
    path: string,
    options: {
        method?: string;
        body?: unknown;
        timeoutMs?: number;
    } = {}
): Promise<
    | { ok: true; response: Response }
    | { ok: false; status: number; fallback: { error: string; daemonAvailable: boolean } }
> {
    const { method = 'GET', body, timeoutMs = 5000 } = options;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${DAEMON_HTTP_BASE_URL}${path}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        clearTimeout(timeout);
        return { ok: true, response: res };
    } catch (error) {
        // Daemon is unreachable — return fallback
        const isAbort = error instanceof DOMException && error.name === 'AbortError';
        return {
            ok: false,
            status: 503,
            fallback: {
                error: isAbort
                    ? 'Daemon timed out — it may not be running'
                    : 'Daemon is not available — running in frontend-only mode',
                daemonAvailable: false,
            },
        };
    }
}
