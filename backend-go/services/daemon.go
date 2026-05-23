package services

import (
	"fmt"
	"log"
	"sort"
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

	for {
		interval := d.tick()
		if interval <= 0 {
			interval = 30 * time.Second
		}
		timer := time.NewTimer(interval)
		select {
		case <-timer.C:
		case <-d.stopChan:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			d.mu.Lock()
			d.isRunning = false
			d.mu.Unlock()
			log.Println("[Daemon] Stopped.")
			return
		}
	}
}

func (d *Daemon) tick() time.Duration {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return 30 * time.Second
	}
	interval := time.Duration(settings.CheckIntervalSeconds) * time.Second
	if interval <= 0 {
		interval = 30 * time.Second
	}
	// Enforce minimum 120s to prevent API rate-limiting
	if interval < 120*time.Second {
		interval = 120 * time.Second
	}
	if !settings.IsEnabled {
		return interval
	}

	// Skip this tick if we're in a rate-limit backoff period
	if IsRateLimited() {
		return interval
	}

	client := NewJulesClient()
	if client.apiKey == "" {
		addKeeperLog("Daemon enabled but no Jules API key found.", "error", "global", map[string]interface{}{
			"event": "daemon_missing_jules_api_key",
		})
		return interval
	}

	sessions, err := client.ListSessions()
	if err != nil {
		errStr := err.Error()
		log.Printf("[Daemon] Failed to fetch live sessions: %v", err)
		// On 429 rate limit, extend the backoff so we don't hammer the API
		if strings.Contains(errStr, "429") || strings.Contains(errStr, "RESOURCE_EXHAUSTED") {
			SetRateLimitBackoff(30 * time.Second)
			log.Printf("[Daemon] Rate limited on ListSessions, extending backoff")
			addKeeperLog("Rate limited on Jules session list, backing off 30s", "warning", "global", map[string]interface{}{
				"event": "daemon_rate_limited",
			})
		} else {
			addKeeperLog("Failed to fetch live Jules sessions in Go daemon.", "error", "global", map[string]interface{}{
				"event": "daemon_session_poll_failed",
				"error": err.Error(),
			})
		}
		return interval
	}

	// ── Rotation Strategy ──────────────────────────────────────────────
	// Google Jules Pro allows ~15 concurrent sessions. Users can have 50+
	// sessions open. We need to rotate through ALL sessions evenly so that
	// every session gets nudged/reactivated, not just the first 10-15.
	//
	// The strategy:
	//   1. ALL sessions are candidates for nudging — including COMPLETED ones.
	//      The whole purpose of this project is to keep sessions active and
	//      cycling, so COMPLETED sessions must be reactivated.
	//   2. Separate into "immediate" (AWAITING_USER_FEEDBACK, AWAITING_PLAN_APPROVAL)
	//      and "cooldown" (everything else) pools.
	//   3. AWAITING_USER_FEEDBACK sessions bypass ALL cooldowns — the agent is stuck.
	//   4. All other sessions use round-robin rotation based on their
	//      supervisor_state.last_processed_activity_timestamp. Sessions
	//      nudged longest ago get enqueued first.
	//   5. Cooldown periods prevent hammering the same session (avoids 429s).
	// ────────────────────────────────────────────────────────────────────

	cooldownPeriod := 5 * time.Minute          // Don't re-nudge IN_PROGRESS within 5 minutes
	completedCooldownPeriod := 10 * time.Minute // Don't re-activate COMPLETED within 10 minutes
	failedCooldownPeriod := 15 * time.Minute   // Don't re-send recovery guidance within 15 minutes

	immediateSessions := []models.JulesSession{} // AWAITING_USER_FEEDBACK, AWAITING_PLAN_APPROVAL
	cooldownSessions := []models.JulesSession{}   // IN_PROGRESS, COMPLETED, FAILED, SUCCEEDED, etc.

	for _, session := range sessions {
		switch session.RawState {
		case "AWAITING_USER_FEEDBACK", "AWAITING_PLAN_APPROVAL":
			immediateSessions = append(immediateSessions, session)
		default:
			// ALL other states including COMPLETED, SUCCEEDED go into the cooldown pool
			cooldownSessions = append(cooldownSessions, session)
		}
	}

	// Pre-fetch all supervisor states in one query to avoid N^2 DB lookups in sort
	var allSupervisorStates []models.SupervisorState
	db.DB.Find(&allSupervisorStates)
	nudgeTimeMap := make(map[string]time.Time)
	for _, ss := range allSupervisorStates {
		if ss.LastProcessedActivityTimestamp != nil {
			if t, err := time.Parse(time.RFC3339, *ss.LastProcessedActivityTimestamp); err == nil {
				nudgeTimeMap[ss.SessionID] = t
			}
		}
	}

	// Sort cooldown sessions: prioritize COMPLETED/FAILED (they need action),
	// then by least-recently-nudged within each group
	sort.SliceStable(cooldownSessions, func(i, j int) bool {
		iState := cooldownSessions[i].RawState
		jState := cooldownSessions[j].RawState
		iPriority := 0
		jPriority := 0
		switch iState {
		case "COMPLETED", "SUCCEEDED":
			iPriority = 1 // highest priority - needs reactivation
		case "FAILED":
			iPriority = 2
		case "IN_PROGRESS":
			iPriority = 3 // lowest priority - just needs a nudge if idle
		}
		switch jState {
		case "COMPLETED", "SUCCEEDED":
			jPriority = 1
		case "FAILED":
			jPriority = 2
		case "IN_PROGRESS":
			jPriority = 3
		}
		if iPriority != jPriority {
			return iPriority < jPriority
		}
		// Within same priority, least recently nudged goes first
		iLast := nudgeTimeMap[cooldownSessions[i].ID]
		jLast := nudgeTimeMap[cooldownSessions[j].ID]
		return iLast.Before(jLast)
	})

	// Enqueue: immediate first, then rotated cooldown sessions
	queuedSessions := 0
	maxEnqueuePerTick := 8 // cover up to 15 per tick (Pro limit)
	skippedCooldown := 0

	enqueueSession := func(session models.JulesSession) bool {
		if queuedSessions >= maxEnqueuePerTick {
			return false
		}
		// Dedup: skip if a job for this session already exists
		var existing models.QueueJob
		if db.DB.Where("type = ? AND status IN ? AND payload LIKE ?", "check_session", []string{"pending", "processing"}, fmt.Sprintf("%%%s%%", session.ID)).First(&existing).Error == nil {
			return true // already queued, count as handled but don't increment
		}

		// Cooldown check for all non-immediate sessions
		if session.RawState != "AWAITING_USER_FEEDBACK" && session.RawState != "AWAITING_PLAN_APPROVAL" {
			cd := cooldownPeriod // default 5 min
			switch session.RawState {
			case "FAILED":
				cd = failedCooldownPeriod
			case "COMPLETED", "SUCCEEDED":
				cd = completedCooldownPeriod
			}
			if lastNudged, ok := nudgeTimeMap[session.ID]; ok {
				if time.Since(lastNudged) < cd {
					skippedCooldown++
					return true // skip but don't count as queued
				}
			}
		}

		payload := map[string]interface{}{
			"session": session,
		}
		if _, err := AddJob("check_session", payload); err != nil {
			log.Printf("[Daemon] Failed to enqueue check_session for %s: %v", session.ID, err)
			return true
		}
		queuedSessions++
		return true
	}

	// 1. Immediate sessions first (AWAITING_USER_FEEDBACK, AWAITING_PLAN_APPROVAL — no cooldown)
	for _, session := range immediateSessions {
		if !enqueueSession(session) {
			break
		}
	}

	// 2. Cooldown sessions in round-robin order (oldest-nudged first, with cooldown)
	for _, session := range cooldownSessions {
		if !enqueueSession(session) {
			break
		}
	}

	immediateCount := len(immediateSessions)
	cooldownCount := len(cooldownSessions)
	totalPool := immediateCount + cooldownCount

	addKeeperLog(fmt.Sprintf("Daemon loop ran. Enqueued %d sessions (immediate=%d, cooldown_pool=%d, skipped_cooldown=%d, total_pool=%d).",
		queuedSessions, immediateCount, cooldownCount, skippedCooldown, totalPool),
		"info", "global", map[string]interface{}{
			"event":           "daemon_loop",
			"queuedSessions":  queuedSessions,
			"immediateSessions": immediateCount,
			"cooldownPool":    cooldownCount,
			"skippedCooldown": skippedCooldown,
			"totalPool":       totalPool,
		})

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

	if queuedSessions > 0 || queuedIndexing {
		addKeeperLog("Go daemon scheduled monitoring work.", "info", "global", map[string]interface{}{
			"event":          "daemon_tick_enqueued",
			"queuedSessions": queuedSessions,
			"queuedIndexing": queuedIndexing,
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
	d.stopChan <- struct{}{}
}
