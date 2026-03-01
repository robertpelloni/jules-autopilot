import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

/**
 * GET /api/plugins/installed — List all installed plugins for the current workspace.
 */
export async function GET(): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const plugins = await prisma.installedPlugin.findMany({
            where: { workspaceId: session.workspaceId },
            include: {
                plugin: {
                    select: {
                        name: true,
                        version: true,
                        description: true
                    }
                }
            },
            orderBy: { installedAt: 'desc' }
        });

        return NextResponse.json({ plugins });
    } catch (error) {
        console.error('Failed to fetch installed plugins:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
