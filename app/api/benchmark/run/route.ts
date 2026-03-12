import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { runBenchmark } from '@/server/model-benchmark';
import { handleInternalError } from '@/lib/api/error';

/**
 * POST /api/benchmark/run — Run a model benchmark across enabled providers.
 * Body: { prompt: string, maxTokens?: number, temperature?: number }
 */
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { prompt, maxTokens, temperature } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
        }

        const providers = await prisma.providerConfig.findMany({
            where: { workspaceId: session.workspaceId, isEnabled: true, apiKey: { not: null } },
            select: { providerId: true, apiKey: true }
        });

        if (providers.length === 0) {
            return NextResponse.json({ error: 'No enabled providers found' }, { status: 400 });
        }

        const result = await runBenchmark(
            providers.map(p => ({ providerId: p.providerId, apiKey: p.apiKey! })),
            { prompt, maxTokens, temperature }
        );

        return NextResponse.json(result);
    } catch (error) {
        return handleInternalError(req, error);
    }
}
