import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

/**
 * GET /api/export — Export workspace data as JSON.
 * 
 * Query params:
 *   - tables: comma-separated list (e.g. "debates,apiKeys,auditLogs")
 *   - limit: max records per table (default: 1000)
 */
export async function GET(req: Request): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const tablesParam = searchParams.get('tables') || 'all';
        const limit = Math.min(parseInt(searchParams.get('limit') || '1000', 10), 5000);
        const workspaceId = session.workspaceId;

        const requestedTables = tablesParam === 'all'
            ? ['debates', 'apiKeys', 'auditLogs', 'routingPolicies', 'templates', 'storedDebates', 'providerUsageLogs']
            : tablesParam.split(',').map(t => t.trim());

        const exportData: Record<string, unknown> = {
            exportedAt: new Date().toISOString(),
            workspaceId,
            tables: {}
        };

        const tables = exportData.tables as Record<string, unknown>;

        for (const table of requestedTables) {
            switch (table) {
                case 'debates':
                    tables.debates = await prisma.debate.findMany({
                        where: { workspaceId },
                        take: limit,
                        orderBy: { createdAt: 'desc' }
                    });
                    break;
                case 'apiKeys':
                    tables.apiKeys = await prisma.apiKey.findMany({
                        where: { workspaceId },
                        take: limit,
                        select: {
                            id: true,
                            name: true,
                            keyPrefix: true,
                            scopes: true,
                            isActive: true,
                            requestCount: true,
                            createdAt: true,
                            expiresAt: true
                            // Deliberately exclude keyHash
                        }
                    });
                    break;
                case 'auditLogs':
                    tables.auditLogs = await prisma.auditLog.findMany({
                        take: limit,
                        orderBy: { createdAt: 'desc' }
                    });
                    break;
                case 'routingPolicies':
                    tables.routingPolicies = await prisma.routingPolicy.findMany({
                        where: { workspaceId },
                        take: limit
                    });
                    break;
                case 'templates':
                    tables.templates = await prisma.sessionTemplate.findMany({
                        where: { workspaceId },
                        take: limit
                    });
                    break;
                case 'storedDebates':
                    tables.storedDebates = await prisma.storedDebate.findMany({
                        where: { workspaceId },
                        take: limit,
                        orderBy: { createdAt: 'desc' }
                    });
                    break;
                case 'providerUsageLogs':
                    tables.providerUsageLogs = await prisma.providerUsageLog.findMany({
                        where: { workspaceId },
                        take: limit,
                        orderBy: { createdAt: 'desc' }
                    });
                    break;
            }
        }

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="workspace-export-${workspaceId}.json"`
            }
        });

    } catch (error) {
        console.error('Export failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
