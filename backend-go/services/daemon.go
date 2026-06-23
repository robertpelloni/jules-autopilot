package services

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// Daemon represents the background monitoring loop
type Daemon struct {
	isRunning bool
	stopChan  chan struct{}
	mu        sync.Mutex
}

var (
	globalDaemon *Daemon
	daemonOnce   sync.Once
)

func GetDaemon() *Daemon {
	daemonOnce.Do(func() {
		globalDaemon = &Daemon{
			stopChan: make(chan struct{}),
		}
	})
	return globalDaemon
}

func (d *Daemon) Run() {
	d.mu.Lock()
	if d.isRunning {
		d.mu.Unlock()
		return
	}
	d.isRunning = true
	d.mu.Unlock()

	log.Println("[Daemon] Starting background monitoring loop...")

	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Daemon] CRASHED (top-level): %v", r)
		}
	}()

	for {
		stopped := d.tickAndWait()
		if stopped {
			d.mu.Lock()
			d.isRunning = false
			d.mu.Unlock()
			log.Println("[Daemon] Stopped.")
			return
		}
	}
}

// tickAndWait runs one daemon tick with panic recovery.
// Returns true if the daemon should stop.
func (d *Daemon) tickAndWait() bool {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Daemon] CRASHED (will restart after delay): %v", r)
			addKeeperLog(fmt.Sprintf("Daemon crashed and will restart: %v", r), "error", "global", map[string]interface{}{
				"event": "daemon_crash",
				"panic": fmt.Sprintf("%v", r),
			})
			d.mu.Lock()
			d.isRunning = false
			d.mu.Unlock()
		}
	}()

	interval := d.tick()
	if interval <= 0 {
		interval = 30 * time.Second
	}

	timer := time.NewTimer(interval)
	defer timer.Stop()

	select {
	case <-timer.C:
		return false
	case <-d.stopChan:
		return true
	}
}

func (d *Daemon) tick() time.Duration {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return 30 * time.Second
	}

	interval := time.Duration(settings.CheckIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = 120 * time.Second
	}
	if interval < 5*time.Minute {
		interval = 5 * time.Minute
	}

	if !settings.IsEnabled {
		return interval
	}

	// Safety valve: skip enqueuing if too many pending jobs
	var pendingCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	if pendingCount > 500 {
		log.Printf("[Daemon] Too many pending jobs (%d) — skipping tick", pendingCount)
		return interval
	}

	client := NewJulesClient()
	if client.apiKey == "" {
		addKeeperLog("Daemon enabled but no Jules API key found.", "error", "global", map[string]interface{}{
			"event": "daemon_missing_jules_api_key",
		})
		return interval
	}

	// Read cached sessions from local DB instead of hitting the Jules API.
	// The broadcast populates this cache on startup; the dashboard reads from it too.
	var sessions []models.JulesSession
	if err := db.DB.Order("updated_at desc").Find(&sessions).Error; err != nil {
		log.Printf("[Daemon] Failed to read cached sessions: %v", err)
		addKeeperLog("Failed to read cached sessions in Go daemon.", "error", "global", map[string]interface{}{
			"event": "daemon_cached_sessions_failed",
			"error": err.Error(),
		})
		return interval
	}
	log.Printf("[Daemon] Tick: %d cached sessions, interval=%s", len(sessions), interval)

	queuedSessions := 0
	for _, session := range sessions {
		// Only skip if a check_session is currently pending or processing.
		// Don't block re-checking on completed/failed — handleCheckSession
		// has its own supervisor-state dedup for nudging.
		var existing models.QueueJob
		found := db.DB.Where(
			"type = ? AND status IN ? AND payload LIKE ?",
			"check_session",
			[]string{"pending", "processing"},
			"%"+session.ID+"%",
		).First(&existing).Error == nil
		if found {
			continue
		}

		payload := map[string]interface{}{
			"session": session,
		}
		if _, err := AddJob("check_session", payload); err != nil {
			log.Printf("[Daemon] Failed to enqueue check_session for %s: %v", session.ID, err)
			continue
		}
		queuedSessions++
	}

	queuedIssueChecks := 0
	if settings.SmartPilotEnabled {
		sources, err := client.ListSources("")
		if err != nil {
			log.Printf("[Daemon] Failed to fetch sources for issue checks: %v", err)
			addKeeperLog("Failed to fetch sources for issue checks in Go daemon.", "error", "global", map[string]interface{}{
				"event": "daemon_source_poll_failed",
				"error": err.Error(),
			})
		} else {
			for _, source := range sources {
				if strings.TrimSpace(source.ID) == "" {
					continue
				}
				thirtyMinAgo := time.Now().Add(-30 * time.Minute)
				var existing models.QueueJob
				found := db.DB.Where(
					"type = ? AND (status IN ? OR (status = ? AND updated_at > ?)) AND payload LIKE ?",
					"check_issues",
					[]string{"pending", "processing"},
					"completed", thirtyMinAgo,
					"%"+source.ID+"%",
				).First(&existing).Error == nil
				if found {
					continue
				}
				payload := map[string]interface{}{"sourceId": source.ID}
				if _, err := AddJob("check_issues", payload); err != nil {
					log.Printf("[Daemon] Failed to enqueue check_issues for %s: %v", source.ID, err)
					continue
				}
				queuedIssueChecks++
			}
		}
	}

	var existingIndexJob models.QueueJob
	indexJobPending := db.DB.Where("type = ? AND status IN ?", "index_codebase", []string{"pending", "processing"}).First(&existingIndexJob).Error == nil
	queuedIndexing := false
	if !indexJobPending {
		if _, err := AddJob("index_codebase", map[string]string{}); err != nil {
			log.Printf("[Daemon] Failed to enqueue index_codebase: %v", err)
		} else {
			queuedIndexing = true
		}
	}

	if queuedSessions > 0 || queuedIssueChecks > 0 || queuedIndexing {
		addKeeperLog("Go daemon scheduled monitoring work.", "info", "global", map[string]interface{}{
			"event":             "daemon_tick_enqueued",
			"queuedSessions":    queuedSessions,
			"queuedIssueChecks": queuedIssueChecks,
			"queuedIndexing":    queuedIndexing,
		})
	}

	return interval
}

func (d *Daemon) IsRunning() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.isRunning
}

// StartDaemon starts the global daemon in a goroutine
func StartDaemon() {
	d := GetDaemon()
	go d.Run()
}

// StopDaemon signals the global daemon to stop
func StopDaemon() {
	d := GetDaemon()
	d.mu.Lock()
	if !d.isRunning {
		d.mu.Unlock()
		return
	}
	d.mu.Unlock()
	go func() {
		// Non-blocking send: if nobody is reading, the goroutine is dead
		select {
		case d.stopChan <- struct{}{}:
		default:
		}
	}()
}
