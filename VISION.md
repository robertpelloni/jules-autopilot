# Project Vision: Jules UI

## The Ultimate Goal
To build the definitive, self-hosted **Engineering Command Center** for Google's Jules AI agent. This platform transforms the ephemeral, chat-based interaction of standard AI agents into a persistent, state-aware, and highly observable workspace for professional software development.

## Core Philosophy
1.  **Transparency:** Every action, thought, and code change by the agent must be visible, reviewable, and reversible.
2.  **Autonomy with Oversight:** The agent ("Session Keeper") should work autonomously to unblock itself (nudges, plan approvals) but strictly adhere to human-defined boundaries (Council Debate mode).
3.  **Integration:** Seamlessly integrate with local development environments (Terminal), version control (Git), and external knowledge bases.
4.  **Privacy:** Your code, API keys, and session data live in your container/browser, not on a third-party server (except for the necessary calls to the Jules API).

## Architecture Design
-   **Frontend:** Next.js (React) using `shadcn/ui` for a dense, information-rich interface.
-   **Backend:** A hybrid approach:
    -   **Next.js API Routes:** For standard CRUD and UI support.
    -   **Session Keeper Daemon:** A persistent background process (Node.js/Bun) that monitors session health, triggers nudges, and manages the "Smart Pilot".
    -   **Shared Core:** `@jules/shared` package containing all business logic, types, and orchestration code, ensuring consistency between the frontend and daemon.
-   **Persistence:** SQLite (via Prisma) for local state (settings, logs, templates) + Jules API for session state.

## Key Features & Roadmap Alignment

### 1. The "Session Keeper" (Auto-Pilot)
*   **Vision:** An "always-on" supervisor that detects when the main agent is stuck or waiting.
*   **Implementation:** Configurable inactivity thresholds. Uses a "Supervisor LLM" to generate context-aware prompts to get Jules moving again.

### 2. Council Debate System
*   **Vision:** Prevent "yes-man" behavior from AI. Before executing high-risk changes, multiple AI personas (Security, Architect, QA) debate the approach.
*   **Implementation:** An orchestration loop where agents critique each other's plans, resulting in a synthesized, higher-quality instruction for Jules.

### 3. Integrated Terminal
*   **Vision:** The web UI shouldn't be a walled garden. It must interact with the host machine.
*   **Implementation:** WebSocket-based terminal streaming (`xterm.js` + `node-pty`) allowing direct command execution and output capture.

### 4. System Observability
*   **Vision:** Know exactly what version of every component is running.
*   **Implementation:** A "System Internals" dashboard tracking submodule commits, build dates, and dependency versions.

## Future Direction
-   **Multi-Provider Support:** Fully abstract the "Supervisor" to support any LLM (Local/Cloud).
-   **Workflow Automation:** Define complex multi-step workflows (e.g., "Feature -> Test -> PR -> Merge") that the Session Keeper can execute.
-   **Deep Context:** Indexing the local codebase (RAG) to give Jules "god-mode" understanding of the project structure.
