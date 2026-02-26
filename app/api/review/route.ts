import { NextRequest, NextResponse } from 'next/server';
import { runCodeReview, ReviewRequest } from '@jules/shared';
import { getSession } from '@/lib/session';
import { handleInternalError } from '@/lib/api/error';

/**
 * POST /api/review
 * 
 * Runs an AI-powered code review using the specified provider and model.
 * Requires authenticated workspace session. If no explicit API key is
 * provided by the caller, falls back to server-side environment variables
 * for the chosen provider.
 */
export async function POST(req: NextRequest) {
    try {
        // Auth gate — prevents unauthenticated users from triggering LLM spend
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { codeContext, provider, model, apiKey, reviewType, outputFormat, customPersonas, prUrl, githubToken } = body;

        if (!codeContext || !provider || !model) {
            return NextResponse.json(
                { error: 'Missing required fields: codeContext, provider, model' },
                { status: 400 }
            );
        }

        // Resolve API key: prefer explicit caller key, fall back to server env vars
        let resolvedApiKey = apiKey;
        if (!resolvedApiKey || resolvedApiKey === 'env' || resolvedApiKey === 'placeholder') {
            switch (provider) {
                case 'openai':
                    resolvedApiKey = process.env.OPENAI_API_KEY;
                    break;
                case 'anthropic':
                    resolvedApiKey = process.env.ANTHROPIC_API_KEY;
                    break;
                case 'gemini':
                    resolvedApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
                    break;
            }
        }

        if (!resolvedApiKey) {
            return NextResponse.json(
                { error: 'No API key provided and no server-side key configured for this provider' },
                { status: 400 }
            );
        }

        const request: ReviewRequest = {
            codeContext,
            provider,
            model,
            apiKey: resolvedApiKey,
            reviewType,
            outputFormat,
            customPersonas,
            prUrl,
            githubToken: githubToken || process.env.GITHUB_TOKEN
        };

        const result = await runCodeReview(request);

        return NextResponse.json(result);
    } catch (error) {
        return handleInternalError(req, error);
    }
}
