# Session Handoff: Full-Project Deep Audit and Execution Baseline

**Date:** 2026-02-16
**Scope:** End-to-end audit of backend/frontend/UI/docs and implementation drift.
**Goal:** Identify unfinished/partial/unwired/unpolished areas and produce an execution-grade plan for follow-on models.

## What was done in this session

1. Loaded and followed instruction hierarchy before making decisions:
    - `LLM_INSTRUCTIONS.md`
    - root `AGENTS.md`
    - scoped `AGENTS.md` files in `components/`, `packages/shared/src/orchestration/`, `external/`, and relevant `external/*` folders.
2. Performed broad repo discovery for placeholders/mocks/stubs and status claims.
3. Performed direct file verification over key implementation surfaces (APIs, providers, dashboards, settings, auth, templates, tests).
4. Cross-checked implementation against major docs and archived handoffs to detect drift.
5. Rewrote planning docs to be reality-aligned:
    - updated `ROADMAP.md`
    - created `TODO.md` (dependency-ordered, detailed backlog)
    - replaced this `HANDOFF.md` with current audit findings and execution guidance.

## Evidence-backed findings (high signal)

### 1) Documentation drift exists

- Version mismatch was detected across version files and package metadata.
- Multiple docs imply completion where code remains partial/mock.

Impact:
- Teams and downstream models can prioritize incorrectly.

### 2) Multi-provider architecture is real, but provider completeness is uneven

- Provider abstraction and store exist (`types`, registry, transfer/service scaffolding).
- `JulesProvider` is the only materially complete provider path.
- Most other providers still rely on stubs/mocks/not-implemented paths.

Impact:
- “Multi-provider complete” is overstated; operational behavior is provider-asymmetric.

### 3) Plugin system is currently simulated in UI

- `/plugins` page uses static catalog data + local install simulation.
- No full backend/plugin runtime lifecycle in place.

Impact:
- Marketplace appears functional but does not represent production plugin execution.

### 4) Submodule observability surfaces include placeholders/mock streams

- Submodule detail page has explicit placeholder actions/config-unavailable states.
- Task queue/MCP/terminal stream dashboards include mock/demo-style data paths.

Impact:
- Operator confidence can be overstated without explicit preview labels.

### 5) API surface split-brain (Next routes and daemon overlap)

- Similar domains exist in both Next API routes and Bun daemon routes.
- Some clients use direct daemon URL calls where Next routes also exist.

Impact:
- Increased maintenance burden and risk of behavior divergence.

### 6) Auth model is improved, but UX/docs messaging is inconsistent

- Cookie/JWT auth middleware/session routes are present.
- Some UI/docs text still references localStorage-centric key handling.

Impact:
- Security posture communication is inconsistent and potentially confusing.

## Files and areas inspected (representative, not exhaustive)

### Docs and status sources
- `README.md`
- `ROADMAP.md`
- `HANDOFF.md` (previous)
- `VISION.md`
- `docs/VISION_MASTER.md`
- `docs/PRD.md`
- `docs/USER_GUIDE.md`
- `CHANGELOG.md`
- `VERSION`, `VERSION.md`, `package.json`

### APIs and backend
- `app/api/supervisor/route.ts`
- `app/api/debate/route.ts`
- `app/api/debate/history/route.ts`
- `app/api/debate/[id]/route.ts`
- `app/api/review/route.ts`
- `app/api/memory/route.ts`
- `app/api/templates/route.ts`
- `app/api/templates/[id]/route.ts`
- `app/api/settings/keeper/route.ts`
- `app/api/system/status/route.ts`
- `app/api/system/submodules/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/logout/route.ts`
- `server/index.ts`
- `server/daemon.ts`
- `terminal-server/server.js`

### UI/feature surfaces
- `components/new-session-dialog.tsx`
- `components/provider-selector.tsx`
- `components/providers-dashboard.tsx`
- `components/transfer-session-dialog.tsx`
- `components/transfer-progress.tsx`
- `components/session-keeper-settings-content.tsx`
- `components/session-keeper-manager.tsx`
- `components/submodule-dashboard.tsx`
- `components/submodules/task-queue-dashboard.tsx`
- `components/submodules/mcp-server-dashboard.tsx`
- `components/submodules/terminal-stream.tsx`
- `app/plugins/page.tsx`
- `app/system/submodules/[name]/page.tsx`
- `components/settings-dialog.tsx`
- `app/settings/account/page.tsx`
- `components/templates-page.tsx`

### Cloud provider architecture
- `lib/cloud-dev/providers/base.ts`
- `lib/cloud-dev/providers/index.ts`
- `lib/cloud-dev/providers/jules.ts`
- `lib/cloud-dev/providers/devin.ts`
- `lib/cloud-dev/providers/manus.ts`
- `lib/cloud-dev/providers/openhands.ts`
- `lib/cloud-dev/providers/github-spark.ts`
- `lib/cloud-dev/providers/blocks.ts`
- `lib/cloud-dev/providers/claude-code.ts`
- `lib/cloud-dev/providers/codex.ts`
- `lib/cloud-dev/transfer.ts`
- `lib/stores/cloud-dev.ts`
- `types/cloud-dev.ts`

### Auth/session internals and tests
- `middleware.ts`
- `lib/session.ts`
- `tests/api.spec.ts`
- `tests/orchestration.spec.ts`
- `tests/smoke.spec.ts`

## Deliverables produced in this session

1. `ROADMAP.md` re-baselined with accurate status categories:
    - implemented foundations
    - partial/wiring-required
    - not implemented
    - phased priorities

2. New `TODO.md` created with dependency-ordered execution plan:
    - P0: architecture truth and API consolidation
    - P1: product correctness (dashboards/plugins/providers)
    - P2: security/error/observability hardening
    - P3: testing and quality gates
    - P4: expansion items (OAuth, plugin ecosystem, smart routing)

3. This `HANDOFF.md` rewritten to provide evidence-backed context for next implementor.

## Continuation updates (post-baseline implementation)

The following P0/P2-aligned changes were implemented after the initial baseline write:

1. **Version synchronization guard implemented and enforced**
    - Added `scripts/check-version-sync.js` to validate consistency across:
      - `VERSION.md`
      - `VERSION`
      - `package.json`
      - `lib/version.ts`
    - Added scripts in `package.json`:
      - `check-version`
      - `update-version`
    - Updated `.github/workflows/ci.yml` to run version check as a dedicated gating job before lint/test/build.
    - Aligned version values to `0.8.8` in `package.json` and `lib/version.ts`.

2. **Encoding-hardening for version files**
    - `VERSION` was UTF-16LE BOM encoded; guard now handles BOM-aware decoding.
    - Eliminated false mismatch failures in local/CI checks.

3. **Script runtime cleanup**
    - Converted `scripts/check-version-sync.js` and `scripts/update-version.js` to CommonJS style (`require`) to avoid Node module-type warnings in this repo configuration.

4. **API ownership cleanup: template domain**
    - `lib/jules/client.ts` template CRUD now targets canonical app routes (`/api/templates*`) instead of hardcoded daemon URL.

5. **API ownership cleanup: supervisor clear-memory path**
    - Added `app/api/supervisor/clear/route.ts`.
    - Updated `components/session-keeper-settings-content.tsx` to use `/api/supervisor/clear`.

6. **API ownership cleanup: keeper settings path**
    - Updated `lib/stores/session-keeper.ts` to use `/api/settings/keeper` for settings read/write (canonical route).

7. **API ownership cleanup: debate domain (UI consumers)**
    - Updated components to use first-party app routes:
      - `components/debate-dialog.tsx` → `/api/debate`
      - `components/debate-details-dialog.tsx` → `/api/debate/:id`
      - `components/debate-history-list.tsx` → `/api/debate/history`, `/api/debate/:id`

8. **Daemon endpoint centralization**
    - Added `lib/config/daemon.ts` with centralized:
      - `DAEMON_HTTP_BASE_URL`
      - `DAEMON_WS_URL`
    - Updated:
      - `lib/stores/session-keeper.ts`
      - `lib/hooks/use-daemon-websocket.ts`
      - `components/submodules/terminal-stream.tsx`
    - Result: no hardcoded `localhost:8080` literals remain in active app call sites (only centralized defaults in config).

9. **Auth UX consistency improvement**
    - Updated `app/settings/account/page.tsx` security copy to reflect session-cookie auth flow.
    - Removed stale localStorage storage claim for Jules key on this page.
    - Added explicit “Clear Session” action via existing auth logout flow.

10. **Session activity loading reliability fix (broadcast visibility impact)**
        - Symptom: clicking sessions could show “loading activities” and then an empty feed; broadcasted messages appeared missing.
        - Root cause: `JulesClient` activity/session endpoints were brittle for certain session ID formats and first-page pagination (`pageToken=0` sent on initial load).
        - Fixes in `lib/jules/client.ts`:
            - Added session ID normalization (`sessions/<id>` → `<id>`) for session-scoped routes.
            - Updated session-scoped methods to use normalized IDs (`getSession`, `updateSession`, `listActivities`, `createActivity`, `listArtifacts`, `getArtifact`, `approvePlan`).
            - Changed first-page activity fetch to omit `pageToken` unless offset > 0.
            - Added tolerance for activity responses returned either as `{ activities: [...] }` or direct array.
        - Validation: `pnpm test lib/jules/client.test.ts` passed.

11. **Broadcast delivery UX hardening**
        - Updated `components/broadcast-dialog.tsx` to provide explicit result feedback:
            - Success toast when all session sends succeed.
            - Warning toast for partial success.
            - Error toast when all sends fail or no target sessions exist.
        - Added `triggerRefresh()` call after at least one successful broadcast send so session/activity views refresh immediately.

    12. **Broadcast transient-failure resilience**
        - Enhanced `components/broadcast-dialog.tsx` with retry-once delivery semantics per target session.
        - Added partial-failure preview in warning toast (shows failed session names/IDs summary).
        - Keeps behavior non-blocking: successful sessions continue even when some targets fail.

    13. **Broadcast in-dialog delivery reporting**
        - Enhanced `components/broadcast-dialog.tsx` with a post-send delivery report panel.
        - Report shows total targets, successful deliveries, and failed session names/IDs.
        - Dialog now stays open when failures occur so operators can review failed targets immediately.

    14. **Broadcast retry-failed-only action**
        - Added `Retry Failed Only` action in `components/broadcast-dialog.tsx`.
        - Retry targeting is ID-safe (tracks failed session IDs, not only labels).
        - Retry updates delivery report and toasts; closes dialog automatically when retry resolves all failures.

    15. **Broadcast copy-failed-IDs utility**
        - Added `Copy Failed IDs` action in `components/broadcast-dialog.tsx`.
        - Copies failed target session IDs (newline-delimited) for quick diagnostics/replay workflows.

    16. **Broadcast non-blocking background retry mode**
        - Added `Retry Failed in Background` action in `components/broadcast-dialog.tsx`.
        - Background retry executes failed-target replay via separate state (`isBackgroundRetrying`) without reusing blocking send-progress flow.
        - Added in-report spinner/status while background retry is active.
        - Preserved delivery feedback contract:
            - success/partial/fail toasts on completion,
            - `triggerRefresh()` after any successful retry delivery,
            - dialog auto-close only when all retried targets succeed.

    17. **Background retry progress visibility**
        - Added live retry progress counters in `components/broadcast-dialog.tsx`:
            - `backgroundRetryCompleted`
            - `backgroundRetryTotal`
        - Delivery report now shows live status text during background retry (`running… X/Y`) so operators can track completion in real time.

    18. **Reopen-safe failed-target replay**
        - Added persisted failed-target memory in `components/broadcast-dialog.tsx`:
            - `lastFailedSessionIds`
            - `lastFailedMessage`
        - Failed session IDs and last broadcast message are retained across dialog close/reopen within the same tab session.
        - Added `Retry Recovered Failed` action so operators can recover from accidental dialog close and replay failed targets immediately.
        - Added contextual UI notice (`Recovered failed targets`) when recovered failures are available.

    19. **Recovered-state operator cleanup control**
        - Added `Clear Recovered` action in `components/broadcast-dialog.tsx` for the recovered-failures state block.
        - Operators can now explicitly discard stale recovered target/message context without sending another broadcast.
        - Clearing emits success feedback and resets recovered retry state immediately.

    20. **Recovered-state staleness indicator**
        - Added recovered timestamp tracking (`lastFailedAt`) in `components/broadcast-dialog.tsx` when failed targets are persisted.
        - Recovered-failures card now displays relative age (`Recovered just now / Xs / Xm / Xh ago`) to help operators decide whether replay context is still relevant.
        - Added lightweight 30s refresh loop while dialog is open and recovered state exists to keep age text current.

    21. **Recovered target availability drift visibility**
        - Recovered-failures card now shows availability counts in `components/broadcast-dialog.tsx`:
            - total recovered failed targets
            - currently available retry targets
            - unavailable recovered targets
        - Added retry guard in UI by disabling `Retry Recovered Failed` when no recovered targets are currently available.
        - This makes session drift explicit before replay attempts and reduces avoidable error toasts.

    22. **Disabled-action clarity for recovered retry**
        - Added contextual helper text in `components/broadcast-dialog.tsx` when recovered retry is disabled due to zero available recovered sessions.
        - Operators now get immediate inline explanation instead of discovering the state only by button disabled behavior.

    23. **Recovered availability manual refresh action**
        - Added `Refresh Availability` action in recovered mode within `components/broadcast-dialog.tsx`.
        - Action triggers session refresh (`triggerRefresh`) with temporary in-button loading state and success feedback.
        - This reduces stale recovered-target availability windows before operators attempt retry.

    24. **Availability refresh recency indicator**
        - Added `lastAvailabilityRefreshAt` tracking in `components/broadcast-dialog.tsx`.
        - Recovered-failures card now displays relative recency (`Availability refreshed X ago`) alongside recovered-target age.
        - Recency labels stay current via existing lightweight periodic refresh loop while dialog is open.

    25. **Availability staleness warning badge**
        - Added stale-threshold detection in `components/broadcast-dialog.tsx` (`>60s` since last availability refresh).
        - Recovered-failures card now shows a `stale` badge next to refresh recency and a short inline recommendation to use `Refresh Availability` before retry.
        - Improves operator decision-making when recovered availability data may be outdated.

    26. **Auto-freshness update on recovered retry success**
        - Updated `components/broadcast-dialog.tsx` to set `lastAvailabilityRefreshAt` when recovered retry delivers to at least one target.
        - This clears stale-state signaling automatically after successful recovered replay attempts, without requiring a separate manual refresh step.

    27. **Recovered retry outcome memory**
        - Added `lastRecoveredRetryOutcome` state in `components/broadcast-dialog.tsx` to persist the most recent recovered retry result.
        - Recovered-failures card now shows: `Last recovered retry: X sent, Y failed (Z ago)`.
        - Outcome memory is cleared with recovered-state reset, preserving contextual relevance.

    28. **Copy recovery summary action**
        - Added `Copy Recovery Summary` action in recovered mode within `components/broadcast-dialog.tsx`.
        - Summary includes recovered target counts, current availability/unavailability counts, refresh recency, and last recovered-retry outcome when present.
        - Supports faster operator handoff/debug reporting without manually transcribing in-dialog status.

    29. **Recovered-mode auto-refresh toggle**
        - Added `Auto-refresh: On/Off` toggle in recovered mode within `components/broadcast-dialog.tsx`.
        - When enabled, dialog performs guarded silent refresh every 30s (`triggerRefresh`) and updates availability recency timestamp.
        - Auto-refresh pauses naturally during active send/background-retry/manual refresh states to avoid overlapping refresh operations.

    30. **Persistent auto-refresh preference**
        - Added localStorage-backed persistence for recovered auto-refresh toggle in `components/broadcast-dialog.tsx`.
        - Preference key: `jules.broadcast.recovered.autoRefresh`.
        - Dialog now restores operator toggle preference on load and saves updates automatically.

    31. **Recovered preference reset control**
        - Added `Reset Preferences` action in recovered mode within `components/broadcast-dialog.tsx`.
        - Action clears localStorage preference (`jules.broadcast.recovered.autoRefresh`) and resets auto-refresh toggle to default off.
        - Provides fast troubleshooting/reset path for operator workflow configuration.

    32. **Configurable auto-refresh interval (persisted)**
        - Added recovered-mode interval selector in `components/broadcast-dialog.tsx` with options: `15s`, `30s`, `60s`.
        - Interval preference is persisted via localStorage key `jules.broadcast.recovered.autoRefreshIntervalMs` and restored on load.
        - Auto-refresh loop now uses selected interval and respects existing guardrails (paused during send/background-retry/manual-refresh states).
        - `Reset Preferences` now clears both recovered-mode preference keys and restores default interval (`30s`).

    33. **Next auto-refresh countdown indicator**
        - Added recovered-mode countdown in `components/broadcast-dialog.tsx`: `Next auto-refresh in Xs`.
        - Tracks `nextAutoRefreshAt` and updates once per second while auto-refresh is enabled and active.
        - Countdown is rescheduled after each auto-refresh cycle and after manual recovered refresh.

    34. **Recovered-mode refresh hotkey (`R`)**
        - Added keyboard shortcut support in `components/broadcast-dialog.tsx` for recovered mode: press `R` to trigger availability refresh.
        - Shortcut is guarded to avoid conflicts while typing in inputs/textareas/contenteditable targets and when modifier keys are pressed.
        - Added inline hint text in recovered card for discoverability.

    35. **Recovered hotkey cooldown guard**
        - Added `R`-key cooldown in `components/broadcast-dialog.tsx` (`1.5s`) to prevent rapid repeated refresh triggers.
        - Hotkey refresh now runs in silent mode (no success toast spam) while preserving existing manual refresh feedback.
        - Recovered hint text now displays active cooldown state (`Xs cooldown`) when applicable.

    36. **Force refresh hotkey (`Shift+R`)**
        - Updated recovered-mode keyboard handling in `components/broadcast-dialog.tsx` to support `Shift+R` as a cooldown-bypass refresh shortcut.
        - Standard `R` continues to respect cooldown, while `Shift+R` allows immediate operator-triggered refresh during cooldown windows.
        - Inline shortcut hint now documents both actions for discoverability.

    37. **Force-refresh feedback signal**
        - Added explicit operator feedback for `Shift+R` in `components/broadcast-dialog.tsx` via lightweight `Force refresh triggered.` toast.
        - Standard `R` hotkey remains silent to avoid notification noise; only forced bypass events surface the feedback toast.

    38. **Force-refresh hotkey behavior finalized**
        - `Shift+R` now bypasses the `R` cooldown guard in `components/broadcast-dialog.tsx`, enabling immediate operator refresh during cooldown windows.
        - Inline recovered-mode shortcut hint updated to explicitly document both paths (`R` and `Shift+R`).

    39. **Force-refresh toast rate limiting**
        - Added dedicated toast cooldown for `Shift+R` feedback in `components/broadcast-dialog.tsx` (`3s`).
        - Prevents force-refresh notification spam during rapid repeated `Shift+R` usage while retaining immediate refresh behavior.

## Immediate next actions (for next model)

1. Execute `TODO.md` P0 items first (version truth + API ownership + doc harmonization).
2. Select and complete one non-Jules provider end-to-end before broad provider rollout.
3. Replace or explicitly label mock dashboards to avoid implicit production claims.
4. Normalize auth/credential messaging to match actual security architecture.
5. Expand automated tests in lockstep with each converted feature path.

## Risk register

- **Behavioral divergence risk:** dual API paths for same domain.
- **Product trust risk:** mock/demo visuals without clear labels.
- **Security perception risk:** stale localStorage messaging.
- **Delivery risk:** “complete” claims masking integration gaps.

## Notes for implementor models (Gemini/Claude/Codex)

- Treat `TODO.md` as canonical execution order.
- Do not mark items complete unless backend wiring + UI representation + tests are all present.
- Keep status taxonomy explicit: `implemented`, `partial`, `mock/demo`, `planned`.
- If introducing new endpoints, update docs and tests in the same change set.

