import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { getProvider } from '../lib/orchestration/providers';
import { runDebate, runConference } from '../lib/orchestration/debate';
import { runCodeReview } from '../lib/orchestration/review';
import { startDaemon, stopDaemon } from './daemon';
import { prisma } from '../lib/prisma';

const app = new Hono();

app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

function enrichParticipants(participants: any[], apiKey?: string) {
    return participants.map(p => ({
        ...p,
        apiKey: p.apiKey || apiKey
    }));
}

app.get('/api/daemon/status', async (c) => {
    try {
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        const logs = await prisma.keeperLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        
        return c.json({
            isEnabled: settings?.isEnabled || false,
            lastCheck: new Date().toISOString(),
            logs
        });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to get status' }, 500);
    }
});

app.post('/api/daemon/start', async (c) => {
    try {
        await prisma.keeperSettings.upsert({
            where: { id: 'default' },
            update: { isEnabled: true },
            create: { 
                id: 'default', 
                isEnabled: true, 
                messages: '[]', 
                customMessages: '{}',
                checkIntervalSeconds: 60,
                inactivityThresholdMinutes: 10,
                activeWorkThresholdMinutes: 5
            }
        });
        startDaemon();
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to start daemon' }, 500);
    }
});

app.post('/api/daemon/stop', async (c) => {
    try {
        await prisma.keeperSettings.update({
            where: { id: 'default' },
            data: { isEnabled: false }
        });
        stopDaemon();
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to stop daemon' }, 500);
    }
});

app.post('/api/supervisor', async (c) => {
    try {
        const body = await c.req.json();
        const { messages, provider, apiKey: bodyApiKey, model, action, participants, topic, codeContext } = body;

        const apiKey = bodyApiKey || process.env.OPENAI_API_KEY; 

        if (action === 'list_models') {
            if (!apiKey || !provider) {
                return c.json({ error: 'Missing apiKey or provider' }, 400);
            }
            const p = getProvider(provider);
            if (!p) {
                return c.json({ error: 'Invalid provider' }, 400);
            }
            const models = await p.listModels(apiKey);
            return c.json({ models });
        }

        if (action === 'debate') {
            if (!participants || !Array.isArray(participants)) {
                return c.json({ error: 'Invalid participants' }, 400);
            }
            const enriched = enrichParticipants(participants, apiKey);
            const result = await runDebate({ history: messages, participants: enriched, topic });
            return c.json(result);
        }

        if (action === 'conference') {
            if (!participants || !Array.isArray(participants)) {
                return c.json({ error: 'Invalid participants' }, 400);
            }
            const enriched = enrichParticipants(participants, apiKey);
            const result = await runConference({ history: messages, participants: enriched });
            return c.json(result);
        }

        if (action === "handoff") {
            if (!messages || messages.length === 0) {
                return c.json({ error: "No messages to summarize" }, 400);
            }
            const { summarizeSession } = await import('../lib/orchestration/summarize');
            const summary = await summarizeSession(messages, provider || "openai", apiKey || "", model || "gpt-4o");
            return c.json({ content: summary });
        }

        if (action === 'review') {
            if (!codeContext) return c.json({ error: 'Missing codeContext' }, 400);
            const result = await runCodeReview({
                codeContext,
                provider: provider || 'openai',
                model: model || 'gpt-4o',
                apiKey: apiKey || "",
                reviewType: body.reviewType
            });
            return c.json({ content: result });
        }

        const p = getProvider(provider);
        if (p) {
            if (!apiKey) return c.json({ error: 'API Key required' }, 400);
            const result = await p.complete({
                messages,
                apiKey,
                model,
                systemPrompt: 'You are a project supervisor. Your goal is to keep the AI agent "Jules" on track. Read the conversation history. Identify if the agent is stuck, off-track, or needs guidance. If a session is stalled, failed, or completed but needs more work, provide a concise, direct instruction to reactivate it. Do not be conversational. Be directive but polite. Focus on the next task.'
            });
            return c.json({ content: result.content });
        }

        return c.json({ error: 'Invalid provider or action' }, 400);

    } catch (error) {
        console.error('Supervisor API Error:', error);
        const msg = error instanceof Error ? error.message : 'Internal server error';
        return c.json({ error: msg }, 500);
    }
});

app.post('/api/supervisor/clear', async (c) => {
    try {
        const { sessionId } = await c.req.json();
        if (!sessionId) return c.json({ error: 'Missing sessionId' }, 400);
        
        await prisma.supervisorState.deleteMany({ where: { sessionId } });
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to clear memory' }, 500);
    }
});

const port = 8080;

prisma.keeperSettings.findUnique({ where: { id: 'default' } }).then(settings => {
    if (settings?.isEnabled) {
        console.log("Auto-starting Session Keeper daemon...");
        startDaemon();
    }
}).catch(err => {
    console.error("Failed to check auto-start settings:", err);
});

console.log(`Bun/Hono Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
