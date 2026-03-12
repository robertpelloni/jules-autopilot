import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DAEMON_HTTP_BASE_URL } from '@/lib/config/daemon';

/**
 * GET /api/system/status
 *
 * System health endpoint used by:
 * - Docker HEALTHCHECK
 * - Load balancers and uptime monitors
 * - The /dashboard/status health page
 *
 * Returns the operational status of all subsystems:
 * - Database connectivity (Prisma/SQLite)
 * - Daemon availability (Hono server on port 8080)
 * - Application version
 * - Uptime and timestamp
 */
export async function GET() {
  const start = Date.now();

  // 1. Database check
  let dbStatus: 'ok' | 'error' = 'error';
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'ok';
  } catch {
    dbStatus = 'error';
  }

  // 2. Daemon check (with short timeout)
  let daemonStatus: 'ok' | 'unavailable' = 'unavailable';
  let daemonLatencyMs = 0;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const daemonStart = Date.now();
    const res = await fetch(`${DAEMON_HTTP_BASE_URL}/api/daemon/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    daemonLatencyMs = Date.now() - daemonStart;
    daemonStatus = res.ok ? 'ok' : 'unavailable';
  } catch {
    daemonStatus = 'unavailable';
  }

  // 3. Version (Edge compliant, fallback to ENV)
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

  const totalMs = Date.now() - start;
  const overallStatus = dbStatus === 'ok' ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    version,
    timestamp: new Date().toISOString(),
    uptime: 0, // uptime unavailable in edge runtime
    latency: {
      total: totalMs,
      database: dbLatencyMs,
      daemon: daemonLatencyMs,
    },
    subsystems: {
      database: dbStatus,
      daemon: daemonStatus,
    },
  }, {
    status: overallStatus === 'healthy' ? 200 : 503,
  });
}
