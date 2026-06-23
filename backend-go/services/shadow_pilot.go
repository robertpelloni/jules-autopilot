package services

import (
    "bytes"
    "encoding/json"
    "fmt"
    "log"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "sync"
	"time"

	"regexp"
	"strconv"

    "github.com/google/uuid"
    "github.com/jules-autopilot/backend/db"
    "github.com/jules-autopilot/backend/models"
)

// ShadowPilot is the core service responsible for scanning codebases for
// vulnerabilities and regressions. It is instantiated as a singleton via
// GetShadowPilot().
type ShadowPilot struct {
    isRunning bool
    mu        sync.Mutex
}

var (
    shadowPilot     *ShadowPilot
    shadowPilotOnce sync.Once
)

func GetShadowPilot() *ShadowPilot {
    shadowPilotOnce.Do(func() {
        shadowPilot = &ShadowPilot{}
    })
    return shadowPilot
}

// RunNow triggers an immediate scan. It is safe to call from the API
// endpoint and from the scheduler.
func (sp *ShadowPilot) RunNow() {
    sp.mu.Lock()
    if sp.isRunning {
        sp.mu.Unlock()
        log.Println("[ShadowPilot] Scan already in progress – ignoring trigger")
        return
    }
    sp.isRunning = true
    sp.mu.Unlock()

    go func() {
        defer func() {
            sp.mu.Lock()
            sp.isRunning = false
            sp.mu.Unlock()
        }()
        sp.runScan()
    }()
}

// runScan performs all configured scans and records any findings.
func (sp *ShadowPilot) runScan() {
    log.Println("[ShadowPilot] Starting scan")
    // Load settings – use defaults if missing
    var settings models.ShadowPilotSettings
    if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
        // Use safe defaults
        settings = models.ShadowPilotSettings{IsEnabled: true, ScanIntervalHours: 6, AutoFix: false, MinSeverity: "medium"}
    }
    if !settings.IsEnabled {
        log.Println("[ShadowPilot] Disabled via settings – aborting scan")
        return
    }

    // Scan all known repositories (RepoPath entries)
    var repos []models.RepoPath
    if err := db.DB.Find(&repos).Error; err != nil {
        log.Printf("[ShadowPilot] Failed to fetch repo paths: %v", err)
        return
    }
    for _, rp := range repos {
        sp.scanRepository(rp)
    }
    log.Println("[ShadowPilot] Scan completed")
}

// scanRepository runs configured scanners for a single repository.
func (sp *ShadowPilot) scanRepository(rp models.RepoPath) {
    // Git Diff Monitoring
    sp.monitorGitDiffs(rp)

    // Dependency scanner – Go for backend-go, npm for frontend if package.json exists
    if strings.Contains(strings.ToLower(rp.LocalPath), "backend-go") {
        sp.runGovulncheck(rp)
    }
    // If a package.json exists in the repo root, run npm audit
    pkgJSON := filepath.Join(rp.LocalPath, "package.json")
    if _, err := os.Stat(pkgJSON); err == nil {
        sp.runNpmAudit(rp)
    }
    // Additional scanners (static analysis) can be added here.
}

func (sp *ShadowPilot) monitorGitDiffs(rp models.RepoPath) {
    cmd := exec.Command("git", "diff", "--stat")
    hideWindow(cmd)
    cmd.Dir = rp.LocalPath
    var out bytes.Buffer
    cmd.Stdout = &out
    if err := cmd.Run(); err != nil {
        log.Printf("[ShadowPilot] git diff --stat failed for %s: %v", rp.SourceID, err)
        return
    }

    stat := out.String()
    if strings.TrimSpace(stat) == "" {
        return
    }

    insertions := extractStatNumber(stat, "insertion")
    deletions := extractStatNumber(stat, "deletion")

    if insertions > 50 || deletions > 50 {
        severity := "low"
        if insertions > 200 || deletions > 200 {
            severity = "medium"
        }

        // Regression detection: large deletions with few insertions
        isRegression := deletions > 100 && insertions < 10
        if isRegression {
            severity = "high"
        }

        title := fmt.Sprintf("Significant changes in %s", rp.SourceID)
        if isRegression {
            title = fmt.Sprintf("Potential regression in %s", rp.SourceID)
        }

        anomaly := models.AnomalyRecord{
            ID:          uuid.New().String(),
            Type:        "git_diff",
            Severity:    severity,
            Title:       title,
            Description: fmt.Sprintf("%d insertions(+), %d deletions(-) detected in %s", insertions, deletions, rp.SourceID),
            Metadata:    &stat,
            IsResolved:  false,
            CreatedAt:   time.Now(),
        }

        // Dedupe: don't create multiple anomalies for same repo within 1 hour
        var existing models.AnomalyRecord
        err := db.DB.Where("type = ? AND title = ? AND is_resolved = ? AND created_at > ?",
            "git_diff", title, false, time.Now().Add(-1*time.Hour)).First(&existing).Error
        if err != nil {
            db.DB.Create(&anomaly)

            // Also notify
            notif := models.Notification{
                ID: uuid.New().String(),
                Type: "warning",
                Category: "shadow",
                Title: title,
                Message: anomaly.Description,
                SourceID: &rp.SourceID,
                Priority: 1,
                CreatedAt: time.Now(),
            }
            db.DB.Create(&notif)
        }
    }
}

// runGovulncheck executes `govulncheck ./...` and parses JSON output.
func (sp *ShadowPilot) runGovulncheck(rp models.RepoPath) {
    cmd := exec.Command("govulncheck", "-json", "./...")
    hideWindow(cmd)
    cmd.Dir = rp.LocalPath
    var out bytes.Buffer
    cmd.Stdout = &out
    if err := cmd.Run(); err != nil {
        log.Printf("[ShadowPilot] govulncheck failed for %s: %v", rp.SourceID, err)
        return
    }
    // govulncheck JSON output is a stream of records; we'll decode line‑by‑line.
    decoder := json.NewDecoder(&out)
    for decoder.More() {
        var rec struct {
            OSV struct {
                ID       string `json:"id"`
                Summary  string `json:"summary"`
                Details  string `json:"details"`
                Aliases  []string `json:"aliases"`
                Affected []struct {
                    Package struct {
                        Name string `json:"name"`
                    } `json:"package"`
                    Fixed string `json:"fixed"`
                } `json:"affected"`
                Severity string `json:"severity"`
            } `json:"osv"`
        }
        if err := decoder.Decode(&rec); err != nil {
            break // finished parsing
        }
        // Use the first affected entry for package info.
        pkgName := ""
        fixVersion := ""
        if len(rec.OSV.Affected) > 0 {
            pkgName = rec.OSV.Affected[0].Package.Name
            fixVersion = rec.OSV.Affected[0].Fixed
        }
        severity := strings.ToLower(rec.OSV.Severity)
        if severity == "" {
            severity = "medium"
        }
        vuln := models.VulnerabilityRecord{
            ID:          uuid.New().String(),
            SourceID:    rp.SourceID,
            Type:        "dependency",
            Severity:    severity,
            Title:       fmt.Sprintf("%s – %s", pkgName, rec.OSV.ID),
            Description: rec.OSV.Summary,
            CVE:         nil,
            FixVersion:  nil,
            Remediation: nil,
            Status:      "open",
            DetectedAt:  time.Now(),
            CreatedAt:   time.Now(),
            UpdatedAt:   time.Now(),
        }
        if fixVersion != "" {
            vuln.FixVersion = &fixVersion
        }
        // Save (upsert on SourceID + Title)
        var existing models.VulnerabilityRecord
        if err := db.DB.First(&existing, "source_id = ? AND title = ?", rp.SourceID, vuln.Title).Error; err == nil {
            // Already known – update timestamp and status if needed
            db.DB.Model(&existing).Updates(map[string]interface{}{"updated_at": time.Now()})
        } else {
            db.DB.Create(&vuln)
        }
    }
}

// runNpmAudit runs `npm audit --json` and parses results.
func (sp *ShadowPilot) runNpmAudit(rp models.RepoPath) {
    // Ensure npm is available; otherwise skip.
    cmd := exec.Command("npm", "audit", "--json")
    hideWindow(cmd)
    cmd.Dir = rp.LocalPath
    var out bytes.Buffer
    cmd.Stdout = &out
    if err := cmd.Run(); err != nil {
        // npm audit returns non‑zero exit on vulnerabilities – treat as success.
        // However, a true execution error should be logged.
        if exitErr, ok := err.(*exec.ExitError); ok {
            // Non‑zero exit code is expected when vulnerabilities are found.
            _ = exitErr // ignore
        } else {
            log.Printf("[ShadowPilot] npm audit failed for %s: %v", rp.SourceID, err)
            return
        }
    }
    var audit struct {
        Advisories map[string]struct {
            ModuleName string   `json:"module_name"`
            Severity   string   `json:"severity"`
            Title      string   `json:"title"`
            Overview   string   `json:"overview"`
            Recommendation string `json:"recommendation"`
            Findings []struct {
                Version string `json:"version"`
                Paths   []string `json:"paths"`
                Dev    bool   `json:"dev"`
                Culprit string `json:"culprit"`
            } `json:"findings"`
            CVSS struct {
                Score float64 `json:"score"`
            } `json:"cvss"`
            Id string `json:"id"`
            FixedVersion string `json:"fixAvailable"`
        } `json:"advisories"`
    }
    if err := json.Unmarshal(out.Bytes(), &audit); err != nil {
        log.Printf("[ShadowPilot] Failed to parse npm audit output for %s: %v", rp.SourceID, err)
        return
    }
    for _, adv := range audit.Advisories {
        severity := strings.ToLower(adv.Severity)
        vuln := models.VulnerabilityRecord{
            ID:          uuid.New().String(),
            SourceID:    rp.SourceID,
            Type:        "dependency",
            Severity:    severity,
            Title:       fmt.Sprintf("%s – %s", adv.ModuleName, adv.Id),
            Description: adv.Overview,
            CVE:         nil,
            FixVersion:  nil,
            Remediation: &adv.Recommendation,
            Status:      "open",
            DetectedAt:  time.Now(),
            CreatedAt:   time.Now(),
            UpdatedAt:   time.Now(),
        }
        if adv.CVSS.Score > 0 {
            vuln.Score = adv.CVSS.Score
        }
        if adv.FixedVersion != "" {
            vuln.FixVersion = &adv.FixedVersion
        }
        // Upsert similar to govulncheck handling
        var existing models.VulnerabilityRecord
        if err := db.DB.First(&existing, "source_id = ? AND title = ?", rp.SourceID, vuln.Title).Error; err == nil {
            db.DB.Model(&existing).Updates(map[string]interface{}{"updated_at": time.Now()})
        } else {
            db.DB.Create(&vuln)
        }
    }
}

// createFixSession creates a Jules session to address a vulnerability.
func (sp *ShadowPilot) createFixSession(vuln *models.VulnerabilityRecord) {
    // Build a minimal prompt containing vulnerability details.
    prompt := fmt.Sprintf("You are an autonomous fixer. Resolve the following vulnerability:\n\nTitle: %s\nDescription: %s\nSeverity: %s\nRemediation: %s\n",
        vuln.Title, vuln.Description, vuln.Severity, func() string { if vuln.Remediation != nil { return *vuln.Remediation } else { return "" } }())
    // Create a Jules session via the existing queue mechanism.
    // Reuse the existing helper function to enqueue a session creation job.
    // For simplicity we directly insert a QueueJob of type "create_session" with payload.
    payloadStruct := struct {
        Title   string `json:"title"`
        Prompt  string `json:"prompt"`
        SourceID string `json:"sourceId"`
    }{
        Title:   fmt.Sprintf("[Shadow Pilot] Fix %s", vuln.Title),
        Prompt:  prompt,
        SourceID: vuln.SourceID,
    }
    payloadBytes, _ := json.Marshal(payloadStruct)
    job := models.QueueJob{ID: uuid.New().String(), Type: "create_session", Payload: string(payloadBytes), Status: "pending", RunAt: time.Now()}
    db.DB.Create(&job)
    // Store the job ID as FixSessionID placeholder (will be updated later by session creation flow).
    vuln.FixSessionID = &job.ID
    db.DB.Save(vuln)
    // Emit a notification for UI.
    notif := models.Notification{
        ID:          uuid.New().String(),
        Type:        "action",
        Category:    "shadow",
        Title:       "Shadow Pilot detected vulnerability",
        Message:     fmt.Sprintf("%s (%s) – severity %s", vuln.Title, vuln.SourceID, vuln.Severity),
        SessionID:   nil,
        SourceID:    &vuln.SourceID,
        IsRead:      false,
        Priority:    1,
        CreatedAt:   time.Now(),
    }
    db.DB.Create(&notif)
}

// AutoFixHighSeverity scans for high/critical records and triggers sessions if enabled.
func (sp *ShadowPilot) autoFixIfEnabled() {
    var settings models.ShadowPilotSettings
    if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
        return
    }
    if !settings.AutoFix {
        return
    }
    var vulns []models.VulnerabilityRecord
    // Simple severity filter – treat critical/high as auto‑fix
    if err := db.DB.Where("severity IN ? AND status = ?", []string{"critical", "high"}, "open").Find(&vulns).Error; err != nil {
        return
    }
    for i := range vulns {
        sp.createFixSession(&vulns[i])
    }
}

// Public function used by Scheduler.
func RunShadowScan() {
    GetShadowPilot().RunNow()
}

// TriggerAutoFix can be called after a scan to optionally generate sessions.
func TriggerAutoFix() {
    GetShadowPilot().autoFixIfEnabled()
}

// IsShadowPilotRunning returns true if a scan is currently in progress.
func IsShadowPilotRunning() bool {
    sp := GetShadowPilot()
    sp.mu.Lock()
    defer sp.mu.Unlock()
    return sp.isRunning
}

// GetShadowPilotStatus returns a simple map with the current running state.
func GetShadowPilotStatus() map[string]interface{} {
    sp := GetShadowPilot()
    sp.mu.Lock()
    defer sp.mu.Unlock()
    return map[string]interface{}{"running": sp.isRunning}
}

// StartShadowPilot triggers a scan (or no‑op if already running).
func StartShadowPilot() {
    sp := GetShadowPilot()
    sp.mu.Lock()
    already := sp.isRunning
    sp.mu.Unlock()
    if already {
        // Already running – do nothing.
        return
    }
    sp.RunNow()
}

// StopShadowPilot forces the running flag to false. The scan goroutine will
// check this flag on completion, but for testing we simply clear it.
func StopShadowPilot() {
    sp := GetShadowPilot()
    sp.mu.Lock()
    sp.isRunning = false
    sp.mu.Unlock()
}

// extractStatNumber parses a git diff stat line to extract the numeric value
// for a given keyword (e.g. "insertion" → 10 from "10 insertions(+)").
func extractStatNumber(stat string, keyword string) int {
    re := regexp.MustCompile(`(\d+)\s+` + regexp.QuoteMeta(keyword) + `s?`)
    matches := re.FindStringSubmatch(stat)
    if len(matches) < 2 {
        return 0
    }
    n, err := strconv.Atoi(matches[1])
    if err != nil {
        return 0
    }
    return n
}
