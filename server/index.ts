import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { EventEmitter } from 'events';
import { getProvider } from '../lib/orchestration/providers';
import { runDebate, runConference } from '../lib/orchestration/debate';
import { runCodeReview } from '../lib/orchestration/review';
import { startDaemon, stopDaemon } from './daemon';
import { prisma } from '../lib/prisma';
import { JulesClient } from '../lib/jules/client';
import type { DaemonEventType } from '@jules/shared';
import { createDaemonEvent } from '@jules/shared';

const app = new Hono();

const eventBus = new EventEmitter();
const wsClients = new Set<{ send: (data: string) => void }>();

export function broadcastToClients(message: object) {
    const payload = JSON.stringify(message);
    for (const client of wsClients) {
        try {
            client.send(payload);
        } catch {
            wsClients.delete(client);
        }
    }
}

export function emitDaemonEvent(type: DaemonEventType, data?: object) {
    const message = createDaemonEvent(type, data);
    eventBus.emit('daemon', message);
    broadcastToClients(message);
}

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

async function getJulesClient() {
    const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
    const apiKey = settings?.julesApiKey || process.env.JULES_API_KEY;
    if (!apiKey) return null;
    return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
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
            logs,
            wsClients: wsClients.size
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
        emitDaemonEvent('daemon_status', { status: 'running' });
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
        emitDaemonEvent('daemon_status', { status: 'stopped' });
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to stop daemon' }, 500);
    }
});

app.post('/api/sessions/interrupt-all', async (c) => {
    try {
        const client = await getJulesClient();
        if (!client) {
            return c.json({ error: 'Jules API key not configured' }, 400);
        }

        const sessions = await client.listSessions();
        const activeSessions = sessions.filter(s => 
            s.status === 'active' || s.rawState === 'IN_PROGRESS' || s.rawState === 'PLANNING'
        );

        let interrupted = 0;
        const errors: string[] = [];

        for (const session of activeSessions) {
            try {
                await client.updateSession(session.id, { status: 'paused' });
                interrupted++;
                
                await prisma.keeperLog.create({
                    data: {
                        message: `Interrupted session ${session.id.substring(0, 8)}`,
                        type: 'action',
                        sessionId: session.id
                    }
                });
            } catch (err) {
                errors.push(`${session.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }

        emitDaemonEvent('sessions_interrupted', { 
            count: interrupted, 
            total: activeSessions.length,
            errors 
        });

        return c.json({ 
            success: true, 
            interrupted, 
            total: activeSessions.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to interrupt sessions' }, 500);
    }
});

app.post('/api/sessions/continue-all', async (c) => {
    try {
        const client = await getJulesClient();
        if (!client) {
            return c.json({ error: 'Jules API key not configured' }, 400);
        }

        const sessions = await client.listSessions();
        const pausedSessions = sessions.filter(s => 
            s.status === 'paused' || s.status === 'completed' || s.status === 'failed'
        );

        let continued = 0;
        const errors: string[] = [];

        for (const session of pausedSessions) {
            try {
                await client.resumeSession(session.id, 'Please continue working on this task.');
                continued++;
                
                await prisma.keeperLog.create({
                    data: {
                        message: `Resumed session ${session.id.substring(0, 8)}`,
                        type: 'action',
                        sessionId: session.id
                    }
                });
            } catch (err) {
                errors.push(`${session.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }

        emitDaemonEvent('sessions_continued', { 
            count: continued, 
            total: pausedSessions.length,
            errors 
        });

        return c.json({ 
            success: true, 
            continued, 
            total: pausedSessions.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to continue sessions' }, 500);
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
console.log(`WebSocket clients can connect to ws://localhost:${port}/ws`);

const server = Bun.serve({
    port,
    fetch: app.fetch,
    websocket: {
        open(ws) {
            wsClients.add(ws);
            ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
            console.log(`WebSocket client connected (${wsClients.size} total)`);
        },
        message(ws, message) {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                }
            } catch {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            }
        },
        close(ws) {
            wsClients.delete(ws);
            console.log(`WebSocket client disconnected (${wsClients.size} total)`);
        }
    }
});

app.get('/ws', (c) => {
    const upgraded = server.upgrade(c.req.raw);
    if (!upgraded) {
        return c.text('WebSocket upgrade failed', 400);
    }
    return new Response(null, { status: 101 });
});
