import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assumes you have a shared prisma client
import { JulesClient } from '@/lib/jules/client'; // For fetching session list if not in DB
import { subDays, startOfDay, parseISO, differenceInMinutes, isAfter } from 'date-fns';

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

    // Timeline Data
    const timelineMap = new Map<string, number>();
    sessions.forEach(s => {
        const d = startOfDay(parseISO(s.createdAt)).toISOString();
        timelineMap.set(d, (timelineMap.get(d) || 0) + 1);
    });

    const timelineData = Array.from(timelineMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([isoDate, count]) => ({
            date: isoDate, // Send ISO, format on client
            count
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
    // This is expensive (N+1 requests).
    // Optimization: Only fetch activities for the *latest* 10 sessions for detailed breakdown,
    // or rely on a synced local DB in the future.
    // For this implementation, we will skip detailed Activity/Churn aggregation to keep this endpoint fast,
    // OR we can fetch them in parallel with a limit.

    // Let's implement a limited fetch for "Activity Breakdown" based on recent sessions only.
    const recentSessions = sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);

    // We can't easily do parallel fetch limit here without a complex queue,
    // so we'll just skip the heavy churn data for the "Overview" API to ensure speed.
    // The frontend can fetch detailed activity for specific sessions if needed.

    // However, to keep the dashboard working, we'll return empty/mocked structure for churn
    // or simplified estimates.

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
        repoData,
        // Include Keeper stats from local DB
        keeperStats: await getKeeperStats()
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
