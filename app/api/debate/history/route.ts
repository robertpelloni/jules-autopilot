import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/debate/history — List all stored debates for the UI history list
 * POST /api/debate/history — Save a debate
 */
export async function GET(): Promise<Response> {
    const debates = await prisma.storedDebate.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            topic: true,
            summary: true,
            createdAt: true
        }
    });

    return NextResponse.json(debates);
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as {
        topic?: string;
        summary?: string;
        rounds?: unknown[];
        history?: unknown[];
        metadata?: Record<string, unknown>;
    };

    if (!body.topic || !body.rounds || !body.history) {
        return NextResponse.json({ error: 'Missing required fields: topic, rounds, history' }, { status: 400 });
    }

    const debate = await prisma.storedDebate.create({
        data: {
            topic: body.topic,
            summary: body.summary || null,
            rounds: JSON.stringify(body.rounds),
            history: JSON.stringify(body.history),
            metadata: body.metadata ? JSON.stringify(body.metadata) : null,
        },
    });

    return NextResponse.json({ debate }, { status: 201 });
}
