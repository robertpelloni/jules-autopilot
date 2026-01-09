import { NextRequest, NextResponse } from 'next/server';
import { runDebate } from '@/lib/orchestration/debate';
import { Participant } from '@/lib/orchestration/types';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { topic, rounds, participants, history, metadata } = body;

        if (!topic || !participants || participants.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: topic, participants' },
                { status: 400 }
            );
        }

        const enrichedParticipants = (participants as Participant[]).map((p) => {
            let finalApiKey = p.apiKey;
            
            if (p.apiKey === 'env' || !p.apiKey) {
                switch (p.provider) {
                    case 'openai':
                        finalApiKey = process.env.OPENAI_API_KEY;
                        break;
                    case 'anthropic':
                        finalApiKey = process.env.ANTHROPIC_API_KEY;
                        break;
                    case 'gemini':
                        finalApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
                        break;
                    case 'qwen':
                        finalApiKey = process.env.QWEN_API_KEY;
                        break;
                }
            }
            
            return {
                ...p,
                apiKey: finalApiKey
            };
        });

        const result = await runDebate({
            history: history || [],
            participants: enrichedParticipants,
            rounds: rounds || 1,
            topic
        });

        try {
            await prisma.debate.create({
                data: {
                    topic: result.topic || topic,
                    summary: result.summary,
                    rounds: JSON.stringify(result.rounds),
                    history: JSON.stringify(result.history),
                    metadata: metadata ? JSON.stringify(metadata) : null,
                    promptTokens: result.totalUsage?.prompt_tokens || 0,
                    completionTokens: result.totalUsage?.completion_tokens || 0,
                    totalTokens: result.totalUsage?.total_tokens || 0,
                }
            });
        } catch (dbError) {
            console.error('Failed to persist debate:', dbError);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Debate request failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
