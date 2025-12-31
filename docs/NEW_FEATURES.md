# New Features Documentation

## Multi-Agent Debate with Context Injection

The Multi-Agent Debate feature now supports **Local Context Injection**.
This allows the debating agents (Architect, Security Engineer, etc.) to access the actual file structure and content of key configuration files (`package.json`, `README.md`, etc.) from the local repository.

### How it works
1.  **Frontend**: When a debate is triggered in `DebateDialog`, the client calls `client.gatherRepositoryContext('.')`.
2.  **Context Injection**: This context string is prepended to the conversation history as a "SYSTEM CONTEXT" message.
3.  **Backend**: The `runDebate` function receives this enhanced history, ensuring all participants are grounded in the actual codebase reality.

### API Changes
*   **Endpoint**: `/api/debate` (No schema change, just enriched payload content).
*   **Client**: `gatherRepositoryContext` is now utilized in both Code Review and Debate workflows.

## Plan Approval

The Plan Approval workflow is fully supported via the proxy endpoint.
*   **Client Method**: `client.approvePlan(sessionId)`
*   **Endpoint**: POST `/api/jules/sessions/{sessionId}/approve-plan` -> Proxies to Google's `sessions.approvePlan`.

## Session Resume

Resuming a session is handled by sending a message to the agent, as there is no dedicated `resume` endpoint in the Google Jules API v1alpha.
*   **Client Method**: `client.resumeSession(sessionId)`
*   **Implementation**: Sends a user message "Please resume working on this task." to the session via `/api/jules/sessions/{sessionId}:sendMessage`.

## API Proxy

The Next.js API Routes at `app/api/jules/[...path]` serve as a transparent proxy to the Google Jules API, handling authentication via the session's API key.
