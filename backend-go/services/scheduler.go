package services

import (
	"log"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type ScheduledTask func()

type Scheduler struct {
	tasks    map[string]time.Duration
	stopChan chan struct{}
	mu       sync.Mutex
	wg       sync.WaitGroup
}

var (
	globalScheduler *Scheduler
	schedulerOnce   sync.Once
)

func GetScheduler() *Scheduler {
	schedulerOnce.Do(func() {
		globalScheduler = &Scheduler{
			tasks:    make(map[string]time.Duration),
			stopChan: make(chan struct{}),
		}
	})
	return globalScheduler
}

func (s *Scheduler) Start() {
	log.Println("[Scheduler] Starting scheduled task engine...")
	
	// Default tasks
	s.ScheduleTask("index_codebase", 24*time.Hour)
	s.ScheduleTask("check_issues", 1*time.Hour)
	s.ScheduleTask("cleanup_logs", 7*24*time.Hour)

	for name, interval := range s.tasks {
		s.wg.Add(1)
		go s.runTaskLoop(name, interval)
	}
}

func (s *Scheduler) Stop() {
	log.Println("[Scheduler] Stopping scheduled task engine...")
	close(s.stopChan)
	s.wg.Wait()
	log.Println("[Scheduler] Stopped.")
}

func (s *Scheduler) ScheduleTask(name string, interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tasks[name] = interval
}

func (s *Scheduler) runTaskLoop(name string, interval time.Duration) {
	defer s.wg.Done()
	
	// Initial delay to avoid hammering at boot
	timer := time.NewTimer(1 * time.Minute)
	
	for {
		select {
		case <-timer.C:
			s.executeTask(name)
			timer.Reset(interval)
		case <-s.stopChan:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			return
		}
	}
}

func (s *Scheduler) executeTask(name string) {
	log.Printf("[Scheduler] Executing scheduled task: %s", name)
	
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		log.Printf("[Scheduler] Failed to fetch settings for task %s: %v", name, err)
		return
	}

	switch name {
	case "index_codebase":
		if _, err := AddJob("index_codebase", map[string]string{}); err != nil {
			log.Printf("[Scheduler] Failed to enqueue index_codebase: %v", err)
		}
	case "check_issues":
		if settings.SmartPilotEnabled {
			client := NewJulesClient()
			sources, err := client.ListSources("")
			if err == nil {
				for _, source := range sources {
					_, _ = AddJob("check_issues", map[string]interface{}{"sourceId": source.ID})
				}
			}
		}
	case "cleanup_logs":
		// Simple retention policy: delete logs older than 30 days
		cutoff := time.Now().Add(-30 * 24 * time.Hour)
		result := db.DB.Where("created_at < ?", cutoff).Delete(&models.KeeperLog{})
		if result.Error == nil && result.RowsAffected > 0 {
			log.Printf("[Scheduler] Cleaned up %d old keeper logs", result.RowsAffected)
		}
	}
}

func StartScheduler() {
	s := GetScheduler()
	s.Start()
}

func StopScheduler() {
	s := GetScheduler()
	s.Stop()
}
