# Deployment Guide

The Jules Autopilot project consists of two core components that need to be deployed:
1. The **Next.js Web Frontend** (App Router).
2. The **Session Keeper Daemon** (Bun/Node server running on port 8080).

## 1. Local Development Deployment

For local execution, you should run both the frontend and the daemon.

```bash
# 1. Install dependencies
pnpm install

# 2. Setup SQLite Database
npx prisma db push

# 3. Start Frontend & Terminal servers
pnpm dev

# 4. In a new terminal, start the Daemon
bun run server/index.ts
```

## 2. Vercel Deployment (Frontend Only)

The Next.js frontend is heavily optimized for Vercel.

### Prerequisites
- Add your `JULES_API_KEY` (and `OPENAI_API_KEY` if using the Supervisor) to Vercel Environment Variables.
- Because Vercel uses strictly serverless edge functions, the background *Session Keeper Daemon* **will not run** on Vercel naturally. The background daemon must be hosted elsewhere (e.g., Render, Railway, or Google Cloud Run) if you want 24/7 background AI supervisor monitoring. 

### Deployment Steps
1. Push your code to GitHub.
2. Import the project in Vercel.
3. The Build Command should be: `pnpm run build:all`
4. Deploy.

## 3. Self-Hosted (Docker) Deployment (Recommended for Full Features)

To utilize the *Session Keeper Daemon* 24/7, a containerized deployment is highly recommended. 

*(Note: Docker configuration is currently pending implementation in the Roadmap)*

- You will need a simple `Dockerfile` running `pnpm start` (for Next.js) and `bun run server/index.ts` (for the daemon) managed by PM2 or Supervisord.
- Ensure port `3000` (Next) and port `8080` (Daemon WebSocket) are exposed.
