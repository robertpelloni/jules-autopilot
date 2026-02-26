# Project Vision: Jules Autopilot

## The Ultimate Goal

To build the definitive, self-hosted **Engineering Command Center** for Google's Jules AI agent and multi-provider AI coding workflows. This platform transforms ephemeral, chat-based AI interactions into a **persistent, state-aware, observable, and policy-governed workspace** for professional software development at scale.

Jules Autopilot is not merely a UI wrapper — it is an **autonomous engineering orchestration platform** that manages agent lifecycles, enforces security boundaries, controls costs, and coordinates multi-model collaboration.

## Core Philosophy

1.  **Transparency**: Every action, thought, and code change by any agent must be visible, reviewable, and reversible. No silent mutations.
2.  **Autonomy with Oversight**: The Session Keeper works autonomously to unblock agents (nudges, plan approvals) but strictly adheres to human-defined boundaries (Council Debate mode, capability permissions, budget limits).
3.  **Multi-Provider Neutrality**: The platform abstracts away individual LLM providers. Jules, Devin, Manus, OpenHands, Claude Code, and Codex are all first-class citizens routed intelligently based on task type, cost, and capability.
4.  **Privacy & Self-Hosting**: Code, API keys, and session data live in the user's own infrastructure. The platform only makes necessary calls to upstream provider APIs.
5.  **Supply-Chain Security**: All third-party plugin extensions must be cryptographically signed (Ed25519) and capability-bounded before execution.
6.  **Cost Governance**: Every LLM invocation is tracked, budgeted, and rate-limited per workspace. The intelligent routing engine automatically falls back to cost-efficient models when budgets are low.

## Architecture Design

### Frontend
-   **Next.js 16** (App Router) with React 19 and Server Components by default.
-   **ShadCN UI** + Tailwind CSS for a dense, information-rich, dark-mode-first interface.
-   **Zustand** for client-side state management.
-   Mobile-first responsive design optimized for on-call emergency triage.

### Backend
-   **Next.js API Routes**: Standard CRUD, auth, plugin management, routing simulation.
-   **Session Keeper Daemon** (Bun/Hono on port 8080): Persistent background process for session monitoring, auto-nudging, and the "Smart Pilot" autonomous supervisor.
-   **@jules/shared**: Monorepo workspace package containing shared business logic, types, and orchestration code between frontend and daemon.

### Data Layer
-   **Prisma ORM** with SQLite (LibSQL adapter) for local persistence.
-   Models: User, Workspace, Session, Template, Debate, Plugin (Manifest, Installed, AuditLog), SessionTransfer, ProviderTelemetry, RoutingPolicy, KeeperSettings.
-   NextAuth v5 with Prisma Adapter for OAuth (GitHub provider).

### Security
-   **NextAuth JWT sessions** with workspace-level data isolation across all API routes.
-   **Ed25519 cryptographic signature verification** for plugin marketplace ingestion.
-   **Capability-bounded plugin execution** with per-workspace daily quotas and comprehensive audit logging.
-   **Monthly budget constraints** on LLM usage with automatic cost-efficiency fallbacks.

## Key Features (Implemented)

### Session Keeper (Auto-Pilot)
An "always-on" supervisor that detects when the agent is stuck or waiting. Configurable inactivity thresholds trigger a "Supervisor LLM" to generate context-aware prompts to unblock the agent.

### Council Debate System
Multi-persona AI debate (Security, Architect, QA) before executing high-risk changes. Agents critique each other's plans, producing synthesized, higher-quality instructions.

### Multi-Provider Cloud Dev
Unified provider registry supporting Jules, Devin, Manus, OpenHands, GitHub Spark, Blocks, Claude Code, and Codex with session transfer capabilities.

### Plugin Ecosystem
Marketplace ingestion pipeline with Ed25519 signature verification, capability boundaries (filesystem, network, system, MCP), per-workspace execution quotas, and comprehensive audit logging.

### Intelligent Provider Routing
Dynamic LLM selection based on task type (code_review, fast_chat, deep_reasoning), workspace routing policies, and monthly budget constraints. Includes a simulation API for cost previewing.

### Integrated Terminal
WebSocket-based terminal streaming (xterm.js + node-pty) for direct command execution from the web UI.

### System Observability
System Internals dashboard tracking submodule commits, build dates, dependency versions, and project structure.

## Future Direction

-   **Workflow Automation**: Define complex multi-step workflows (Feature → Test → PR → Merge) the Session Keeper can execute end-to-end.
-   **Deep Context (RAG)**: Index the local codebase to give agents comprehensive understanding of project structure.
-   **Shadow Pilot Mode**: Council debates silently in the background while a human works, intervening with warnings on critical errors.
-   **Agent Scaling**: Automatically spin up parallel agent sessions when bottlenecks are detected.
-   **Real-Time Event Architecture**: Replace polling with WebSocket/SSE push for all major dashboard surfaces.
-   **Docker Deployment**: Production-ready containerized deployment with PM2 process management.
-   **Mobile Emergency Triage**: "One-Tap Approve Fix" for production incidents on mobile.
