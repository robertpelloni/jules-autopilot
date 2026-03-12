import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { runConsensus } from '@/server/consensus-engine';
import { handleInternalError } from '@/lib/api/error';

/**
 * POST /api/consensus/vote
 * 
 * Triggers a multi-model consensus vote for critical decisions.
 * Requires at least 2 enabled providers in the workspace.
 */
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { prompt, systemPrompt, quorum } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const result = await runConsensus(session.workspaceId, {
            prompt,
            systemPrompt,
            quorum
        });

        return NextResponse.json(result);
    } catch (error) {
        return handleInternalError(req, error);
    }
}
