# Shadow Pilot — Autonomous Vulnerability & Regression Scanner

## Overview
The Shadow Pilot is an autonomous background agent that continuously monitors the codebase for regressions and zero-day vulnerabilities. It scans repositories at scheduled intervals, runs static analysis and dependency checks, creates automated fix sessions when issues are found, and integrates with the existing notification center and audit trail.

## Goals
- Proactive detection of security vulnerabilities and regressions before they reach production
- Automated fix session creation for critical issues
- Integration with existing WebSocket real-time notifications
- Dashboard UI for viewing scan history and results
- Minimal performance impact on the main backend

---

## 1. Database Schema — `VulnerabilityRecord`

A new model stored in the existing SQLite database via GORM AutoMigrate.

| Column | Type | Description |
|--------|------|-------------|
| ID | string (UUID) | Primary key |
| SourceID | string | Repo source ID (e.g. `robertpelloni/borg`) |
| Type | string | `dependency`, `static_analysis`, `secret_scan`, `regression` |
| Severity | string | `critical`, `high`, `medium`, `low`, `info` |
| Title | string | Short human-readable title |
| Description | string | Detailed description of the issue |
| FilePath | string | Affected file path (optional) |
| CVE | string | CVE identifier (for dependency vulns) |
| FixVersion | string | Safe version to upgrade to |
| Remediation | string | Steps to fix the issue |
| Status | string | `open`, `in_progress`, `fixed`, `false_positive`, `wontfix` |
| FixSessionID | *string | Jules session ID that was created to fix this |
| Score | float64 | CVSS score or custom severity score (0-10) |
| DetectedAt | time.Time | When the vulnerability was first detected |
| ResolvedAt | *time.Time | When the vulnerability was resolved |
| CreatedAt | time.Time | Record creation timestamp |
| UpdatedAt | time.Time | Last update timestamp |

**Indexes:**
- `source_id` + `status` composite index for listing
- `severity` index for filtering
- `type` index for filtering

---

## 2. Backend Service — `shadow_pilot.go`

### 2.1 Service Structure
A singleton service (`ShadowPilot`) similar to the Daemon and Scheduler pattern:

```go
type ShadowPilot struct {
    isRunning  bool
    stopChan   chan struct{}
    mu         sync.Mutex
    scanTicker *time.Ticker
}
```

### 2.2 Scanning Loop
- Scheduled via the existing `Scheduler` (e.g. every 6 hours)
- Manual trigger via `POST /api/shadow/scan`
- Scans all known repositories (from `RepoPath` table)
- Runs up to 3 scanner types per session, each in a controlled goroutine

### 2.3 Scanner Types (Phase 1 — MVP)
Three pluggable scanners:

1. **Dependency Scanner**
   - Runs `govulncheck ./...` on backend-go
   - Runs `npm audit` on the frontend (if `package.json` exists)
   - Parses JSON output, creates `VulnerabilityRecord` entries
   - Stores CVE, severity, fix version

2. **Static Analysis Scanner**
   - Runs `go vet ./...` and `staticcheck ./...` on backend
   - Scans for common security misconfigurations
   - Flags hardcoded secrets via regex patterns
   - Outputs to `VulnerabilityRecord` with type `static_analysis`

3. **Regression Scanner** (Phase 2)
   - Compares current test results against baseline
   - Reports failing tests that were previously passing
   - Not yet implemented — placeholder stub

### 2.4 Auto-Fix Session Creation
- For `critical`/`high` severity issues, the Shadow Pilot creates a Jules session:
  - Session title: `[Shadow Pilot] Fix {title}`
  - Session prompt includes vulnerability details and remediation steps
  - The `FixSessionID` is stored on the `VulnerabilityRecord`
- Notification is emitted via WebSocket (`shadow_vulnerability_detected`)

### 2.5 LLM Integration (Phase 2)
- Future enhancement: use LLM to analyze vulnerability context and generate fix suggestions
- Not part of initial MVP

---

## 3. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/shadow/scan` | Trigger an immediate scan |
| `GET` | `/api/shadow/issues` | List all vulnerability records |
| `GET` | `/api/shadow/issues/:id` | Get a single vulnerability |
| `PATCH` | `/api/shadow/issues/:id` | Update status (dismiss, mark fixed, etc.) |
| `GET` | `/api/shadow/stats` | Get summary statistics |

### 3.1 Response Formats

**POST /api/shadow/scan**
```json
{
  "status": "scanning",
  "startedAt": "2026-06-13T12:00:00Z",
  "message": "Shadow Pilot scan initiated"
}
```

**GET /api/shadow/issues**
```json
{
  "total": 15,
  "critical": 2,
  "high": 5,
  "medium": 4,
  "low": 4,
  "results": [
    {
      "id": "uuid",
      "type": "dependency",
      "severity": "critical",
      "title": "CVE-2024-1234 in github.com/gin-gonic/gin",
      "cve": "CVE-2024-1234",
      "fixVersion": "v1.10.0",
      "status": "open",
      "score": 9.1,
      "detectedAt": "2026-06-13T12:00:00Z"
    }
  ]
}
```

---

## 4. Frontend Indicators

### 4.1 Fleet Intelligence Block
Add a new block in the existing Fleet Intelligence dashboard:

```
┌─────────────────────────────────────┐
│ Shadow Pilot                        │
│ ─────────────────────────────────── │
│ 2 Critical  5 High  3 Medium  4 Low │
│ [View Issues] [Run Scan]           │
│ Last scan: 12 min ago               │
│ Next scan: in 5h 48m                │
└─────────────────────────────────────┘
```

### 4.2 Dedicated Shadow Tab (Phase 2)
- New top-level navigation item: "Shadow"
- Table view of all vulnerability records with filtering
- Severity badges with color coding
- One-click fix session creation

---

## 5. Configuration

### 5.1 KeeperSettings Extension
Add new fields to `KeeperSettings`:

| Field | Default | Description |
|-------|---------|-------------|
| `ShadowPilotEnabled` | `false` | Master toggle |
| `ShadowScanIntervalHours` | `6` | How often to scan (hours) |
| `ShadowAutoFix` | `false` | Auto-create fix sessions |
| `ShadowMinSeverity` | `medium` | Minimum severity for auto-fix |

### 5.2 Environment Variables (Optional)
- `SHADOW_PILOT_ENABLED` — override master toggle
- `SHADOW_SCAN_INTERVAL` — override scan interval

---

## 6. Security Considerations
- Scanners run locally — no data leaves the machine
- `npm audit` and `govulncheck` output is parsed and stored locally
- Auto-fix sessions respect existing API rate limits
- False positives can be dismissed via API

---

## 7. Implementation Order

### Phase 1 (Current — MVP)
1. ✅ Implementation plan (this document)
2. Add `VulnerabilityRecord` model + AutoMigrate
3. Create `shadow_pilot.go` with scanner infrastructure
4. Implement dependency scanner (`govulncheck`, `npm audit`)
5. Register scheduled scan task
6. Add `POST /api/shadow/scan` endpoint
7. Add `GET /api/shadow/issues` endpoint
8. WebSocket notification on critical findings
9. Frontend indicator block on Fleet Intelligence page

### Phase 2 — Enhancements
- Static analysis scanner (go vet, staticcheck, secret scan)
- LLM-powered fix suggestions
- Dedicated Shadow tab in navigation
- Regression scanner (test baseline comparison)
- Auto-fix sessions for high severity issues

---

## 8. Testing Strategy
- Unit tests for scanner result parsing
- Integration tests for API endpoints
- Mock scanner for deterministic test results
- Test auto-fix session creation with mock Jules client

---

## 9. Monitoring & Observability
- Scan duration tracked in `audit_entries` with action `shadow_scan`
- Vulnerabilities logged to existing notification system
- Scheduler task `shadow_scan` visible in `/api/system/tasks`
- Health check validates Shadow Pilot service is running
