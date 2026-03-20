// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Bun: any;

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { EventEmitter } from 'events';
import { startDaemon, stopDaemon } from './daemon';
import { prisma } from '../lib/prisma';
import { JulesClient } from '../lib/jules/client';
import type { DaemonEventType } from '@jules/shared';
import { createDaemonEvent, runDebate, runCodeReview } from '@jules/shared';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';
import { setupWorker } from './queue';
import fsPromises from 'fs/promises';
import path from 'path';

// MCP Integration
import { registerWasmPluginsAsMcpTools } from "./mcp.js";

const { upgradeWebSocket, websocket } = createBunWebSocket();
const app = new Hono();
const port = 8080;

const eventBus = new EventEmitter();
const wsClients = new Set<ServerWebSocket<any>>();
let workerInstance: ReturnType<typeof setupWorker> | null = null;

export function broadcastToClients(message: object) {
    const payload = JSON.stringify(message);
    for (const client of wsClients) {
        try {
            client.sendText(payload);
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
    allowHeaders: ['Content-Type', 'Authorization', 'X-Jules-Api-Key'],
}));

async function getJulesClient(c?: any) {
    const headerKey = c?.req?.header('X-Jules-Api-Key');
    const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    const apiKey = headerKey || settings?.julesApiKey || process.env.JULES_API_KEY;
    
    // Validate API key - return null for missing, placeholders, or local dev overrides
    const isPlaceholder = !apiKey || 
        apiKey === 'placeholder' || 
        apiKey === 'test-key' ||
        apiKey === 'authenticated-via-local-dev' || 
        apiKey.startsWith('your-') ||
        apiKey.length < 10; // Real keys are longer

    if (isPlaceholder) {
        return null;
    }
    
    return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
}

// ============================================================================
// JULES PROXY ROUTES
// ============================================================================

app.get('/sessions', async (c) => {
    try {
        const client = await getJulesClient(c);
        if (!client) {
            return c.json({
                sessions: [
                    { id: 'mock-1', title: 'Fix broken auth', state: 'ACTIVE', createTime: new Date().toISOString(), updateTime: new Date().toISOString(), sourceContext: { source: 'sources/github/google/jules' } },
                    { id: 'mock-2', title: 'Add unit tests', state: 'COMPLETED', createTime: new Date().toISOString(), updateTime: new Date().toISOString(), sourceContext: { source: 'sources/github/google/jules' } }
                ]
            });
        }
        const sessions = await client.listSessions();
        return c.json({ sessions });
    } catch (e) {
        console.error("[Server] listSessions failed:", e);
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        return c.json({
            sessions: [
                { 
                    id: 'mock-error-1', 
                    title: `Auth Failed: ${errorMessage.slice(0, 50)}...`, 
                    state: 'ACTIVE', 
                    createTime: new Date().toISOString(), 
                    updateTime: new Date().toISOString(), 
                    sourceContext: { source: 'sources/github/google/jules' } 
                }
            ]
        });
    }
});

app.get('/sessions/:id', async (c) => {
    try {
        const id = c.req.param('id');
        if (id.startsWith('mock-')) {
            return c.json({ id, title: 'Mock Session', state: 'ACTIVE', createTime: new Date().toISOString(), updateTime: new Date().toISOString(), sourceContext: { source: 'sources/github/google/jules' } });
        }
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Jules API Key not configured' }, 401);
        const session = await client.getSession(id);
        return c.json(session);
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to get session' }, 500);
    }
});

app.get('/sessions/:id/activities', async (c) => {
    try {
        const id = c.req.param('id');
        if (id.startsWith('mock-')) {
            return c.json({
                activities: [
                    { id: 'act-1', createTime: new Date().toISOString(), userMessage: { message: 'Hello Jules!' } },
                    { id: 'act-2', createTime: new Date().toISOString(), agentMessaged: { agentMessage: 'I am a mock agent. Configure JULES_API_KEY to use the real one.' } }
                ]
            });
        }
        const limit = parseInt(c.req.query('pageSize') || '1000');
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Jules API Key not configured' }, 401);
        const activities = await client.listActivities(id, limit);
        return c.json({ activities });
    } catch (e) {
        console.error("[Server] listActivities failed:", e);
        return c.json({ error: e instanceof Error ? e.message : 'Failed to list activities' }, 500);
    }
});

app.post('/sessions', async (c) => {
    try {
        const body = await c.req.json();
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Jules API Key not configured' }, 401);
        const session = await client.createSession(body.sourceContext.source, body.prompt, body.title);
        return c.json(session);
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to create session' }, 500);
    }
});

app.post('/sessions/:id:sendMessage', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Jules API Key not configured' }, 401);
        const activity = await client.createActivity({ sessionId: id, content: body.prompt });
        return c.json(activity);
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to send message' }, 500);
    }
});

app.post('/sessions/:id:approvePlan', async (c) => {
    try {
        const id = c.req.param('id');
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Jules API Key not configured' }, 401);
        await client.approvePlan(id);
        return c.json({ success: true });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to approve plan' }, 500);
    }
});

app.get('/sources', async (c) => {
    try {
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Jules API Key not configured' }, 401);
        const sources = await client.listSources();
        return c.json({ sources });
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to list sources' }, 500);
    }
});

// ============================================================================
// DAEMON ROUTES
// ============================================================================

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

app.post('/api/daemon/status', async (c) => {
    try {
        const body = await c.req.json();
        const action = body.action;

        if (action === 'start') {
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
            if (!workerInstance) {
                console.log("[Server] Starting SQLite Task Queue...");
                workerInstance = setupWorker();
            }
            emitDaemonEvent('daemon_status', { status: 'running' });
            return c.json({ success: true, isEnabled: true });
        } else if (action === 'stop') {
            await prisma.keeperSettings.update({
                where: { id: 'default' },
                data: { isEnabled: false }
            });
            stopDaemon();
            if (workerInstance) {
                console.log("[Server] Stopping Task Queue...");
                workerInstance.close();
                workerInstance = null;
            }
            emitDaemonEvent('daemon_status', { status: 'stopped' });
            return c.json({ success: true, isEnabled: false });
        }

        return c.json({ error: 'Invalid action' }, 400);
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Failed to update daemon status' }, 500);
    }
});

// ============================================================================
// DEBATE & REVIEW ROUTES
// ============================================================================

app.post('/api/debate', async (c) => {
    try {
        const body = await c.req.json();
        const { topic, rounds, participants, history, metadata } = body;

        if (!topic || !participants || participants.length === 0) {
            return c.json({ error: 'Missing required fields: topic, participants' }, 400);
        }

        const enrichedParticipants = participants.map((p: any) => {
            let apiKey = p.apiKey;
            if (!apiKey || apiKey === 'env' || apiKey === 'placeholder') {
                switch (p.provider) {
                    case 'openai': apiKey = process.env.OPENAI_API_KEY; break;
                    case 'anthropic': apiKey = process.env.ANTHROPIC_API_KEY; break;
                    case 'gemini': apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; break;
                }
            }
            return { ...p, apiKey };
        });

        const result = await runDebate({
            history: history || [],
            participants: enrichedParticipants,
            rounds: rounds || 1,
            topic
        });

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

        return c.json(result);
    } catch (error) {
        console.error('Debate request failed:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
});

app.get('/api/review', async (c) => {
    try {
        const body = await c.req.json();
        const { codeContext, provider, model, apiKey, reviewType } = body;
        if (!codeContext) return c.json({ error: 'Missing codeContext' }, 400);

        const result = await runCodeReview({
            codeContext,
            provider: provider || 'openai',
            model: model || 'gpt-4o',
            apiKey: apiKey || process.env.OPENAI_API_KEY || "",
            reviewType: reviewType || 'standard'
        });
        return c.json({ content: result });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'Review failed' }, 500);
    }
});

// ============================================================================
// SETTINGS & TEMPLATES
// ============================================================================

app.get('/api/settings/keeper', async (c) => {
    try {
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings) return c.json({ isEnabled: false });
        return c.json({
            ...settings,
            messages: JSON.parse(settings.messages),
            customMessages: JSON.parse(settings.customMessages),
        });
    } catch {
        return c.json({ error: 'Failed to get settings' }, 500);
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
        return c.json(settings);
    } catch {
        return c.json({ error: 'Failed to save settings' }, 500);
    }
});

app.get('/api/templates', async (c) => {
    try {
        const templates = await prisma.sessionTemplate.findMany({ orderBy: { updatedAt: 'desc' } });
        return c.json(templates.map(t => ({
            ...t,
            tags: t.tags ? t.tags.split(',') : []
        })));
    } catch {
        return c.json({ error: 'Failed to fetch templates' }, 500);
    }
});

// ============================================================================
// RAG & CODEBASE ROUTES
// ============================================================================

app.post('/api/rag/search', async (c) => {
    try {
        const body = await c.req.json();
        const { query, topK } = body;
        if (!query) return c.json({ error: 'Missing query' }, 400);

        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        const apiKey = process.env.OPENAI_API_KEY || settings?.supervisorApiKey;
        
        if (!apiKey) {
            return c.json({ error: 'OpenAI API key not configured for embeddings' }, 401);
        }

        // 1. Get embedding for the query
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: query,
                model: "text-embedding-3-small"
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const queryEmbedding = data.data[0].embedding;

        // 2. Search local database
        const { searchSimilar } = await import('../lib/api/rag');
        const results = await searchSimilar(queryEmbedding, topK || 5);

        return c.json({ results });
    } catch (error) {
        console.error('RAG search failed:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Search failed' }, 500);
    }
});

app.post('/api/rag/index', async (c) => {
    try {
        const { orchestratorQueue } = await import('./queue');
        await orchestratorQueue.add('index_codebase', {});
        return c.json({ success: true, message: 'Indexing job queued' });
    } catch (error) {
        return c.json({ error: 'Failed to queue indexing job' }, 500);
    }
});

// ============================================================================
// FILESYSTEM ROUTES
// ============================================================================

app.get('/api/fs/list', async (c) => {
    try {
        const dir = c.req.query('path') || '.';
        const basePath = process.cwd();
        const fullPath = path.resolve(basePath, dir);

        if (!fullPath.startsWith(basePath)) {
            return c.json({ error: 'Access denied' }, 403);
        }

        const entries = await fsPromises.readdir(fullPath, { withFileTypes: true });
        const files = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.relative(basePath, path.join(fullPath, entry.name))
        }));

        return c.json({ files });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
});

app.get('/api/fs/read', async (c) => {
    try {
        const filePath = c.req.query('path');
        if (!filePath) return c.json({ error: 'Missing path' }, 400);

        const basePath = process.cwd();
        const fullPath = path.resolve(basePath, filePath);

        if (!fullPath.startsWith(basePath)) {
            return c.json({ error: 'Access denied' }, 403);
        }

        const content = await fsPromises.readFile(fullPath, 'utf-8');
        return c.json({ content });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
});

// ============================================================================
// WEBSOCKET & INITIALIZATION
// ============================================================================

app.get('/ws', upgradeWebSocket((c) => {
    return {
        onOpen(event, ws) {
            wsClients.add(ws as unknown as ServerWebSocket<any>);
            ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
            console.log(`[WebSocket] Client connected (${wsClients.size} total)`);
        },
        onMessage(event, ws) {
            try {
                const data = JSON.parse(event.data.toString());
                if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            } catch {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            }
        },
        onClose(event, ws) {
            wsClients.delete(ws as unknown as ServerWebSocket<any>);
            console.log(`[WebSocket] Client disconnected (${wsClients.size} total)`);
        }
    };
}));

// ============================================================================
// STATIC ASSETS & SPA FALLBACK
// ============================================================================

// Serve static files from Vite build
app.use('*', serveStatic({ root: './dist' }));

// SPA Fallback: All non-API routes serve index.html
app.get('*', async (c) => {
    try {
        const indexHtml = await fsPromises.readFile(path.resolve(process.cwd(), './dist/index.html'), 'utf-8');
        return c.html(indexHtml);
    } catch {
        return c.text('Vite build not found. Please run `pnpm build`.', 404);
    }
});

// Auto-start if enabled
async function autoStart() {
    try {
        let settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings) {
            settings = await prisma.keeperSettings.create({
                data: {
                    id: 'default',
                    isEnabled: false,
                    messages: '[]',
                    customMessages: '{}',
                    checkIntervalSeconds: 60,
                    inactivityThresholdMinutes: 10,
                    activeWorkThresholdMinutes: 5
                }
            });
        }

        if (settings?.isEnabled) {
            console.log("[Server] Auto-starting Session Keeper...");
            startDaemon();
            workerInstance = setupWorker();
        }
    } catch (e) {
        console.error("[Server] Auto-start check failed:", e);
    }
}

autoStart();

if (typeof Bun !== 'undefined') {
    registerWasmPluginsAsMcpTools().catch(console.error);
    Bun.serve({ port, fetch: app.fetch, websocket });
    console.log(`[Bun] Server listening on port ${port}`);
} else {
    import('@hono/node-server').then(({ serve }) => {
        serve({ fetch: app.fetch, port });
        console.log(`[Node] Server listening on port ${port}`);
    }).catch(console.error);
}
