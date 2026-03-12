import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JulesClient } from '@/lib/jules/client';
import { handleInternalError } from '@/lib/api/error';
import { subDays, startOfDay, parseISO, differenceInMinutes, isAfter, format } from 'date-fns';

// Note: In the current architecture, Session data resides in the Jules API (external),
// while Keeper logs and Settings reside in local SQLite.
// To do server-side aggregation of SESSIONS, we still need to fetch them from the Jules API.
// However, doing it here on the server (close to the backend) is better than the client doing it,
// and we can cache it.

// Ideally, we would sync Sessions to our local DB for true performant queries.
// For now, we will implement the aggregation logic here to offload the client.

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30', 10);

        // We need the Jules API key. In a real app, this comes from auth context.
        // Here we might grab it from the default keeper settings if available, or env.
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        const apiKey = settings?.julesApiKey || process.env.JULES_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Jules API key not configured' }, { status: 401 });
        }

        const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
        const allSessions = await client.listSessions();
        const allSources = await client.listSources(); // Metadata for repos

        // --- Aggregation Logic (Mirrors client-side logic but runs on server) ---

        const cutoffDate = subDays(new Date(), days);

        // Filter by date
        const sessions = allSessions.filter(s =>
            isAfter(parseISO(s.createdAt), cutoffDate)
        );

        // Basic Counts
        const totalSessions = sessions.length;
        const activeSessions = sessions.filter(s => s.status === 'active').length;
        const completedSessions = sessions.filter(s => s.status === 'completed').length;
        const failedSessions = sessions.filter(s => s.status === 'failed').length;

        // Stalled Logic (simplified for server-side speed)
        // We assume "stalled" if status is active but lastActivity was > 1 hour ago
        const stalledSessions = sessions.filter(s => {
            if (s.status !== 'active') return false;
            const lastActive = s.lastActivityAt ? parseISO(s.lastActivityAt) : parseISO(s.updatedAt);
            return differenceInMinutes(new Date(), lastActive) > 60;
        }).length;

        // Success Rate
        const finished = completedSessions + failedSessions;
        const successRate = finished > 0 ? Math.round((completedSessions / finished) * 100) : 0;

        // Duration
        const durations = sessions.map(s =>
            differenceInMinutes(parseISO(s.updatedAt), parseISO(s.createdAt))
        );
        const avgDuration = durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0;

        // Timeline Data & Advanced Timeseries
        const timelineMap = new Map<string, number>();
        const timeseriesMap = new Map<string, { success: number; failed: number; totalDuration: number }>();

        sessions.forEach(s => {
            const d = startOfDay(parseISO(s.createdAt)).toISOString();
            
            // Basic Timeline
            timelineMap.set(d, (timelineMap.get(d) || 0) + 1);

            // Advanced Timeseries for Recharts
            const tsData = timeseriesMap.get(d) || { success: 0, failed: 0, totalDuration: 0 };
            if (s.status === 'completed') tsData.success++;
            if (s.status === 'failed') tsData.failed++;
            tsData.totalDuration += differenceInMinutes(parseISO(s.updatedAt), parseISO(s.createdAt));
            timeseriesMap.set(d, tsData);
        });

        const timelineData = Array.from(timelineMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([isoDate, count]) => ({
                date: isoDate,
                count
            }));

        const timeSeriesData = Array.from(timeseriesMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([isoDate, data]) => ({
                date: isoDate,
                success: data.success,
                failed: data.failed,
                avgDuration: (data.success + data.failed) > 0 ? Math.round(data.totalDuration / (data.success + data.failed)) : 0
            }));

        // Repo Usage
        const repoCounts: Record<string, number> = {};
        sessions.forEach(s => {
            const source = allSources.find(src => src.id === s.sourceId);
            const name = source ? source.name : (s.sourceId || 'Unknown');
            repoCounts[name] = (repoCounts[name] || 0) + 1;
        });

        const repoData = Object.entries(repoCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Note: Activity/Code Churn requires fetching activities for EVERY session.
        const recentSessions = sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);

        return NextResponse.json({
            stats: {
                totalSessions,
                activeSessions,
                completedSessions,
                failedSessions,
                stalledSessions,
                successRate,
                avgDuration
            },
            timelineData,
            timeSeriesData,
            repoData,
            keeperStats: await getKeeperStats(),
            llmCosts: await getLLMCostTelemetry(days)
        });

    } catch (error) {
        return handleInternalError(request, error);
    }
}

async function getKeeperStats() {
    const totalApprovals = await prisma.keeperLog.count({ where: { type: 'action', message: { contains: 'Auto-approving' } } });
    const totalNudges = await prisma.keeperLog.count({ where: { type: 'action', message: { contains: 'Sending nudge' } } });
    const totalDebates = await prisma.debate.count();

    return {
        totalApprovals,
        totalNudges,
        totalDebates
    };
}

/**
 * Aggregates LLM cost data from the ProviderTelemetry table.
 * Returns total spend, per-provider breakdown, and a daily spend timeline
 * for the requested time window.
 */
async function getLLMCostTelemetry(days: number) {
    const cutoffDate = subDays(new Date(), days);

    // All telemetry records in the window
    const records = await prisma.providerTelemetry.findMany({
        where: { timestamp: { gte: cutoffDate } },
        select: {
            provider: true,
            model: true,
            promptTokens: true,
            completionTokens: true,
            estimatedCostUSD: true,
            timestamp: true,
        },
        orderBy: { timestamp: 'asc' },
    });

    // Total spend
    const totalSpend = records.reduce((sum, r) => sum + r.estimatedCostUSD, 0);
    const totalPromptTokens = records.reduce((sum, r) => sum + r.promptTokens, 0);
    const totalCompletionTokens = records.reduce((sum, r) => sum + r.completionTokens, 0);

    // Per-provider breakdown
    const providerMap = new Map<string, { cost: number; calls: number }>();
    records.forEach((r) => {
        const key = r.provider;
        const existing = providerMap.get(key) || { cost: 0, calls: 0 };
        existing.cost += r.estimatedCostUSD;
        existing.calls += 1;
        providerMap.set(key, existing);
    });

    const providerBreakdown = Array.from(providerMap.entries()).map(([provider, data]) => ({
        provider,
        cost: Math.round(data.cost * 10000) / 10000, // 4 decimal places for USD
        calls: data.calls,
    }));

    // Daily spend timeline (for charting)
    const dailyMap = new Map<string, number>();
    records.forEach((r) => {
        const day = format(r.timestamp, 'yyyy-MM-dd');
        dailyMap.set(day, (dailyMap.get(day) || 0) + r.estimatedCostUSD);
    });

    const dailySpend = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, cost]) => ({
            date,
            cost: Math.round(cost * 10000) / 10000,
        }));

    return {
        totalSpend: Math.round(totalSpend * 10000) / 10000,
        totalPromptTokens,
        totalCompletionTokens,
        totalCalls: records.length,
        providerBreakdown,
        dailySpend,
    };
}
