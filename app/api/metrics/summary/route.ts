import { NextResponse } from 'next/server';
import { metrics } from '@/server/metrics-collector';

/**
 * GET /api/metrics/summary — JSON summary of API metrics.
 * GET /api/metrics/summary?format=prometheus — Prometheus text format.
 */
export async function GET(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const format = url.searchParams.get('format');
    const windowMs = parseInt(url.searchParams.get('window') || '300000');

    if (format === 'prometheus') {
        return new Response(metrics.toPrometheus(), {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }

    const summary = metrics.getSummary(windowMs);
    const stats = metrics.getStats(windowMs);

    return NextResponse.json({
        summary,
        endpoints: stats,
        window: `${windowMs / 1000}s`
    });
}
