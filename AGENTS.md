# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-08
**Version:** 0.6.1

## OVERVIEW
Jules UI is a specialized Next.js 16 application serving as an engineering command center for Google's Jules AI agent. It integrates real-time session monitoring, code diff viewing, multi-agent debates, and terminal access into a unified workspace.

**Core Stack:** Next.js 16 (App Router), TypeScript 5, Tailwind CSS v4, shadcn/ui, Node.js Terminal Server.

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
| **Terminal** | `terminal-server/` | WebSocket-based shell access |
| **Submodules** | `external/` | 3rd party integrations |

## CONVENTIONS
- **Imports**: Use `@/` alias for root (e.g. `@/components/ui/button`)
- **Styling**: Tailwind v4 via `app/globals.css`. No CSS modules.
- **State**: React Server Components (RSC) by default. Use `'use client'` only when interaction is needed.
- **Submodules**: treat `external/` as read-only libraries unless fixing upstream bugs.

## ANTI-PATTERNS (THIS PROJECT)
- **Direct Submodule Edits**: Do not edit files in `external/` directly if possible. Fork or patch upstream.
- **Hardcoded Secrets**: Use `process.env` (server) or `NEXT_PUBLIC_` (client) variables.
- **Mixed API Logic**: Keep server-side API logic in `app/api/` or `lib/`, never in client components.

## COMMANDS
```bash
# Development
npm run dev             # Start Next.js (port 3000)
node terminal-server/server.js # Start Terminal (port 8080)

# Docker
docker-compose -f deploy/docker-compose.yml up

# Maintenance
git submodule update --init --recursive  # Sync submodules
```

## SUBMODULES
The project relies heavily on submodules in `external/`. See `app/dashboard/submodules` for active versions.
