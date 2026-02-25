
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, summary, rounds, history, metadata } = body;

        if (!topic || !rounds || !history) {
            return NextResponse.json(
                { error: 'Missing required fields: topic, rounds, history' },
                { status: 400 }
            );
        }

        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const debate = await prisma.debate.create({
            data: {
                workspaceId: session.workspaceId,
                topic,
                summary,
                rounds: JSON.stringify(rounds),
                history: JSON.stringify(history),
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });

        return NextResponse.json(debate);
    } catch (error) {
        console.error('Failed to save debate:', error);
        return NextResponse.json(
            { error: 'Failed to save debate' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const debates = await prisma.debate.findMany({
            where: { workspaceId: session.workspaceId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                topic: true,
                summary: true,
                createdAt: true,
            }
        });

        return NextResponse.json(debates);
    } catch (error) {
        console.error('Failed to fetch debates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch debates' },
            { status: 500 }
        );
    }
}
