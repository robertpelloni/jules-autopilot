import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface HealthCheck {
    service: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    message?: string;
}

/**
 * GET /api/health — Structured health checks for database, daemon, and Redis.
 */
export async function GET(): Promise<Response> {
    const checks: HealthCheck[] = [];
    const startTime = Date.now();

    // Database check
    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        checks.push({ service: 'database', status: 'healthy', latencyMs: Date.now() - dbStart });
    } catch (err) {
        checks.push({
            service: 'database',
            status: 'down',
            latencyMs: Date.now() - startTime,
            message: err instanceof Error ? err.message : 'Unknown error'
        });
    }

    // Redis check (via daemon HTTP)
    try {
        const redisStart = Date.now();
        const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
        const res = await fetch(`${daemonUrl}/health`, { signal: AbortSignal.timeout(3000) });
        checks.push({
            service: 'redis',
            status: res.ok ? 'healthy' : 'degraded',
            latencyMs: Date.now() - redisStart,
            message: res.ok ? undefined : `Status ${res.status}`
        });
    } catch {
        checks.push({ service: 'redis', status: 'down', latencyMs: 0, message: 'Daemon unreachable' });
    }

    // Daemon check
    try {
        const daemonStart = Date.now();
        const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
        const res = await fetch(`${daemonUrl}/api/status`, { signal: AbortSignal.timeout(3000) });
        checks.push({
            service: 'daemon',
            status: res.ok ? 'healthy' : 'degraded',
            latencyMs: Date.now() - daemonStart
        });
    } catch {
        checks.push({ service: 'daemon', status: 'down', latencyMs: 0, message: 'Daemon unreachable' });
    }

    // Overall status
    const overallStatus = checks.every(c => c.status === 'healthy')
        ? 'healthy'
        : checks.some(c => c.status === 'down')
            ? 'down'
            : 'degraded';

    return NextResponse.json({
        status: overallStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks
    }, { status: overallStatus === 'down' ? 503 : 200 });
}
