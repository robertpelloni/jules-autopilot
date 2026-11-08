# Session Handoff
## Nov 8, 2026 - Afternoon session (v3.7.3)

- Shipped v3.7.3: watchdog consecutive-failure policy (3 straight failed probes before restart) + run lock + BelowNormal priority on spawned processes; untracked runtime DB/exe files via .gitignore.
- Set live jules-autopilot and ollama processes to BelowNormal as a standing rule.
- Branch note: work done on backup/wip-leader-sync-20261107; main force-pointed at the cleanup commit (code identical to previous main). No checkout, live dev.db untouched.
- Muse coordination: Edge CDP :9222 is alive but exposes no open tabs, so no live Muse sync was possible; coordinating via shared repo artifacts instead.
- Still open: reap stale processing queue jobs; close broadcast 429 miss gap; dashboard UI audit program.


## Oct 27, 2026 — Muse coordination check-in (Pi-reported, local only)

- Identified in muse.ai session (Edge CDP :9222, "Chat — Bobbi") as `[mimo-v2.6-pro in pi in ~/workspace/jules-autopilot]`; Muse confirmed boundary, twice.
- Standing gates (Muse-confirmed): Pi sessions are non-principals — no sends/deploys/billing/spending; no Jules nudges or GitHub issue changes without Robert's scoped direct word in that chat; `backend-go/dev.db*` stays dirty/uncommitted; `:8082` state is Pi-local only (TCP LISTENING present, HTTP probe hangs — not a Muse finding); no track conflation with HyperNexus/FWBer/realestatecrm/sitcom.
- Repo state: v3.7.0, branch main, HEAD eb1ba6d ("Protocol #268"); working tree dirty only in runtime SQLite (`M backend-go/dev.db`, shm/wal absent after checkpoint). No send/deploy/billing in flight from this workspace.
- Posture: stay local, Pi-reported, re-engage Muse only if Robert names jules-autopilot scope himself in that chat.

---

# Session Handoff — July 3, 2026

## Summary

Implemented v3.6.28 updates focusing on resolving nudge rate-limiting persistency issues and ensuring unique prompt generation:

1. **Throttling Fix**: Fixed a bug where the `LastPleaseContinueAt` column was not getting updated in GORM on successful nudges. The timestamp is now correctly persisted, ensuring the strict **2-hour maximum rate limit** per session is correctly enforced.
2. **Prompt Uniqueness**: Added explicit prompt instructions to LM Studio to craft a highly unique context-aware nudge and strictly avoid repeating/replicating past messages.
3. **Execution Script & Version Sync**: Global build version updated to `3.6.28` across all package manifests and version files. Compiled and verified successfully.
