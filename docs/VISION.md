# Jules Autopilot - Product Vision

**Author:** User (extracted from conversation 2026-01-09)
**Version:** 0.8.0

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

### Long-Running Service + Web Dashboard + System Tray

The system needs three layers:

1. **Background Daemon** (Bun/Hono on port 8080)
   - Runs independently of browser
   - Monitors all Jules sessions continuously
   - Triggers nudges, approvals, and debates autonomously

2. **Web Dashboard** (Next.js on port 3000)
   - Fast, responsive UI for monitoring and control
   - Aggregates multiple service dashboards
   - Real-time session status and logs

3. **System Tray Manager** (Future: Tauri)
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

## Current Implementation Status (v0.8.0)

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

### 🔄 In Progress
- [ ] Full logs UI with download capability
- [ ] Interrupt/Continue all sessions buttons
- [ ] Auto-restart stalled sessions
- [ ] Broadcast to multiple sessions

### 📋 Planned
- [ ] Kanban view
- [ ] System tray manager (Tauri)
- [ ] Plugin system for sub-service dashboards

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
