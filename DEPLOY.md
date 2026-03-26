# Deployment Guide: Jules Autopilot

This document outlines how to deploy the Jules Autopilot UI and Daemon across various environments.

## 1. Local Deployment (Standard)
The project is optimized for local execution using Bun and Vite.

1.  **Install Dependencies**: `pnpm install`
2.  **Start the Daemon**: `pnpm run daemon` (Starts on port 8080)
3.  **Start the Frontend**: `pnpm run dev` (Starts on port 3006)

## 2. Vercel Deployment (Frontend Only)
Vercel is used to host the static React frontend. Since the backend is a persistent Bun daemon, it must be hosted elsewhere (e.g., Railway, Render, or a local machine with a tunnel).

### Steps for Successful Vercel Deploy:
1.  **Project Settings**:
    *   **Framework Preset**: Vite
    *   **Build Command**: `pnpm run build:vercel`
    *   **Output Directory**: `dist`
    *   **Install Command**: `pnpm install`
2.  **Environment Variables**:
    *   `VITE_JULES_API_BASE_URL`: Set this to your live daemon's URL (e.g., `https://your-daemon.railway.app/api`). If left blank, it defaults to `/api` (which relies on `vercel.json` rewrites).
3.  **Bypassing Prisma**: The Vercel build automatically uses `build:vercel` which skips Prisma generation to save memory and prevent build-time database connection errors.

## 3. Daemon Deployment (Backend)
The backend daemon (`server/`) is a Bun application. It is best deployed as a long-running process.

### Docker Strategy:
Use the provided `Dockerfile` (if available) or a simple Bun-based image:
```bash
docker build -t jules-daemon .
docker run -p 8080:8080 -e JULES_API_KEY=your_key jules-daemon
```

### Railway / Render:
1.  Point to the `server/` directory.
2.  Start command: `bun run server/index.ts`
3.  Ensure port `8080` is exposed.

## 4. Tunnelling (Local Daemon + Cloud UI)
If you want to use the Vercel UI with your local daemon:
1.  Run `cloudflared tunnel` or `ngrok http 8080`.
2.  In Vercel, set `VITE_JULES_API_BASE_URL` to your tunnel URL.
