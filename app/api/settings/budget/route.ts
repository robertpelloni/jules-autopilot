import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { handleInternalError } from '@/lib/api/error';

/**
 * GET /api/settings/budget
 * 
 * Returns the authenticated workspace's current budget status:
 * - Monthly LLM budget cap
 * - Total USD spent this month (from ProviderTelemetry)
 * - Remaining budget
 * - Daily plugin execution count and limit
 * 
 * Used by the Budget & Routing settings widget.
 */
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Fetch workspace budget config
        const workspace = await prisma.workspace.findUnique({
            where: { id: session.workspaceId },
            select: { monthlyBudget: true, maxPluginExecutionsPerDay: true },
        });

        if (!workspace) {
            return new NextResponse('Workspace not found', { status: 404 });
        }

        // Calculate monthly LLM spend from ProviderTelemetry
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const telemetryAggregate = await prisma.providerTelemetry.aggregate({
            where: {
                workspaceId: session.workspaceId,
                timestamp: { gte: startOfMonth },
            },
            _sum: { estimatedCostUSD: true },
        });

        const spent = telemetryAggregate._sum.estimatedCostUSD || 0;
        const remaining = Math.max(0, workspace.monthlyBudget - spent);

        // Calculate today's plugin execution count
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const pluginExecutionsToday = await prisma.pluginAuditLog.count({
            where: {
                workspaceId: session.workspaceId,
                timestamp: { gte: startOfDay },
            },
        });

        return NextResponse.json({
            monthlyBudget: workspace.monthlyBudget,
            spent,
            remaining,
            pluginExecutionsToday,
            maxPluginExecutionsPerDay: workspace.maxPluginExecutionsPerDay,
        });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
