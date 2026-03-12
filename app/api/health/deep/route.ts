import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/health/deep — Extended health check with memory, DB stats, and version info.
 * More expensive than /api/health — intended for observability dashboards, not load balancers.
 */
export async function GET(): Promise<Response> {
    const startTime = Date.now();

    // Memory usage
    const mem = process.memoryUsage();
    const memoryMB = {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024)
    };

    // DB record counts
    let dbStats: Record<string, number> = {};
    try {
        const [sessions, workflows, swarms, plugins, snapshots, chunks, notifications] = await Promise.all([
            prisma.session.count(),
            prisma.workflow.count(),
            prisma.agentSwarm.count(),
            prisma.pluginManifest.count(),
            prisma.sessionSnapshot.count(),
            prisma.codeChunk.count(),
            prisma.notification.count()
        ]);
        dbStats = { sessions, workflows, swarms, plugins, snapshots, chunks, notifications };
    } catch {
        dbStats = { error: -1 };
    }

    // Version info
    const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
    const nodeVersion = process.version;

    return NextResponse.json({
        status: 'healthy',
        version,
        nodeVersion,
        uptime: Math.round(process.uptime()),
        memoryMB,
        dbStats,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
    });
}
