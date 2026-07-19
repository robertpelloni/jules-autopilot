//go:build windows

package services

import (
	"encoding/json"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

var trayOnce sync.Once

// GetTraySummary returns a snapshot for the tray icon.
func GetTraySummary() *TraySummary {
	summary := &TraySummary{
		Status:        "unknown",
		SessionsByRaw: map[string]int{},
	}

	// Queue stats
	var pendingCount, processingCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processingCount)
	summary.PendingJobs = int(pendingCount)
	summary.ProcessingJobs = int(processingCount)

	// Nudge / failure counts in last 5 minutes
	since := time.Now().Add(-5 * time.Minute)
	var nudgeCount, failCount int64
	db.DB.Model(&models.KeeperLog{}).Where("type = ? AND created_at > ?", "action", since).Count(&nudgeCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ? AND updated_at > ?", "failed", since).Count(&failCount)
	summary.NudgesLast5m = int(nudgeCount)
	summary.FailuresLast5m = int(failCount)

	// Session breakdown
	var sessions []models.JulesSession
	db.DB.Find(&sessions)
	for _, s := range sessions {
		summary.SessionsByRaw[s.RawState]++
	}
	if len(sessions) > 0 {
		summary.Status = "running"
	} else {
		summary.Status = "idle"
	}

	// Last 20 keeper events
	var logs []models.KeeperLog
	db.DB.Order("created_at desc").Limit(20).Find(&logs)
	for _, l := range logs {
		summary.Events = append(summary.Events, TrayEvent{
			Time:    l.CreatedAt.Format(time.RFC3339),
			Type:    l.Type,
			Message: l.Message,
		})
	}

	return summary
}

// StartTray launches the Windows tray icon with activity display.
func StartTray() {
	trayOnce.Do(func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Tray] CRASH: %v", r)
			}
		}()

		trayExe := findTrayExe()
		if trayExe == "" {
			log.Printf("[Tray] trayicon.exe not found — skipping")
			return
		}

		// Kill any stale trayicon.exe via PowerShell to avoid console flash
		_ = exec.Command("powershell", "-NoProfile", "-WindowStyle", "Hidden",
			"-Command", "Stop-Process -Name trayicon -Force -ErrorAction SilentlyContinue").Run()

		// Write a temp JSON config so the tray knows where the API is
		configDir := filepath.Join(os.TempDir(), "jules-autopilot-tray")
		_ = os.MkdirAll(configDir, 0755)
		configPath := filepath.Join(configDir, "config.json")
		config := map[string]string{
			"apiUrl": "http://localhost:8082",
		}
		if data, err := json.Marshal(config); err == nil {
			_ = os.WriteFile(configPath, data, 0644)
		}

		// Use PowerShell to start trayicon.exe silently (console apps still flash with HideWindow)
		cmd := exec.Command("powershell", "-NoProfile", "-WindowStyle", "Hidden",
			"-Command", "Start-Process", "-FilePath", trayExe, "-WindowStyle", "Hidden")
		if err := cmd.Start(); err != nil {
			log.Printf("[Tray] Failed: %v", err)
		} else {
			log.Printf("[Tray] Started trayicon via PowerShell")
		}
	})
}

func findTrayExe() string {
	// Look relative to the running executable first
	exe, err := os.Executable()
	if err == nil {
		candidate := filepath.Join(filepath.Dir(exe), "trayicon.exe")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	// Fall back to the services directory
	candidate := filepath.Join(getScriptDir(), "trayicon.exe")
	if _, err := os.Stat(candidate); err == nil {
		return candidate
	}
	return ""
}

func getScriptDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(exe)
}
