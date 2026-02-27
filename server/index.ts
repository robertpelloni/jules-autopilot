// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Bun: any;

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { EventEmitter } from 'events';
import { getProvider } from '@jules/shared';
import { runDebate, runConference } from '@jules/shared';
import { runCodeReview } from '@jules/shared';
import { startDaemon, stopDaemon } from './daemon.ts';
import { prisma } from '../lib/prisma.ts';
import { JulesClient } from '../lib/jules/client.ts';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            const { summarizeSession } = await import('@jules/shared');
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

    } catch {
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

// ============================================================================
// DEBATE ROUTES
// ============================================================================

app.post('/api/debate', async (c) => {
    try {
        const body = await c.req.json();
        const { topic, rounds, participants, history, metadata } = body;

        if (!topic || !participants || participants.length === 0) {
            return c.json({ error: 'Missing required fields: topic, participants' }, 400);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedParticipants = participants.map((p: any) => {
            let finalApiKey = p.apiKey;
            if (finalApiKey === 'env' || finalApiKey === 'placeholder' || !finalApiKey) {
                switch (p.provider) {
                    case 'openai': finalApiKey = process.env.OPENAI_API_KEY; break;
                    case 'anthropic': finalApiKey = process.env.ANTHROPIC_API_KEY; break;
                    case 'gemini': finalApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; break;
                    case 'qwen': finalApiKey = process.env.QWEN_API_KEY; break;
                }
            }
            return { ...p, apiKey: finalApiKey };
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

        return c.json(result);
    } catch {
        console.error('Debate request failed:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
});

app.get('/api/debate/history', async (c) => {
    try {
        const debates = await prisma.debate.findMany({
            orderBy: { createdAt: 'desc' },
            select: { id: true, topic: true, summary: true, createdAt: true }
        });
        return c.json(debates);
    } catch {
        return c.json({ error: 'Failed to fetch debates' }, 500);
    }
});

app.post('/api/debate/history', async (c) => {
    try {
        const body = await c.req.json();
        const { topic, summary, rounds, history, metadata } = body;

        if (!topic || !rounds || !history) {
            return c.json({ error: 'Missing required fields: topic, rounds, history' }, 400);
        }

        const debate = await prisma.debate.create({
            data: {
                topic,
                summary,
                rounds: JSON.stringify(rounds),
                history: JSON.stringify(history),
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });
        return c.json(debate);
    } catch {
        return c.json({ error: 'Failed to save debate' }, 500);
    }
});

app.get('/api/debate/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const debate = await prisma.debate.findUnique({ where: { id } });

        if (!debate) return c.json({ error: 'Debate not found' }, 404);

        return c.json({
            ...debate,
            rounds: typeof debate.rounds === 'string' ? JSON.parse(debate.rounds) : debate.rounds,
            history: typeof debate.history === 'string' ? JSON.parse(debate.history) : debate.history,
            metadata: debate.metadata && typeof debate.metadata === 'string' ? JSON.parse(debate.metadata) : debate.metadata,
        });
    } catch {
        return c.json({ error: 'Failed to fetch debate' }, 500);
    }
});

app.delete('/api/debate/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await prisma.debate.delete({ where: { id } });
        return c.json({ success: true });
    } catch {
        return c.json({ error: 'Failed to delete debate' }, 500);
    }
});

// ============================================================================
// SETTINGS ROUTES
// ============================================================================

const DEFAULT_KEEPER_SETTINGS = {
    isEnabled: false,
    autoSwitch: false,
    checkIntervalSeconds: 30,
    inactivityThresholdMinutes: 1,
    activeWorkThresholdMinutes: 30,
    messages: [],
    customMessages: {},
    smartPilotEnabled: false,
    supervisorProvider: 'openai',
    supervisorApiKey: '',
    supervisorModel: 'gpt-4o',
    contextMessageCount: 10,
};

app.get('/api/settings/keeper', async (c) => {
    try {
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings) return c.json(DEFAULT_KEEPER_SETTINGS);

        return c.json({
            ...settings,
            messages: JSON.parse(settings.messages),
            customMessages: JSON.parse(settings.customMessages),
        });
    } catch {
        return c.json(DEFAULT_KEEPER_SETTINGS);
    }
});

app.post('/api/settings/keeper', async (c) => {
    try {
        const body = await c.req.json();
        const { messages, customMessages, ...rest } = body;

        const settings = await prisma.keeperSettings.upsert({
            where: { id: 'default' },
            update: {
                ...rest,
                messages: JSON.stringify(messages || []),
                customMessages: JSON.stringify(customMessages || {}),
            },
            create: {
                ...rest,
                id: 'default',
                messages: JSON.stringify(messages || []),
                customMessages: JSON.stringify(customMessages || {}),
            }
        });

        return c.json({
            ...settings,
            messages: JSON.parse(settings.messages),
            customMessages: JSON.parse(settings.customMessages),
        });
    } catch {
        return c.json({ error: 'Failed to save settings' }, 500);
    }
});

// ============================================================================
// LOGS ROUTES
// ============================================================================

app.get('/api/logs/keeper', async (c) => {
    try {
        const logs = await prisma.keeperLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return c.json(logs);
    } catch {
        return c.json({ error: 'Failed to fetch logs' }, 500);
    }
});

app.post('/api/logs/keeper', async (c) => {
    try {
        const body = await c.req.json();
        const log = await prisma.keeperLog.create({
            data: {
                sessionId: body.sessionId,
                type: body.type,
                message: body.message,
                metadata: body.details ? JSON.stringify(body.details) : undefined,
            }
        });
        return c.json(log);
    } catch {
        return c.json({ error: 'Failed to create log' }, 500);
    }
});

// ============================================================================
// TEMPLATES ROUTES
// ============================================================================

const DEFAULT_TEMPLATES = [
    { name: "Feature Implementation", description: "Implement a new feature with tests and documentation", prompt: "I want to implement a new feature. Please help me plan, write code, tests, and documentation.", isPrebuilt: true, tags: "feature,dev", isFavorite: true },
    { name: "Bug Fix", description: "Analyze and fix a bug with regression tests", prompt: "I have a bug to fix. I will provide the details. Please help me reproduce, fix, and verify it.", isPrebuilt: true, tags: "bugfix,maintenance", isFavorite: true },
    { name: "Code Review", description: "Review code for best practices and security", prompt: "Please review the following code or diff. Look for security issues, performance problems, and style violations.", isPrebuilt: true, tags: "review,quality", isFavorite: false },
    { name: "Refactoring", description: "Refactor code to improve structure and maintainability", prompt: "I want to refactor some code. Help me improve its structure without changing behavior.", isPrebuilt: true, tags: "refactor,cleanup", isFavorite: false }
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTemplate(t: any) {
    return {
        ...t,
        tags: t.tags ? t.tags.split(',') : [],
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
        updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt
    };
}

app.get('/api/templates', async (c) => {
    try {
        let templates = await prisma.sessionTemplate.findMany({ orderBy: { updatedAt: 'desc' } });

        if (templates.length === 0) {
            for (const t of DEFAULT_TEMPLATES) {
                await prisma.sessionTemplate.create({ data: t });
            }
            templates = await prisma.sessionTemplate.findMany({ orderBy: { updatedAt: 'desc' } });
        }

        return c.json(templates.map(formatTemplate));
    } catch {
        return c.json({ error: 'Failed to fetch templates' }, 500);
    }
});

app.post('/api/templates', async (c) => {
    try {
        const body = await c.req.json();
        const { name, description, prompt, title, tags, isFavorite } = body;

        const template = await prisma.sessionTemplate.create({
            data: {
                name,
                description,
                prompt,
                title,
                isFavorite: isFavorite || false,
                tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
            }
        });

        return c.json(formatTemplate(template));
    } catch {
        return c.json({ error: 'Failed to create template' }, 500);
    }
});

app.put('/api/templates/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { name, description, prompt, title, tags, isFavorite } = body;

        const template = await prisma.sessionTemplate.update({
            where: { id },
            data: {
                name,
                description,
                prompt,
                title,
                isFavorite,
                tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
            }
        });

        return c.json(formatTemplate(template));
    } catch {
        return c.json({ error: 'Failed to update template' }, 500);
    }
});

app.delete('/api/templates/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await prisma.sessionTemplate.delete({ where: { id } });
        return c.json({ success: true });
    } catch {
        return c.json({ error: 'Failed to delete template' }, 500);
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

console.log(`Server starting on port ${port}`);

if (typeof Bun !== 'undefined') {
    console.log(`Using Bun Runtime`);
    console.log(`WebSocket clients can connect to ws://localhost:${port}/ws`);

    const server = Bun.serve({
        port,
        fetch: app.fetch,
        websocket: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            open(ws: any) {
                wsClients.add(ws);
                ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
                console.log(`WebSocket client connected (${wsClients.size} total)`);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            message(ws: any, message: any) {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.type === 'ping') {
                        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    }
                } catch {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
                }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            close(ws: any) {
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
} else {
    console.log(`Using Node.js Runtime (via @hono/node-server)`);
    // Dynamic import to avoid bundling issues in Bun-only environments if not properly tree-shaken
    import('@hono/node-server').then(({ serve }) => {
        serve({
            fetch: app.fetch,
            port
        });
        console.log(`Node.js server listening on port ${port}`);
    }).catch(err => {
        console.error("Failed to start Node.js server:", err);
    });
}
