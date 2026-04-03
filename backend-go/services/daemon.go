package services

import (
	"log"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// JulesClientStub is a stub for the Jules API client
type JulesClientStub struct {
	APIKey string
}

func (c *JulesClientStub) GetLastActivity(sessionID string) (time.Time, error) {
	// Stub implementation: return current time (no inactivity)
	// In a real implementation, this would call the Jules API
	return time.Now(), nil
}

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
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			d.tick()
		case <-d.stopChan:
			d.mu.Lock()
			d.isRunning = false
			d.mu.Unlock()
			log.Println("[Daemon] Stopped.")
			return
		}
	}
}

func (d *Daemon) tick() {
	var settings models.KeeperSettings
	// Fetch KeeperSettings from DB
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		// Log and skip if settings not found
		return
	}

	if !settings.IsEnabled {
		return
	}

	// Query Sessions where status is 'ACTIVE' or 'AWAITING_USER_FEEDBACK'
	var activeSessions []models.JulesSession
	err := db.DB.Where("status = ? OR status = ?", "ACTIVE", "AWAITING_USER_FEEDBACK").Find(&activeSessions).Error
	if err != nil {
		log.Printf("[Daemon] Failed to query active sessions: %v", err)
		return
	}

	if len(activeSessions) == 0 {
		return
	}

	// Jules API Key from settings or env
	apiKey := ""
	if settings.JulesApiKey != nil {
		apiKey = *settings.JulesApiKey
	}
	client := &JulesClientStub{APIKey: apiKey}

	for _, session := range activeSessions {
		lastActivity, err := client.GetLastActivity(session.ID)
		if err != nil {
			log.Printf("[Daemon] Failed to get last activity for session %s: %v", session.ID, err)
			continue
		}

		// Check if inactive longer than inactivityThresholdMinutes
		threshold := time.Duration(settings.InactivityThresholdMinutes) * time.Minute
		if time.Since(lastActivity) > threshold {
			// Enqueue a check_session job
			payload := map[string]string{
				"sessionId": session.ID,
			}
			_, err := AddJob("check_session", payload)
			if err != nil {
				log.Printf("[Daemon] Failed to enqueue check_session job for session %s: %v", session.ID, err)
			} else {
				log.Printf("[Daemon] Enqueued check_session job for inactive session %s", session.ID)
			}
		}
	}
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
