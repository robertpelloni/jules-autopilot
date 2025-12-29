# Jules UI Roadmap

## Completed Features
- **Project Structure**:
  - Added `jules-sdk-reference` submodule (Python SDK).
  - Configured build (tsconfig, eslint) to handle submodules correctly.
- **API Client (`lib/jules/client.ts`)**:
  - Full parity with Python SDK models (`Session`, `Activity`, `SessionOutput`, etc.).
  - Pagination support (`listActivitiesPaged`, `listSessions`, `listSources`).
  - Filtering support for `listSources`.
  - `approvePlan` implementation.
  - `Media` and `PullRequest` artifact extraction.
- **Session Keeper (Auto-Pilot)**:
  - Background monitoring loop (`SessionKeeperManager`).
  - Zero-Fetch optimization (uses `lastActivityAt`).
  - "Smart Thresholds" (Active vs Idle states).
  - "Auto-Switch" to active session.
  - "Smart Pilot" (Supervisor LLM) and "Council Debate" (Multi-agent) integrations.
  - Settings UI with visual feedback.
  - Logs Panel.
  - Analytics Integration (Nudges, Approvals, Debates metrics).
  - **Code Churn Analytics**: Visualizing code additions and deletions over time.
  - **Council Debate Visualization**: Visualizing the multi-agent debate process in the UI.
  - **Memory Manager**: Context compaction and repo-level memory storage.
- **UI Enhancements**:
  - `ActivityFeed`: Set-based O(N) deduplication.
  - `ActivityFeed`: Rendering of Base64 images (Media) and PR links.
  - `AppLayout`: Resizable vertical split for logs.
  - `resizable.tsx`: Robust export handling for `react-resizable-panels`.
  - `Combobox`: Server-side filtering support (`onSearchChange`).
  - `NewSessionDialog`: Debounced repository search for large orgs.
  - `AnalyticsDashboard`: Session Keeper metrics integration.
- **System**:
  - Centralized Versioning (`VERSION.md`).
  - Submodule Synchronization.
  - **System Dashboard**: A dedicated page to view submodule versions, build info, and project structure.
  - **Real-time Submodule Status**: Live git status checks and commit dates in System Dashboard.
  - **Session Health Monitoring**: Health badges and stalled session detection.
- **Collaboration**:
  - **Broadcast Messages**: Send messages to all open sessions simultaneously.
  - **Kanban Board**: Manage sessions in a Kanban style (Running, Waiting, Done).
  - **Terminal Integration Polish**: Secure API key injection into the integrated terminal environment.
  - **Template Management**: Improved template creation UX with tag inputs and auto-renaming for clones.
  - **GitHub Issue Integration**: Integration with GitHub Issues for new sessions.

## Planned / Pending
- **None**: All planned items for this cycle are complete.
## Planned / Pending
- **None**: All planned items for this cycle are complete.

