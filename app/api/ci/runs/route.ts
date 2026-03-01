import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ci/runs — List all CI runs, most recent first.
 */
export async function GET(): Promise<Response> {
    try {
        const runs = await prisma.cIRun.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json({ runs });
    } catch (error) {
        console.error('Failed to fetch CI runs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
