import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/metrics — Prometheus-compatible metrics endpoint.
 * Exposes counters and gauges for monitoring dashboards.
 */
export async function GET(): Promise<Response> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Gather metrics from the database
    const [
        totalSessions,
        activeSessions,
        totalSwarms,
        activeSwarms,
        totalPlugins,
        installedPlugins,
        ciRunsTotal,
        ciRunsFailed,
        usageLogs24h
    ] = await Promise.all([
        prisma.session.count().catch(() => 0),
        prisma.session.count({ where: { expires: { gte: new Date() } } }).catch(() => 0),
        prisma.agentSwarm.count().catch(() => 0),
        prisma.agentSwarm.count({ where: { status: 'running' } }).catch(() => 0),
        prisma.marketplacePlugin.count().catch(() => 0),
        prisma.marketplacePlugin.count({ where: { installedAt: { not: null } } }).catch(() => 0),
        prisma.cIRun.count().catch(() => 0),
        prisma.cIRun.count({ where: { conclusion: 'failure' } }).catch(() => 0),
        prisma.providerUsageLog.findMany({ where: { createdAt: { gte: last24h } } }).catch(() => [])
    ]);

    // Aggregate cost metrics
    const totalCost24h = Array.isArray(usageLogs24h)
        ? usageLogs24h.reduce((sum: number, l: { costCents: number }) => sum + l.costCents, 0)
        : 0;
    const totalRequests24h = Array.isArray(usageLogs24h) ? usageLogs24h.length : 0;
    const totalTokens24h = Array.isArray(usageLogs24h)
        ? usageLogs24h.reduce((sum: number, l: { inputTokens: number; outputTokens: number }) => sum + l.inputTokens + l.outputTokens, 0)
        : 0;

    // Format as Prometheus exposition format
    const lines = [
        '# HELP jules_sessions_total Total number of Jules sessions',
        '# TYPE jules_sessions_total gauge',
        `jules_sessions_total ${totalSessions}`,
        '',
        '# HELP jules_sessions_active Currently active sessions',
        '# TYPE jules_sessions_active gauge',
        `jules_sessions_active ${activeSessions}`,
        '',
        '# HELP jules_swarms_total Total agent swarms created',
        '# TYPE jules_swarms_total gauge',
        `jules_swarms_total ${totalSwarms}`,
        '',
        '# HELP jules_swarms_active Currently running swarms',
        '# TYPE jules_swarms_active gauge',
        `jules_swarms_active ${activeSwarms}`,
        '',
        '# HELP jules_plugins_total Total marketplace plugins',
        '# TYPE jules_plugins_total gauge',
        `jules_plugins_total ${totalPlugins}`,
        '',
        '# HELP jules_plugins_installed Locally installed plugins',
        '# TYPE jules_plugins_installed gauge',
        `jules_plugins_installed ${installedPlugins}`,
        '',
        '# HELP jules_ci_runs_total Total CI pipeline runs tracked',
        '# TYPE jules_ci_runs_total gauge',
        `jules_ci_runs_total ${ciRunsTotal}`,
        '',
        '# HELP jules_ci_runs_failed Failed CI runs',
        '# TYPE jules_ci_runs_failed gauge',
        `jules_ci_runs_failed ${ciRunsFailed}`,
        '',
        '# HELP jules_cost_cents_24h Total cost in cents over last 24h',
        '# TYPE jules_cost_cents_24h gauge',
        `jules_cost_cents_24h ${totalCost24h.toFixed(2)}`,
        '',
        '# HELP jules_requests_24h Total LLM requests in last 24h',
        '# TYPE jules_requests_24h gauge',
        `jules_requests_24h ${totalRequests24h}`,
        '',
        '# HELP jules_tokens_24h Total tokens consumed in last 24h',
        '# TYPE jules_tokens_24h gauge',
        `jules_tokens_24h ${totalTokens24h}`,
        '',
        '# HELP jules_uptime_seconds Process uptime in seconds',
        '# TYPE jules_uptime_seconds gauge',
        `jules_uptime_seconds ${Math.round(process.uptime())}`,
        ''
    ];

    return new Response(lines.join('\n'), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' }
    });
}
