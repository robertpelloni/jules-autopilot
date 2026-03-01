import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const WorkspaceCreateSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
    monthlyBudget: z.number().min(0).default(100),
    maxPluginExecutionsPerDay: z.number().int().min(0).default(100)
});

/**
 * GET /api/workspaces — List workspaces for the authenticated user.
 * POST /api/workspaces — Create a new workspace.
 */
export async function GET(): Promise<Response> {
    const session = await getSession();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.workspaceMember.findMany({
        where: { userId: session.user.id },
        include: {
            workspace: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    monthlyBudget: true,
                    maxPluginExecutionsPerDay: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { members: true, apiKeys: true, installedPlugins: true }
                    }
                }
            }
        }
    });

    const workspaces = memberships.map(m => ({
        ...m.workspace,
        role: m.role,
        memberCount: m.workspace._count.members,
        apiKeyCount: m.workspace._count.apiKeys,
        pluginCount: m.workspace._count.installedPlugins
    }));

    return NextResponse.json({ workspaces });
}

export async function POST(req: Request): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parseResult = WorkspaceCreateSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const data = parseResult.data;

        // Check for slug uniqueness
        const existing = await prisma.workspace.findUnique({ where: { slug: data.slug } });
        if (existing) {
            return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
        }

        const workspace = await prisma.workspace.create({
            data: {
                name: data.name,
                slug: data.slug,
                monthlyBudget: data.monthlyBudget,
                maxPluginExecutionsPerDay: data.maxPluginExecutionsPerDay,
                members: {
                    create: {
                        userId: session.user.id,
                        role: 'owner'
                    }
                }
            },
            include: {
                _count: { select: { members: true } }
            }
        });

        return NextResponse.json({ workspace }, { status: 201 });

    } catch (error) {
        console.error('Failed to create workspace:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
