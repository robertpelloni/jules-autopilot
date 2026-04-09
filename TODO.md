# Jules UI: Todo & Implementation Plan

This file tracks granular tasks, bugs, and feature requests. For high-level goals, see `ROADMAP.md`.

## 🔴 High Priority (Immediate)

- [ ] **Code Review UI**: Create a dedicated dialog/page for requesting detailed code reviews (beyond the "Quick Review" button).
    - [ ] Allow selecting files from the repository (if possible via Jules API).
    - [ ] Allow pasting a diff or code snippet.
    - [ ] Select "Review Persona" (Security, Performance, etc.).
- [ ] **Memory Manager Enhancement**:
    - [ ] Add "Inject Memory" button to `NewSessionDialog`.
    - [ ] Allow editing memory content before saving.
- [ ] **Terminal V2**:
    - [ ] Add a visual "Reconnecting..." state.
    - [ ] Implement a simple command history (Up/Down arrow) if `xterm` doesn't handle it natively with `node-pty`.

## 🟡 Medium Priority (Next Release)

- [ ] **Multi-User Settings**:
    - [ ] Update `SessionKeeperSettings` to be user-specific (requires DB schema update).
    - [ ] Add "User Profile" page for managing NextAuth sessions.
- [ ] **RAG Context Engine**:
    - [ ] Implement a script to index the local codebase into a vector store (e.g., SQLite `vss` or simple JSON for small repos).
    - [ ] Expose an API to query context.
    - [ ] Inject relevant context into "Supervisor" prompts.
- [ ] **Workflow Builder**:
    - [ ] UI for defining "If X then Y" rules for the Session Keeper (e.g., "If build fails, run `npm install`").

## 🟢 Low Priority / Nice to Have

- [ ] **Mobile Optimization**: Further refine the "Session Keeper" log panel for mobile screens.
- [ ] **Theme Customizer**: Allow saving custom themes to the DB.
- [ ] **Plugin System**: Allow external scripts to register as "Tools" for the agent.

## 🐛 Known Issues / Bugs

- [ ] **Analytics**: Client-side sorting of `activities` for "Code Churn" might be slow with >10k activities. (Mitigated by server-side aggregation, but detailed churn view is still limited).
- [ ] **Vercel WebSocket**: Terminal doesn't work on standard Vercel functions. Requires external hosting or relay.
