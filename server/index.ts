// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Bun: any;

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { EventEmitter } from 'events';
import { startDaemon, stopDaemon } from './daemon';
import { prisma } from '../lib/prisma';
import { JulesClient } from '../lib/jules/client';
import type { DaemonEventType } from '@jules/shared';
import { createDaemonEvent } from '@jules/shared';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';
import { setupWorker } from './queue';
import fs from 'fs';
import path from 'path';

console.log(`[Server] Initializing Lean Core Command Center...`);

const { upgradeWebSocket, websocket } = createBunWebSocket();
const app = new Hono();
const api = new Hono();
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

// GLOBAL MIDDLEWARE
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Jules-Api-Key', 'X-Jules-Auth-Token'],
}));

async function getJulesClient(c?: any) {
    const headerKey = c?.req?.header('X-Jules-Api-Key');
    const headerAuth = c?.req?.header('X-Jules-Auth-Token');
    const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    
    // Resolve credentials
    const apiKey = headerKey || settings?.googleApiKey || process.env.GOOGLE_API_KEY;
    const authToken = headerAuth || settings?.julesApiKey || process.env.JULES_API_KEY;

    // Detect if we have a real OAuth token
    const hasToken = authToken && authToken.startsWith('ya29');

    // SECURITY: If we have a token, we MUST NOT send a project API Key 
    // to avoid "The API Key and the authentication credential are from different projects" error.
    if (hasToken) {
        console.log(`[Auth] Using Pure OAuth Identity (Token Length: ${authToken.length})`);
        return new JulesClient(undefined, 'https://jules.googleapis.com/v1alpha', authToken);
    }

    // Fallback to API Key only if no token is present
    const finalApiKey = apiKey || authToken; // Support legacy single-field use
    const isPlaceholder = !finalApiKey || finalApiKey === 'placeholder' || finalApiKey.startsWith('your-');

    if (isPlaceholder) {
        console.log(`[Auth] No valid credentials found. Falling back to MOCK mode.`);
        return null;
    }

    console.log(`[Auth] Using API Key Identity`);
    return new JulesClient(finalApiKey, 'https://jules.googleapis.com/v1alpha');
}

// API ROUTES
api.get('/sessions', async (c) => {
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
        console.error("[API] listSessions failed:", e);
        let title = `Auth Failed: ${e instanceof Error ? e.message : 'Unknown'}`;
        if (title.includes('API_KEY_SERVICE_BLOCKED')) {
            title = "Auth Failed: Jules API is not enabled for this key. Please enable it in Google Cloud Console.";
        }
        return c.json({
            sessions: [{ id: 'mock-err', title, state: 'ACTIVE', createTime: new Date().toISOString(), updateTime: new Date().toISOString(), sourceContext: { source: 'sources/github/google/jules' } }]
        });
    }
});

api.get('/sessions/:id', async (c) => {
    try {
        const id = c.req.param('id');
        if (id.startsWith('mock-')) return c.json({ id, title: 'Mock Session', state: 'ACTIVE' });
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Auth required' }, 401);
        return c.json(await client.getSession(id));
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

api.get('/sessions/:id/activities', async (c) => {
    try {
        const id = c.req.param('id');
        if (id.startsWith('mock-')) return c.json({ activities: [] });
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Auth required' }, 401);
        return c.json({ activities: await client.listActivities(id) });
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

api.get('/daemon/status', async (c) => {
    const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    const logs = await prisma.keeperLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }).catch(() => []);
    return c.json({ isEnabled: settings?.isEnabled || false, logs, wsClients: wsClients.size });
});

// Mount API
app.route('/api', api);

// WEBSOCKET HANDLER
app.get('/ws', upgradeWebSocket(() => ({
    onOpen(event, ws) {
        wsClients.add(ws as unknown as ServerWebSocket<any>);
        ws.send(JSON.stringify({ type: 'connected' }));
    },
    onClose(event, ws) {
        wsClients.delete(ws as unknown as ServerWebSocket<any>);
    }
})));

// STATIC FILE SERVING
app.get('*', async (c) => {
    const reqPath = c.req.path === '/' ? '/index.html' : c.req.path;
    const filePath = path.resolve(process.cwd(), 'dist', reqPath.startsWith('/') ? reqPath.slice(1) : reqPath);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath);
        let contentType = 'text/plain';
        if (reqPath.endsWith('.js')) contentType = 'text/javascript; charset=utf-8';
        else if (reqPath.endsWith('.css')) contentType = 'text/css';
        else if (reqPath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
        else if (reqPath.endsWith('.svg')) contentType = 'image/svg+xml';
        else if (reqPath.endsWith('.ico')) contentType = 'image/x-icon';
        
        return new Response(content, {
            headers: { 
                'Content-Type': contentType,
                'Content-Length': String(content.length),
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // SPA Fallback
    if (!reqPath.startsWith('/api') && !reqPath.startsWith('/ws')) {
        const indexPath = path.resolve(process.cwd(), 'dist/index.html');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath);
            return new Response(content, {
                headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': String(content.length) }
            });
        }
    }

    return c.notFound();
});

// BUN SERVE
if (typeof Bun !== 'undefined') {
    Bun.serve({
        port,
        fetch: app.fetch,
        websocket,
    });
    console.log(`[Bun] Command Center running at http://localhost:${port}`);
    
    // Auto-start background monitoring
    setTimeout(async () => {
        try {
            const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
            if (settings?.isEnabled) {
                console.log("[Server] Auto-starting Session Keeper...");
                startDaemon();
                workerInstance = setupWorker(eventBus);
            }
        } catch (e) { console.error("[Server] Auto-start failed:", e); }
    }, 1000);
}
