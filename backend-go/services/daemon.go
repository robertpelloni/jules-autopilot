package services

import (
	"log"
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
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return
	}

	if !settings.IsEnabled {
		return
	}

	client := NewJulesClient()
	sessions, err := client.ListSessions()
	if err != nil {
		log.Printf("[Daemon] Failed to fetch live sessions: %v", err)
		return
	}

	for _, session := range sessions {
		payload := map[string]interface{}{
			"session": session,
		}
		if _, err := AddJob("check_session", payload); err != nil {
			log.Printf("[Daemon] Failed to enqueue check_session for %s: %v", session.ID, err)
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
