# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-09
**Version:** 0.8.0

## OVERVIEW
Jules UI is a specialized Next.js 16 application serving as an engineering command center for Google's Jules AI agent. It integrates real-time session monitoring, code diff viewing, multi-agent debates, and terminal access into a unified workspace.

**Core Stack:** Next.js 16 (App Router), TypeScript 5, Tailwind CSS v4, shadcn/ui, Bun/Hono Backend Daemon.

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (port 3000)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Session     │  │ Debate      │  │ Dashboard               │  │
│  │ Viewer      │  │ Dialog      │  │ (Analytics, Submodules) │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                   Zustand Store                                  │
│              (session-keeper.ts)                                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP (polls /api/daemon/status)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Bun/Hono Server (port 8080)                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ server/index.ts                                             ││
│  │  • /api/daemon/start|stop|status  (daemon control)          ││
│  │  • /api/supervisor/clear          (reset session state)     ││
│  │  • /api/logs                      (fetch KeeperLog)         ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ server/daemon.ts (Background Loop)                          ││
│  │  • Monitors Jules sessions via jules.googleapis.com API     ││
│  │  • Auto-nudges stalled agents, approves safe plans          ││
│  │  • Runs multi-agent debates for risky decisions             ││
│  │  • Persists state to SQLite (SupervisorState, KeeperLog)    ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS (direct)
                           ▼
              ┌────────────────────────┐
              │ jules.googleapis.com   │
              │ (Google Jules API)     │
              └────────────────────────┘
```

## STRUCTURE
```
.
├── app/                  # Next.js App Router (pages, layouts, api)
│   ├── api/              # Backend API routes (debate, settings, supervisor)
│   ├── dashboard/        # Analytics & System Dashboards
│   └── system/           # System status pages
├── components/           # React components
│   └── ui/               # Reusable shadcn/ui primitives
├── external/             # Git Submodules (Orchestration, MCPs, Tasks)
│   ├── antigravity-.../  # Multi-agent orchestration engine
│   └── jules-mcp-.../    # Model Context Protocol servers
├── lib/                  # Shared utilities
│   ├── jules/            # Jules API client & provider
│   └── orchestration/    # Agent debate & provider logic
├── server/               # **NEW** Bun/Hono backend daemon
│   ├── index.ts          # HTTP server with CORS, daemon endpoints
│   └── daemon.ts         # Background monitoring loop
├── terminal-server/      # Standalone Node.js server for web terminal
├── docs/                 # Project documentation & handoffs
└── deploy/               # Docker deployment configs
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| **UI Components** | `components/` | shadcn/ui in `ui/`, feature components in root |
| **API Logic** | `app/api/` | Next.js server functions |
| **Jules Client** | `lib/jules/client.ts` | Main interface to Jules API |
| **Debate Logic** | `lib/orchestration/` | Multi-agent provider adapters |
| **Session Keeper Daemon** | `server/` | **Bun/Hono backend** - runs independently of browser |
| **Terminal** | `terminal-server/` | WebSocket-based shell access |
| **Submodules** | `external/` | 3rd party integrations |

## KEY DATA MODELS (Prisma)

```prisma
model KeeperSettings {
  id                  String   @id @default("default")
  julesApiKey         String?
  resumePaused        Boolean  @default(false)
  smartPilotEnabled   Boolean  @default(false)
  // ... provider keys, intervals, etc.
}

model SupervisorState {
  sessionId                       String   @id
  lastProcessedActivityTimestamp  String?
  history                         String?  // JSON array of past actions
  openaiThreadId                  String?
}

model KeeperLog {
  id        Int      @id @default(autoincrement())
  sessionId String
  type      String   // "info" | "warn" | "error" | "action"
  message   String
  metadata  String?  // JSON
  createdAt DateTime @default(now())
}
```

## CONVENTIONS
- **Imports**: Use `@/` alias for root (e.g. `@/components/ui/button`)
- **Styling**: Tailwind v4 via `app/globals.css`. No CSS modules.
- **State**: React Server Components (RSC) by default. Use `'use client'` only when interaction is needed.
- **Submodules**: treat `external/` as read-only libraries unless fixing upstream bugs.
- **Daemon**: Background work belongs in `server/daemon.ts`, not in React components.

## ANTI-PATTERNS (THIS PROJECT)
- **Direct Submodule Edits**: Do not edit files in `external/` directly if possible. Fork or patch upstream.
- **Hardcoded Secrets**: Use `process.env` (server) or `NEXT_PUBLIC_` (client) variables.
- **Mixed API Logic**: Keep server-side API logic in `app/api/` or `lib/`, never in client components.
- **Client-side Loops**: Do NOT run background monitoring in React. Use the Bun daemon instead.

## COMMANDS
```bash
# Development (run both)
npm run dev                      # Start Next.js (port 3000)
bun run server/index.ts          # Start Daemon (port 8080)

# Terminal Server (optional)
node terminal-server/server.js   # Start Terminal WebSocket (port 8080)

# Docker
docker-compose -f deploy/docker-compose.yml up

# Maintenance
git submodule update --init --recursive  # Sync submodules
npx prisma migrate dev                   # Run DB migrations
npx prisma studio                        # Browse SQLite data
```

## SUBMODULES
The project relies heavily on submodules in `external/`. See `app/dashboard/submodules` for active versions.

## DAEMON API REFERENCE

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/daemon/start` | POST | Start the background monitoring loop |
| `/api/daemon/stop` | POST | Stop the daemon |
| `/api/daemon/status` | GET | Get daemon state (running, sessions, logs) |
| `/api/supervisor/clear` | POST | Reset SupervisorState for a session |
| `/api/logs` | GET | Fetch KeeperLog entries |
