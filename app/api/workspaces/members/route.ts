import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const InviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(['member', 'admin', 'viewer']).default('member')
});

/**
 * GET /api/workspaces/members — List all members of the current workspace.
 * POST /api/workspaces/members — Invite a user to the workspace by email.
 */
export async function GET(): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: session.workspaceId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        });

        return NextResponse.json({
            members: members.map(m => ({
                id: m.id,
                role: m.role,
                user: m.user
            }))
        });
    } catch (error) {
        console.error('Failed to fetch members:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parseResult = InviteSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.format() }, { status: 400 });
        }

        const { email, role } = parseResult.data;

        // Find user by email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
        }

        // Check if already a member
        const existing = await prisma.workspaceMember.findFirst({
            where: { workspaceId: session.workspaceId, userId: user.id }
        });
        if (existing) {
            return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
        }

        const member = await prisma.workspaceMember.create({
            data: {
                workspaceId: session.workspaceId,
                userId: user.id,
                role
            },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } }
            }
        });

        return NextResponse.json({
            member: { id: member.id, role: member.role, user: member.user }
        }, { status: 201 });

    } catch (error) {
        console.error('Failed to invite member:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
