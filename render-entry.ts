import { prisma } from './lib/prisma/index';
import { startDaemon } from './server/daemon';
import { setupWorker } from './server/queue';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { api } from './server/index';

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

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`[Render] Listening on http://localhost:${info.port}`);
  
  // Initialize background services
  setTimeout(async () => {
      try {
          const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
          if (settings?.isEnabled) {
              console.log("[Render] Auto-starting Session Keeper...");
              startDaemon();
              setupWorker();
          }
      } catch (e) { console.error("[Render] Auto-start failed:", e); }
  }, 1000);
});
