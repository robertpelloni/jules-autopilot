# Jules Autopilot - Product Vision (Lean Core)

**Author:** User (Updated for Lean Core Pivot)
**Version:** 1.0.9

---

## Core Mission

**Build the ultimate Jules orchestration command center**—a high-performance, autonomous engineering workspace that manages complex AI coding sessions with zero friction. It bypasses sluggish official interfaces with a unified, real-time dashboard and a keyboard-driven TUI for power users.

### Why This Exists

> "The Jules website blows and its really slow and takes forever to load and lags like heck so this is way better when it actually works"

The official interfaces for AI coding agents are often slow and unresponsive. This project provides:
- **Lean Core Architecture:** Focused exclusively on a robust single-workspace experience.
- **High-Performance UI:** Real-time feedback and instantaneous state updates.
- **Autopilot mode:** Autonomous monitoring, nudging, and plan approval.
- **Multi-model consensus:** Intelligent decision-making through agent debates.

---

## Architecture Philosophy (Lean Core)

### Consolidated Backend + Dual Interface

**Decision:** Maintain a high-performance Bun-based API daemon that serves both the Web UI and the TUI.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Pick One)                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │   Web UI (Browser)      │  │   TUI (Terminal)            │   │
│  │   Next.js 15 + React    │  │   Bun + Ink (React for CLI) │   │
│  │   http://localhost:3000 │  │   `jules-tui` command       │   │
│  └───────────┬─────────────┘  └──────────────┬──────────────┘   │
│              │                               │                   │
│              └───────────┬───────────────────┘                   │
│                          │ HTTP/WebSocket                        │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Hono API Server (port 8080)                    ││
│  │  • Centralized Jules Proxy (/sessions, /activities)         ││
│  │  • Daemon Management (/api/daemon/status)                   ││
│  │  • Supervisor & Debate APIs (/api/debate, /api/review)      ││
│  │  • Filesystem Access (/api/fs/read, /api/fs/list)           ││
│  │  • WebSocket for real-time push events                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Background Daemon Loop                         ││
│  │  • Monitors Jules sessions via googleapis.com               ││
│  │  • Auto-nudges, auto-approves, triggers debates             ││
│  │  • Robust SQLite persistence (Prisma Core)                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Why Lean Core?

| Feature | Lean Core Strategy | Benefit |
|-----------|----------|----------|
| **Multi-Provider** | Removed (Legacy) | Reduced complexity, focused stability |
| **Enterprise Stats** | Removed | Lower resource overhead, cleaner UI |
| **Submodules** | Pruned | Faster build times, simpler repo structure |
| **API Logic** | Centralized in Bun | High performance, single source of truth |

---

## Required Features

### Session Orchestration
| Feature | Description | Status |
|---------|-------------|----------|
| **Unified List** | Real-time view of all local/remote sessions | ✅ |
| **Activity Feed** | Detailed history with diff and bash output | ✅ |
| **Auto-Nudge** | Detect inactivity and prompt agent to resume | ✅ |
| **Auto-Approve** | Automatically approve safe implementation plans | ✅ |
| **Mock Fallback** | Function without API keys for UI exploration | ✅ |

### Intelligence & Debate
| Feature | Description | Status |
|---------|-------------|----------|
| **Council of Agents** | OpenAI, Anthropic, and Gemini participants | ✅ |
| **Debate Engine** | Multi-round discussion for complex plans | ✅ |
| **Code Review** | Automated architectural & security analysis | ✅ |
| **Smart Pilot** | LLM-driven context-aware agent nudges | ✅ |

### Developer Experience
| Feature | Description | Status |
|---------|-------------|----------|
| **Filesystem API** | Local file access for the agent daemon | ✅ |
| **Dual Interface** | Switch between Web Dashboard and Ink TUI | ✅ |
| **Transparency** | Real-time streaming logs and socket events | ✅ |

---

## Implementation History

### ✅ Milestone: v1.0.15 — Go Backend Parity Pass #7 (Current)
- [x] Consolidated API into a single Bun daemon.
- [x] Removed "Enterprise" feature bloat (Analytics, Swarms, Side Logs).
- [x] Implemented the frontend proxy layer for seamless local integration.
- [x] Pruned Prisma schema to core orchestration models.
- [x] Extended the Deep Autonomous Node with version-uniformity fixes across the Web UI, CLI, shared packages, and daemon manifest.
- [x] Ported practical Go backend control-loop behavior for live session checks, nudges, completed-session memory sync enqueueing, and conservative low-risk plan auto-approval.
- [x] Added a Go-side Keeper log / realtime event bridge so autonomous behavior can surface into the operator UI without depending exclusively on the Bun daemon.
- [x] Ported Go-side repository indexing so code chunk traversal, embedding ingestion, and `CodeChunk` persistence can run without Bun.
- [x] Ported Go-side GitHub issue scanning and autonomous session spawning so issue-driven work discovery can run without Bun.
- [x] Ported provider-backed Go council review for risky plans so the Go backend can debate, summarize, rescore, and approve/reject plans with richer autonomy.
- [x] Ported Go semantic retrieval so the Go backend can query indexed code/history memory directly and inject retrieved context into nudges.
- [x] Broadened Go-originated lifecycle/detail parity so indexing and issue workflows emit explicit realtime events that the frontend can interpret directly.

### 📋 Future Path
- [ ] Refined TUI experience for "Mecha Suit" cockpit mode.
- [ ] Native RAG integration for deep repository context.
- [ ] Desktop notifications for autonomous actions.

---

## Technical Decisions

### Next.js 15 + Turbopack
- Modern, fast React development experience.
- App Router for clean architectural boundaries.

### Bun + Hono
- Exceptional performance for the backend daemon.
- Native TypeScript support and fast startup times.

### SQLite (Prisma)
- Optimized for single-user local development.
- Zero-config deployment and persistent state.

---

## Quality Bar

### Regressions Are Unacceptable

> "You broke everything and keep breaking everything over and over and it keeps getting regressions... then I point out all the broken stuff and you fix it and then slowly break it all again"

**Mandatory practices:**
1. **Surgical Changes:** Minimize file touches during bugfixes.
2. **Type Safety:** Strict TypeScript adherence; no `any` hacks.
3. **Daemon Reliability:** The backend must handle Redis/API failures gracefully.
4. **Mock Consistency:** The dashboard must always work with simulated data.
