import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/orchestration/providers';
import { runDebate, runConference } from '@/lib/orchestration/debate';
import { runCodeReview } from '@/lib/orchestration/review';
import { getSession } from '@/lib/session';

const FALLBACK_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const;
const FALLBACK_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
};

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('rate_limit') || msg.includes('quota') || msg.includes('429') || msg.includes('too many requests');
  }
  return false;
}

function getApiKeyForProvider(provider: string, fallbackKey?: string): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || fallbackKey;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    default:
      return fallbackKey;
  }
}

function enrichParticipants(participants: any[], apiKey: string | undefined) {
    return participants.map((p: any) => {
        let finalApiKey = p.apiKey;
        
        if (finalApiKey === 'env' || finalApiKey === 'placeholder' || !finalApiKey) {
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
        
        if (!finalApiKey && (p.provider === 'openai' || !p.provider)) {
             finalApiKey = apiKey;
        }

        return {
            ...p,
            apiKey: finalApiKey || apiKey
        };
    });
}

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
        const enrichedParticipants = enrichParticipants(participants, apiKey);

        try {
            const result = await runDebate({ history: messages, participants: enrichedParticipants, topic });
            return NextResponse.json(result);
        } catch (e) {
            console.error("Debate Error", e);
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Debate failed' }, { status: 500 });
        }
    }

    // 3. Conference
    if (action === 'conference') {
        if (!participants || !Array.isArray(participants)) {
            return NextResponse.json({ error: 'Invalid participants' }, { status: 400 });
        }
        const enrichedParticipants = enrichParticipants(participants, apiKey);

        try {
            const result = await runConference({ history: messages, participants: enrichedParticipants });
            return NextResponse.json(result);
        } catch (e) {
            console.error("Conference Error", e);
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Conference failed' }, { status: 500 });
        }
    }

    // 4. Handoff
    if (action === "handoff") {
         if (!messages || messages.length === 0) {
             return NextResponse.json({ error: "No messages to summarize" }, { status: 400 });
         }
         try {
             const { summarizeSession } = await import("@/lib/orchestration/summarize");
             const summary = await summarizeSession(messages, provider || "openai", apiKey, model || "gpt-4o");
             return NextResponse.json({ content: summary });
         } catch (e) {
             console.error("Handoff Error", e);
             return NextResponse.json({ error: e instanceof Error ? e.message : "Handoff failed" }, { status: 500 });
         }
    }
    
    // 5. Code Review
    if (action === 'review') {
        if (!codeContext) return NextResponse.json({ error: 'Missing codeContext' }, { status: 400 });

        try {
            const result = await runCodeReview({
                codeContext,
                provider: provider || 'openai',
                model: model || 'gpt-4o',
                apiKey,
                reviewType: body.reviewType // Pass the review type (simple | comprehensive)
            });
            return NextResponse.json({ content: result });
        } catch (e) {
            console.error("Review Error", e);
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Review failed' }, { status: 500 });
        }
    }

    if (!messages || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: messages, provider, or apiKey' },
        { status: 400 }
      );
    }

    // 6. OpenAI Assistants API Logic (Stateful)
    if (provider === 'openai-assistants' && messages.length > 0) {
      // We expect the *latest* user message to be the last one in the array
      const lastMessage = messages[messages.length - 1];
      const userContent = lastMessage.role === 'user' ? lastMessage.content : null;

      // Ensure we always have an assistant ID
      if (!assistantId) {
         // If missing assistantId, we try to create one or error out depending on logic.
         // For now, let's allow "creation on fly" if not provided, but ideally it should be passed.
      }

      if (!userContent && !threadId) {
         return NextResponse.json({ content: '' });
      }

      // Create/Retrieve Assistant
      let activeAssistantId = assistantId;
      if (!activeAssistantId) {
        const assistantResp = await fetch('https://api.openai.com/v1/assistants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            name: "Jules Supervisor",
            instructions: "You are a project supervisor. Your goal is to keep the AI agent 'Jules' on track. Identify if the agent is stuck, off-track, or needs guidance. If a session is stalled, failed, or completed but needs more work, provide a concise, direct instruction to reactivate it. Do not be conversational. Be directive but polite. Focus on the next task.",
            model: model || "gpt-4o",
          })
        });
        if (!assistantResp.ok) {
            const err = await assistantResp.json().catch(() => ({}));
            console.error("Failed to create assistant:", err);
            throw new Error(`Failed to create assistant: ${err.error?.message || assistantResp.statusText}`);
        }
        const assistantData = await assistantResp.json();
        activeAssistantId = assistantData.id;
      }

      // Create/Retrieve Thread
      let activeThreadId = threadId;
      if (!activeThreadId) {
        const threadResp = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({})
        });
        if (!threadResp.ok) throw new Error("Failed to create thread");
        const threadData = await threadResp.json();
        activeThreadId = threadData.id;
      }

      // Add Message
      if (userContent) {
        await fetch(`https://api.openai.com/v1/threads/${activeThreadId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            role: "user",
            content: userContent
          })
        });
      }

      // Run Assistant
      const runResp = await fetch(`https://api.openai.com/v1/threads/${activeThreadId}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: activeAssistantId,
        })
      });
      if (!runResp.ok) throw new Error("Failed to run assistant");
      const runData = await runResp.json();
      const runId = runData.id;

      // Poll
      let runStatus = runData.status;
      let currentRunData = runData;
      let attempts = 0;
      while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResp = await fetch(`https://api.openai.com/v1/threads/${activeThreadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        const statusData = await statusResp.json();
        runStatus = statusData.status;
        currentRunData = statusData;
        attempts++;
      }

      if (runStatus !== 'completed') {
        console.error('[Supervisor API] Assistant Run Failed:', JSON.stringify(currentRunData, null, 2));
        const lastError = currentRunData.last_error;
        const errorMsg = lastError ? `${lastError.code}: ${lastError.message}` : 'No error details provided';
        throw new Error(`Assistant run failed (${runStatus}): ${errorMsg}`);
      }

      // Get Response
      const msgResp = await fetch(`https://api.openai.com/v1/threads/${activeThreadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const msgData = await msgResp.json();
      const lastMsg = msgData.data.filter((m: { role: string }) => m.role === 'assistant')[0];
      const content = lastMsg?.content?.[0]?.text?.value || '';

      return NextResponse.json({ 
        content, 
        threadId: activeThreadId, 
        assistantId: activeAssistantId 
      });
    }

    // 7. Stateless Logic (Default Supervisor) with Provider Fallback
    const primaryProvider = provider || 'openai';
    const providersToTry = [primaryProvider, ...FALLBACK_PROVIDERS.filter(p => p !== primaryProvider)];
    
    let lastError: Error | null = null;
    
    for (const providerName of providersToTry) {
      const p = getProvider(providerName);
      if (!p) continue;
      
      const providerApiKey = getApiKeyForProvider(providerName, apiKey);
      if (!providerApiKey) continue;
      
      const providerModel = providerName === primaryProvider ? model : FALLBACK_MODELS[providerName];
      
      try {
        const result = await p.complete({
          messages,
          apiKey: providerApiKey,
          model: providerModel,
          systemPrompt: 'You are a project supervisor. Your goal is to keep the AI agent "Jules" on track. Read the conversation history. Identify if the agent is stuck, off-track, or needs guidance. If a session is stalled, failed, or completed but needs more work, provide a concise, direct instruction to reactivate it. Do not be conversational. Be directive but polite. Focus on the next task.'
        });
        
        if (providerName !== primaryProvider) {
          console.log(`[Supervisor API] Fallback to ${providerName} succeeded`);
        }
        
        return NextResponse.json({ content: result.content, provider: providerName });
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        
        if (isRateLimitError(e)) {
          console.log(`[Supervisor API] Rate limit hit on ${providerName}, trying fallback...`);
          continue;
        }
        
        return NextResponse.json({ error: lastError.message }, { status: 500 });
      }
    }

    if (lastError) {
      return NextResponse.json({ error: lastError.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Invalid provider or action' }, { status: 400 });

  } catch (error) {
    console.error('Supervisor API Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const isRateLimit = msg.includes('rate_limit') || msg.includes('quota') || msg.includes('429');
    
    return NextResponse.json(
      { error: msg },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
