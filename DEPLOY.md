# Deployment Guide: Jules Autopilot

This document outlines how to deploy the Jules Autopilot UI and Go Backend.

## 1. Local Deployment (Standard)
The project is optimized for local execution using Go and Vite.

1.  **Install Dependencies**: `pnpm install`
2.  **Build Frontend**: `pnpm run build`
3.  **Start the Go Runtime**: `cd backend-go && go run main.go` (Starts on port 8080 and serves the built UI)
4.  *(Optional)* **Start the Frontend Dev Server**: `pnpm run dev` (Starts on port 3006 for hot-reloading)

## 2. Cloud Deployment (Frontend Only)
Vercel is used to host the static React frontend. The Go backend must be hosted elsewhere (e.g., Railway, Render, or a local machine with a tunnel).

### Steps for Successful Vercel Deploy:
1.  **Project Settings**:
    *   **Framework Preset**: Vite
    *   **Build Command**: `pnpm run build:vercel`
    *   **Output Directory**: `dist`
    *   **Install Command**: `pnpm install`
2.  **Environment Variables**:
    *   `VITE_JULES_API_BASE_URL`: Set this to your live Go backend's URL (e.g., `https://your-daemon.railway.app/api`).

## 3. Go Runtime Deployment (Backend)
The backend (`backend-go/`) is a Go application. It is best deployed as a long-running process or container.

### Docker Strategy:
Use a simple Go-based image:
```bash
cd backend-go
go build -o jules-backend main.go
# Dockerfile should expose 8080 and run the binary
```

### Railway / Render:
1.  Point to the `backend-go/` directory or use a Dockerfile.
2.  Start command: `./jules-backend`
3.  Ensure port `8080` is exposed.

## 4. Tunnelling (Local Go Backend + Cloud UI)
If you want to use a cloud UI with your local Go backend:
1.  Run `cloudflared tunnel` or `ngrok http 8080`.
2.  In the cloud UI settings, set `VITE_JULES_API_BASE_URL` to your tunnel URL.
