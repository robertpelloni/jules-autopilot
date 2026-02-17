# TODO — Ordered Execution Backlog (Audit Baseline)

Last updated: 2026-02-16
Scope: Whole-project robustness pass (frontend, backend, APIs, infra, docs)

## How to use this file

- This list is dependency-ordered.
- Do not skip acceptance criteria.
- Any item touching user-facing behavior must include UI representation, API behavior, and test coverage updates.

## P0 — Reality alignment and architecture integrity

### 1) Version/source-of-truth correction

- [ ] Align versioning across `VERSION`, `VERSION.md`, `package.json`, release docs.
- [ ] Add CI guard to fail when versions diverge.

Acceptance criteria:
- Single canonical version source is documented and enforced.
- Build/release pipeline validates version consistency.

---

### 2) API ownership consolidation (Next routes vs daemon)

- [ ] Define endpoint ownership matrix:
  - [ ] Next API routes that remain first-class
  - [ ] Daemon endpoints retained for internal/system operations
  - [ ] Deprecated/duplicate endpoints and migration path
- [ ] Refactor clients to use canonical endpoint per domain (`templates`, `debate`, `settings`, `logs`).
- [ ] Remove hardcoded `http://localhost:8080` where equivalent first-party route exists.
- [ ] Add typed API client layer (single transport abstraction) to prevent future split-brain.

Acceptance criteria:
- No domain has dual active write-paths.
- Client calls are centralized and environment-safe.
- Regression tests verify canonical path usage.

---

### 3) Documentation truth pass

- [ ] Reconcile `README.md`, `VISION.md`, `docs/PRD.md`, `docs/USER_GUIDE.md`, `CHANGELOG.md` with current implementation state.
- [ ] Replace ambiguous “completed” language with explicit status labels: `implemented`, `partial`, `mock/demo`, `planned`.
- [ ] Add architecture decision note describing API ownership model.

Acceptance criteria:
- No user-facing doc claims full implementation for mock/stub features.
- Status taxonomy is consistent across docs.

## P1 — Product correctness (remove partial/mock ambiguity)

### 4) Submodule dashboards: live data or explicit preview mode

- [ ] Replace mock data in:
  - [ ] `components/submodules/task-queue-dashboard.tsx`
  - [ ] `components/submodules/mcp-server-dashboard.tsx`
  - [ ] `components/submodules/terminal-stream.tsx`
- [ ] Wire to actual backend/system signals.
- [ ] If backend signal unavailable, expose explicit preview badge + roadmap ETA.
- [ ] Implement robust loading, empty, offline, and error states.

Acceptance criteria:
- Dashboards either show live verified data or explicitly indicate preview mode.
- No silent mock rendering in production paths.

---

### 5) Plugin system hardening (currently simulated)

- [ ] Define plugin manifest schema and validation rules.
- [ ] Build backend plugin registry API and persistence model.
- [ ] Implement install/uninstall lifecycle beyond localStorage simulation.
- [ ] Add plugin capability permissions and runtime boundaries.
- [ ] Add health, versioning, and compatibility checks.

Acceptance criteria:
- Plugins are not just UI toggles; install state persists server-side.
- Invalid or unsafe manifests are rejected.
- UI clearly reflects plugin runtime status.

---

### 6) Provider framework maturity (non-Jules providers)

- [ ] For each provider (`devin`, `manus`, `openhands`, `github-spark`, `blocks`, `claude-code`, `codex`):
  - [ ] Implement `createSession`, `getSessionStatus`, `sendMessage`, `listSessions`, `terminateSession`.
  - [ ] Add provider-specific error mapping and retry strategy.
  - [ ] Add configuration validation + health check.
- [ ] Keep mock mode opt-in and visibly labeled.

Acceptance criteria:
- At least one non-Jules provider reaches end-to-end production-ready status first.
- Remaining providers have explicit status and compatibility matrix.

---

### 7) Session transfer reliability

- [ ] Replace optimistic-only transfer flow with observable state machine.
- [ ] Add transfer checkpoints (queued, preparing, exporting, importing, ready, failed).
- [ ] Persist transfer history + failure reason for diagnostics.

Acceptance criteria:
- Transfer UI progress maps to backend checkpoints.
- Recovery/rollback path exists for failed transfers.

## P2 — Security, auth UX, and operational robustness

### 8) Auth/account consistency cleanup

- [ ] Remove stale API-key localStorage guidance where not architecturally true.
- [ ] Clearly separate “session auth” vs “provider credential configuration” in UI copy.
- [ ] Validate secure handling for any remaining key material.

Acceptance criteria:
- No contradictory auth/credential messaging in UI/docs.
- Sensitive fields have clear storage/security semantics.

---

### 9) Standardized error contracts

- [ ] Define shared error response shape for all APIs.
- [ ] Normalize status codes and error payloads.
- [ ] Add UI error handling adapters so surfaces present consistent failure states.

Acceptance criteria:
- Frontend components consume one error contract.
- Integration tests assert contract consistency across route families.

---

### 10) Observability and diagnostics baseline

- [ ] Add request IDs/correlation IDs across Next + daemon requests.
- [ ] Add structured logs for provider calls, debate flow, template CRUD, keeper actions.
- [ ] Expose operator-friendly diagnostics endpoint/set.

Acceptance criteria:
- Core flows are traceable across boundaries.
- Operational failures are diagnosable without deep manual repro.

## P3 — Test coverage and release confidence

### 11) Expand API tests

- [ ] Add route tests for all CRUD/state endpoints with success + failure branches.
- [ ] Add auth boundary tests for protected routes.
- [ ] Add provider integration contract tests (mock + real where possible).

Acceptance criteria:
- High-risk routes are covered for both nominal and failure cases.

---

### 12) Expand E2E Playwright suite

- [ ] Cover critical journeys:
  - [ ] login/session creation/session detail flow
  - [ ] debate creation/history/view flow
  - [ ] template create/edit/delete flow
  - [ ] provider dashboard + transfer flow
  - [ ] system dashboards and settings flow
- [ ] Add deterministic test data setup/teardown strategy.

Acceptance criteria:
- CI verifies at least one end-to-end path per major module.
- Flake rate and retry behavior are documented.

---

### 13) Quality gates

- [ ] Enforce lint/typecheck/test/build gates in CI.
- [ ] Add changed-files test selection where useful, but keep full suite on mainline.
- [ ] Fail builds on known-doc drift checks for roadmap/status taxonomy.

Acceptance criteria:
- Regressions are blocked pre-merge.
- Status docs cannot silently drift from implementation.

## P4 — Product expansion (post-stability)

### 14) OAuth and multi-user model

- [ ] Design user/org/workspace model.
- [ ] Implement OAuth providers and account linking.
- [ ] Add per-user/per-workspace data isolation and migration plan.

Acceptance criteria:
- Auth model scales beyond single-operator/local mode.

---

### 15) Advanced plugin ecosystem

- [ ] Add marketplace ingestion pipeline.
- [ ] Add plugin signing/verification.
- [ ] Add sandbox/runtime quotas and audit logs.

Acceptance criteria:
- Plugin model supports safe third-party extension in production.

---

### 16) Intelligent provider routing + cost controls

- [ ] Add routing policy engine by task type, capability, and cost.
- [ ] Add cross-provider cost telemetry and budget constraints.
- [ ] Add policy simulation mode before rollout.

Acceptance criteria:
- Provider selection can be automated with explicit policy controls.

## Cross-cutting implementation rules

- [ ] Every backend feature must have explicit UI state representation (loading, success, empty, error, disabled).
- [ ] Every new route must include contract tests and docs update.
- [ ] Every feature marked “complete” must satisfy: backend integration + UI representation + persisted state where needed + tests.
- [ ] Any mock/demo mode in production UI must be visibly labeled.

## Suggested milestone packaging

- Milestone 1 (1–2 sprints): P0 items 1–3, P1 item 4
- Milestone 2 (2–3 sprints): P1 items 5–7, P2 item 8
- Milestone 3 (1–2 sprints): P2 items 9–10, P3 items 11–13
- Milestone 4+: P4 expansion items 14–16
