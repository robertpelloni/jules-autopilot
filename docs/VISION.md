# Jules Autopilot - Product Vision

**Author:** User (extracted from conversation 2026-01-09)
**Version:** 0.8.3

---

## Core Mission

**Build the ultimate Jules UI with intelligent autopilot capabilities** that allows running millions of Jules sessions simultaneously, with automatic continuation powered by multi-model consensus—all while bypassing the sluggish official Google Jules website.

### Why This Exists

> "The Jules website blows and its really slow and takes forever to load and lags like heck so this is way better when it actually works"

The official Jules interface is slow, laggy, and doesn't scale. This project provides:
- **High-performance alternative UI** for Google's Jules AI agent
- **Autopilot mode** that keeps sessions moving without manual intervention
- **Multi-model orchestration** for intelligent decision-making
- **Massive parallelization** to leverage Google's free compute resources

---

## Architecture Philosophy

### Option C: Hono Backend + Ink CLI (Dual Interface)

**Decision:** Build BOTH a web UI and a TUI, sharing the same backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Pick One)                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │   Web UI (Browser)      │  │   TUI (Terminal)            │   │
│  │   Next.js + React       │  │   Bun + Ink (React for CLI) │   │
│  │   http://localhost:3000 │  │   `jules-tui` command       │   │
│  └───────────┬─────────────┘  └──────────────┬──────────────┘   │
│              │                               │                   │
│              └───────────┬───────────────────┘                   │
│                          │ HTTP/WebSocket                        │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Hono API Server (port 8080)                    ││
│  │  • /api/daemon/* (start/stop/status)                        ││
│  │  • /api/sessions/* (list/nudge/approve/interrupt)           ││
│  │  • /api/supervisor/* (state/clear)                          ││
│  │  • /api/debate/* (start/vote/resolve)                       ││
│  │  • WebSocket for real-time updates                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Background Daemon Loop                         ││
│  │  • Monitors Jules sessions via googleapis.com               ││
│  │  • Auto-nudges, auto-approves, triggers debates             ││
│  │  • Persists to SQLite (KeeperLog, SupervisorState)          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Why Dual Interface?

| Interface | Use Case | Benefits |
|-----------|----------|----------|
| **Web UI** | Dashboard monitoring, complex views (Kanban, debates) | Rich visualizations, mouse interaction, multiple tabs |
| **TUI (Ink)** | Quick commands, SSH access, scripting | Fast startup, keyboard-driven, works over SSH, pipeable |

### The "Mecha Suit" Concept

The TUI is your **Mecha Suit**—a keyboard-driven cockpit for power users:
- Same React mental model (Ink uses React for terminal)
- Vim-style keybindings
- Real-time session status in terminal
- Quick actions without leaving the command line

### Four Layers Total

1. **Hono API Server** (Bun, port 8080)
   - Stateless REST + WebSocket API
   - Shared by both Web UI and TUI
   - All business logic lives here

2. **Background Daemon** (runs inside Hono server)
   - Long-running monitoring loop
   - Triggers autonomous actions
   - Writes to SQLite

3. **Web Dashboard** (Next.js, port 3000)
   - Full-featured browser UI
   - Aggregates multiple service dashboards
   - Real-time via WebSocket

4. **TUI Client** (Bun + Ink)
   - `jules-tui` CLI command
   - Connects to Hono API
   - Terminal-native experience

5. **System Tray Manager** (Future: Tauri)
   - Native desktop presence
   - Quick access to start/stop daemon
   - Notifications for important events

### Compatibility Requirement

> "We want to wrap over all of those and somehow be compatible with all the frameworks they are using"

The AIOS base will integrate multiple sub-services, each potentially with their own web dashboards. Jules Autopilot must:
- Act as a portal/aggregator for disparate webservers
- Support reverse proxy or iframe embedding
- Maintain consistent UX across different backend frameworks

---

## Required Features (User-Specified)

### Session Management
| Feature | Description | Priority |
|---------|-------------|----------|
| **Session List** | View all active/paused/completed sessions | P0 |
| **Session Monitor** | Real-time status tracking per session | P0 |
| **Interrupt All Sessions** | Emergency stop for all running sessions | P0 |
| **Continue All Sessions** | Resume all paused sessions at once | P0 |
| **Auto-Restart Old Sessions** | Automatically resume stalled/old sessions | P1 |
| **Show Last Activity** | Timestamp of most recent action | P0 |
| **Show First Activity** | Date session was started | P0 |
| **Show Current Status** | Real-time state (running/paused/waiting) | P0 |

### Autopilot & Intelligence
| Feature | Description | Priority |
|---------|-------------|----------|
| **Autopilot Toggle** | Enable/disable automatic continuation | P0 |
| **Supervisor** | LLM that decides next actions | P0 |
| **Auto-Approve Plans** | Automatically approve safe agent plans | P0 |
| **Fallbacks** | Retry with different models on failure | P1 |
| **Consensus** | Multi-model agreement before risky actions | P1 |
| **Debate** | Multi-agent discussion for complex decisions | P0 |
| **Broadcast** | Send message to multiple sessions | P1 |

### Logging & Observability
| Feature | Description | Priority |
|---------|-------------|----------|
| **Logs Button** | Quick access to daemon/session logs | P0 |
| **Show Entire Conversation Logs** | Full history with all entries and details | P0 |
| **Download Conversation Logs** | Export complete session transcripts | P1 |
| **All Entries and Details** | No truncation, full audit trail | P0 |

### Configuration
| Feature | Description | Priority |
|---------|-------------|----------|
| **Supervisor Settings** | Configure supervisor behavior | P0 |
| **API Keys** | Manage provider credentials | P0 |
| **API Key Managers** | Per-provider key configuration | P0 |

### Additional Views
| Feature | Description | Priority |
|---------|-------------|----------|
| **Terminal** | Web-based shell access | P1 |
| **Kanban** | Task board view for sessions | P2 |
| **Overview** | Dashboard summary/analytics | P0 |

---

## Current Implementation Status (v0.8.3)

### ✅ Completed
- [x] Session Keeper Daemon (Bun/Hono backend)
- [x] Multi-Agent Debate system with dynamic participants
- [x] Code Diff Viewer
- [x] Terminal Integration
- [x] Secure Auth (JWT cookies)
- [x] Activity Feed with session history
- [x] Supervisor API with risk scoring
- [x] Provider abstraction (OpenAI, Anthropic, Gemini, Qwen)
- [x] SQLite persistence (KeeperLog, SupervisorState, Debate)
- [x] Full logs UI with download capability (JSON/Markdown export)
- [x] Interrupt/Continue all sessions buttons
- [x] Auto-restart stalled sessions (via resumePaused setting)
- [x] Broadcast to multiple sessions
- [x] pnpm monorepo with @jules/shared package
- [x] Real-time WebSocket events (nudges, approvals, status)
- [x] Ink TUI client (@jules/cli)
- [x] Kanban view for sessions

### 📋 Planned
- [ ] System tray manager (Tauri)
- [ ] Plugin system for sub-service dashboards
- [ ] Desktop notifications

---

## Technical Decisions

### Why Next.js 16?
- Fast React-based UI with App Router
- Server Components for performance
- Strong ecosystem for dashboard UIs

### Why Bun/Hono for Daemon?
- Runs independently of browser lifecycle
- Fast startup, low memory footprint
- Direct SQLite access via Prisma

### Why Not Electron?
- Tauri preferred for smaller bundle size
- Rust backend for system-level operations
- Better security model

### Database Choice
- **SQLite** for local development and single-user deployment
- **Turso** (libSQL) supported for cloud/multi-user scenarios

---

## Quality Bar

### Regressions Are Unacceptable

> "You broke everything and keep breaking everything over and over and it keeps getting regressions... then I point out all the broken stuff and you fix it and then slowly break it all again"

**Mandatory practices:**
1. Run `lsp_diagnostics` after every code change
2. Run `npm run build` before any commit
3. Test daemon startup after Prisma changes
4. Never suppress type errors with `as any` or `@ts-ignore`
5. Minimal fixes for bugs—no refactoring during bugfixes

---

## Success Metrics

1. **Session Throughput**: Support 100+ concurrent Jules sessions
2. **Response Time**: Dashboard loads in < 2 seconds
3. **Uptime**: Daemon runs 24/7 without intervention
4. **Zero Regressions**: Build must pass before every commit
