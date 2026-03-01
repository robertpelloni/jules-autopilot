import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const PolicySchema = z.object({
    taskType: z.enum(['code_review', 'fast_chat', 'deep_reasoning', 'default']),
    preferredProvider: z.string().optional(),
    preferredModel: z.string().optional(),
    costEfficiencyMode: z.boolean().default(false)
});

export async function GET(req: Request) {
    const session = await getSession();
    if (!session?.workspaceId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await prisma.routingPolicy.findMany({
        where: { workspaceId: session.workspaceId }
    });

    return NextResponse.json({ policies });
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parseResult = PolicySchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const data = parseResult.data;

        const policy = await prisma.routingPolicy.upsert({
            where: {
                workspaceId_taskType: {
                    workspaceId: session.workspaceId,
                    taskType: data.taskType
                }
            },
            update: {
                preferredProvider: data.preferredProvider || null,
                preferredModel: data.preferredModel || null,
                costEfficiencyMode: data.costEfficiencyMode
            },
            create: {
                workspaceId: session.workspaceId,
                taskType: data.taskType,
                preferredProvider: data.preferredProvider || null,
                preferredModel: data.preferredModel || null,
                costEfficiencyMode: data.costEfficiencyMode
            }
        });

        return NextResponse.json({ success: true, policy }, { status: 200 });

    } catch (error) {
        console.error('Failed to update routing policy:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
