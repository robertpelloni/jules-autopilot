import { NextRequest, NextResponse } from 'next/server';
import { runCodeReview, ReviewRequest } from '@/lib/orchestration/review';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { codeContext, provider, model, apiKey, reviewType, outputFormat, customPersonas, prUrl, githubToken } = body;

        if (!codeContext || !provider || !model || !apiKey) {
            return NextResponse.json(
                { error: 'Missing required fields: codeContext, provider, model, apiKey' },
                { status: 400 }
            );
        }

        const request: ReviewRequest = {
            codeContext,
            provider,
            model,
            apiKey,
            reviewType,
            outputFormat,
            customPersonas,
            prUrl,
            githubToken: githubToken || process.env.GITHUB_TOKEN
        };

        const result = await runCodeReview(request);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Code review failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
