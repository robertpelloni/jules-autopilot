import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const SwitchSchema = z.object({
    workspaceId: z.string().min(1)
});

/**
 * POST /api/workspaces/switch — Switch the user's active workspace.
 * Validates that the user is a member of the target workspace.
 */
export async function POST(req: Request): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parseResult = SwitchSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { workspaceId } = parseResult.data;

        // Verify user is a member of the target workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: session.user.id,
                workspaceId
            },
            include: {
                workspace: {
                    select: { id: true, name: true, slug: true }
                }
            }
        });

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of the target workspace' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            workspace: membership.workspace,
            role: membership.role
        });

    } catch (error) {
        console.error('Failed to switch workspace:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
