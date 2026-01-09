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

## Phase 5: Platform Extensions (In Progress)
- [ ] **User Accounts:** OAuth integration (Google/GitHub).
- [ ] **Plugin System:** Allow custom tools for the agent.
- [x] **Advanced Analytics:** Token usage tracking and cost estimation per session.

## Phase 6: Multi-Provider Cloud Dev (v0.8.5) ✨ NEW
- [x] **Unified Provider Interface:** Abstract base class for all cloud dev providers.
- [x] **Provider Registry:** Factory functions for dynamic provider instantiation.
- [x] **Jules Provider:** Full implementation wrapping existing JulesClient.
- [x] **Stub Providers:** Devin, Manus, OpenHands, GitHub Spark, Blocks, Claude Code, Codex.
- [x] **Session Transfer Service:** Cross-provider session migration with context preservation.
- [x] **Multi-Provider Store:** Zustand state management for sessions across providers.
- [ ] **Provider API Integrations:** Implement full APIs for Devin, Manus, OpenHands.
- [ ] **Cross-Provider UI:** Dashboard for managing sessions across all providers.
- [ ] **Transfer Progress Tracking:** Real-time progress during session migrations.

## 📅 Short Term (v0.7.x - v0.8.x)
-   **Advanced Orchestration:**
    -   [x] Real implementations for `runCodeReview` using LLMs with structured output.
    -   [x] **Dynamic Multi-Agent Debate:** Configurable providers (OpenAI, Anthropic, Gemini, Qwen) and models.
    -   [x] **Debate Persistence:** Save full debate transcripts to database/memory.
    -   [x] **Debate "Spectator Mode":** Real-time streaming of debate thoughts to the UI.

## 🔮 Long Term (Vision)
-   **Jules Autonomous:**
    -   Self-hosting capability.
    -   Full repository management (auto-PR, auto-merge).
-   **Provider Ecosystem:**
    -   Support for 10+ cloud dev providers.
    -   Unified billing and cost tracking across providers.
    -   Automated provider selection based on task requirements.


## 🛠️ Infrastructure
-   **CI/CD:** Automated testing pipeline for all submodules.

---

## Undocumented Features (Discovered)

The following features exist in the codebase but were not previously documented:

### Session Management
- **Session Handoff:** Automatic archiving of sessions older than 30 days with summary continuation in new sessions.
- **Smart Nudge System:** Context-aware prompts using conversation history analysis (not just random messages).
- **Provider Fallback Chain:** Automatic fallback between LLM providers if primary fails.
- **Memory Management:** Per-session supervisor state with conversation history persistence in SQLite.

### Code Analysis
- **Code Review Types:** Simple vs comprehensive reviews with different analysis depths.
- **Risk Scoring:** Automated risk assessment for plan approval workflows.

### Template System
- **CSV Tag Storage:** Tags stored as comma-separated values in database.
- **Favorite Marking:** Templates can be marked as favorites for quick access.
- **Prebuilt Templates:** System-provided templates that cannot be deleted.

### Terminal Integration
- **Health Checks:** Terminal server `/health` endpoint for monitoring.
- **Graceful Shutdown:** PTY process cleanup on client disconnect.
- **Workspace Detection:** Automatic `/workspace` vs project root directory detection.
- **API Key Inheritance:** Child processes inherit `JULES_API_KEY` environment variable.
- **Concurrent Sessions:** Multiple terminal sessions per user with session isolation.

### UI/UX
- **Optimistic Updates:** UI updates before API confirmation for responsive feel.
- **URL Synchronization:** Session selection synced with URL query parameters.
- **Middleware Protection:** Route guarding with redirect to `/login` for unauthenticated users.

### Architecture
- **Anthropic Role Mapping:** 'system' messages converted to 'user' role for API compliance.
- **Daemon Independence:** Background daemon runs separately from Next.js for reliability.
- **Submodule Read-Only:** External submodules treated as read-only libraries.
