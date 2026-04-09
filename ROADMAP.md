# Roadmap

## 🚀 Active Development

- [x] **Vercel Deployment Hardening** (v0.8.8)
    - [x] Fix "Module Not Found" errors via shared workspace package.
    - [x] Implement runtime detection (Bun vs Node.js) for server entry.
    - [x] Ensure Prisma client stability in serverless environments.
- [x] **Analytics & Observability** (v0.8.8)
    - [x] Real-time Analytics Dashboard (Churn, Success Rate, Activity).
    - [x] System Internals Dashboard (Submodule status, Build info).
    - [x] Code Impact Metrics (Additions/Deletions).
- [x] **Multi-Provider Cloud Dev** (v0.8.7)
    - [x] Unified "Cloud Dev" interface.
    - [x] "Mock Mode" for testing UI without API keys.
    - [x] Session Transfer logic.
- [x] **Documentation Overhaul**
    - [x] Unified `LLM_INSTRUCTIONS.md`.
    - [x] Architectural Analysis.
    - [x] Vision Document.

## 📅 Short Term (v0.9.x)

- [ ] **Server-Side Analytics Aggregation**
    - Move heavy calculation from `AnalyticsDashboard` to a new `/api/analytics` endpoint to support scaling to thousands of sessions.
- [ ] **Enhanced Council Debate**
    - Visualize the "Winner" of a debate more clearly in the UI.
    - Allow users to manually intervene/vote during a debate.
- [ ] **Terminal V2**
    - Improve WebSocket stability on Vercel (or provide clear fallback UI when WS is unavailable).
    - Add "Command History" persistence.

## 🔭 Medium Term (v1.0)

- [ ] **Authentication & Multi-User**
    - Integrate NextAuth.js or Clerk.
    - Team-based workspaces.
- [ ] **RAG Context Engine**
    - Index the codebase to allow the "Supervisor" to answer deep architectural questions.
- [ ] **Workflow Automation**
    - "Recipes" for common tasks (e.g., "Refactor file", "Write Tests").
    - Drag-and-drop workflow builder.

## 🔮 Long Term (Vision)

- [ ] **Self-Hosting Appliance**
    - One-click Docker image for running Jules UI on a Raspberry Pi or local server.
- [ ] **IDE Extensions**
    - VS Code extension that connects to the Jules UI backend.
