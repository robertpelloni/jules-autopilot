import { prisma } from './lib/prisma/index.ts';
import { startDaemon } from './server/daemon.ts';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { api } from './server/index.ts';
import http from 'http';

const app = new Hono();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'node' }));

// Mount the main API
app.route('/api', api);

// Serve static files from the 'dist' directory
app.use('/*', serveStatic({ root: './dist' }));

console.log(`[Render] Starting server on port ${port}...`);

const server = serve({
    fetch: app.fetch,
    port
}, (info) => {
    console.log(`[Render] Listening on http://localhost:${info.port}`);
    
    // Initialize background services
    setTimeout(async () => {
        try {
            const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
            if (settings?.isEnabled) {
                console.log("[Render] Auto-starting Session Keeper daemon...");
                startDaemon();
                // Queue worker is NOT started — daemon handles everything
                // to avoid duplicate API calls and memory overhead
            }
        } catch (e) { console.error("[Render] Auto-start failed:", e); }
    }, 1000);
});

// WebSocket upgrade support for Node.js
try {
    const { WebSocketServer } = await import('ws');
    const { wsClients } = await import('./server/index.ts');
    
    const wss = new WebSocketServer({ noServer: true });
    
    server.on('upgrade', (request: http.IncomingMessage, socket: any, head: Buffer) => {
        if (request.url === '/ws') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });
    
    wss.on('connection', (ws) => {
        wsClients.add(ws);
        ws.send(JSON.stringify({ type: 'connected' }));
        ws.on('close', () => {
            wsClients.delete(ws);
        });
        ws.on('error', () => {
            wsClients.delete(ws);
        });
    });
    
    console.log('[Render] WebSocket support enabled on /ws');
} catch (e) {
    console.log('[Render] WebSocket support not available (ws package not found)');
}
