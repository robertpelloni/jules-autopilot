import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/orchestration/providers';
import { runDebate } from '@/lib/orchestration/debate';
import { runCodeReview } from '@/lib/orchestration/review';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const sessionApiKey = session?.apiKey;

    const body = await req.json();
    const { messages, provider, apiKey: bodyApiKey, model, threadId, assistantId, action, participants, topic, codeContext } = body;

    const apiKey = sessionApiKey || bodyApiKey;

    // 1. List Models
    if (action === 'list_models') {
       if (!apiKey || !provider) {
         return NextResponse.json({ error: 'Missing apiKey or provider' }, { status: 400 });
       }
       const p = getProvider(provider);
       if (!p) {
           return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
       }
       try {
         const models = await p.listModels(apiKey);
         return NextResponse.json({ models });
       } catch (e) {
         return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to list models' }, { status: 500 });
       }
    }

    // 2. Debate
    if (action === 'debate') {
        if (!participants || !Array.isArray(participants)) {
            return NextResponse.json({ error: 'Invalid participants' }, { status: 400 });
        }
        // Inject API Key into participants if missing (since runDebate uses them)
        const enrichedParticipants = participants.map((p: any) => ({
            ...p,
            apiKey: p.apiKey === 'placeholder' || !p.apiKey ? apiKey : p.apiKey
        }));

        try {
            const result = await runDebate({ history: messages, participants: enrichedParticipants, topic });
            return NextResponse.json(result);
        } catch (e) {
            console.error("Debate Error", e);
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Debate failed' }, { status: 500 });
        }
    }

    // 3. Code Review
    if (action === 'review') {
        if (!codeContext) return NextResponse.json({ error: 'Missing codeContext' }, { status: 400 });

        try {
            const result = await runCodeReview({
                codeContext,
                provider: provider || 'openai',
                model: model || 'gpt-4o',
                apiKey
            });
            return NextResponse.json({ content: result });
        } catch (e) {
            console.error("Review Error", e);
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Review failed' }, { status: 500 });
        }
    }

    // 4. Stateless Logic (Default Supervisor)
    const p = getProvider(provider);
    if (p) {
        if (!apiKey) return NextResponse.json({ error: 'API Key required' }, { status: 400 });

        try {
            const result = await p.complete({
                messages,
                apiKey,
                model,
                systemPrompt: 'You are a project supervisor. Your goal is to keep the AI agent "Jules" on track. Read the conversation history. Identify if the agent is stuck, off-track, or needs guidance. Provide a concise, direct instruction or feedback to the agent. Do not be conversational. Be directive but polite. Focus on the next task.'
            });
            return NextResponse.json({ content: result.content });
        } catch (e) {
             return NextResponse.json({ error: e instanceof Error ? e.message : 'Completion failed' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: 'Invalid provider or action' }, { status: 400 });

  } catch (error) {
    console.error('Supervisor API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
