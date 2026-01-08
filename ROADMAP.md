# Roadmap

## 🚀 Active Development
-   [x] **Core UI/UX:** Session Board, Activity Feed, Artifact Browser.
-   [x] **Session Keeper:** Auto-pilot, "Nudge" system, server-side persistence.
-   [x] **Multi-Agent Debate:** Basic implementation with mock/API supervisor.
-   [x] **Submodules:**
    -   [x] `jules-agent-sdk-python`


## Phase 2: Enhanced Interactions (Completed)
- [x] Code Diff Viewer
- [x] Terminal Output Rendering
- [x] Session Keeper (Auto-Pilot)
- [x] Session Kanban Board
- [x] System Status Dashboard
- [x] **Memory Manager**: Context compaction and repo-level memory storage.
- [x] **Code Churn Analytics**: Visualizing code additions and deletions over time.
- [x] **Session Health Monitoring**: Health badges and stalled session detection.
- [x] **Broadcast Messages**: Send messages to all open sessions simultaneously.
- [x] **Terminal Integration Polish**: Secure API key injection into the integrated terminal environment.

## Phase 3: Advanced Features (Completed)
- [x] **Multi-Agent Debate:** Orchestrate debates between Supervisor and Worker agents.
- [x] **Deep Code Analysis:** Parallel code audits (Security, Performance, Maintainability) with Structured Scorecards.
- [x] **Artifact Management:** Artifact Browser with list and preview.
- [x] **Session Templates:** Save and reuse session configurations.
- [x] **Council Debate Visualization**: Visualizing the multi-agent debate process in the UI.
- [x] **GitHub Issue Integration**: Integration with GitHub Issues for new sessions.

## Phase 4: Production Readiness (Completed)
- [x] **Secure Authentication:** Replace client-side API Key storage with HTTP-only cookies and Middleware.
- [x] **Docker Optimization:** Multi-stage builds and smaller images.
- [x] **CI/CD Pipeline:** Automated testing and build checks.
- [x] **E2E Testing:** Comprehensive Playwright suite.
- [x] **Hierarchical Documentation:** Structured AGENTS.md and centralized knowledge base.
- [x] **Versioning System:** Single source of truth (VERSION.md) and strict changelog management.
- [x] **Submodule Dashboard:** Real-time tracking of submodule versions and git status.

## Phase 5: Future
- [ ] **User Accounts:** OAuth integration (Google/GitHub).
- [ ] **Plugin System:** Allow custom tools for the agent.
- [ ] **Advanced Analytics:** Token usage tracking and cost estimation per session.

## 📅 Short Term (v0.7.x - v0.8.x)
-   **Advanced Orchestration:**
    -   [x] Real implementations for `runCodeReview` using LLMs with structured output.
    -   [x] **Dynamic Multi-Agent Debate:** Configurable providers (OpenAI, Anthropic, Gemini, Qwen) and models.
    -   [ ] **Debate Persistence:** Save full debate transcripts to database/memory.
    -   [ ] **Debate "Spectator Mode":** Real-time streaming of debate thoughts to the UI.

## 🔮 Long Term (Vision)
-   **Jules Autonomous:**
    -   Self-hosting capability.
    -   Full repository management (auto-PR, auto-merge).


## 🛠️ Infrastructure
-   **CI/CD:** Automated testing pipeline for all submodules.
