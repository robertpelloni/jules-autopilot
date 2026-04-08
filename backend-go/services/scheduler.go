package services

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type TaskInfo struct {
	Name     string     `json:"name"`
	Interval int64      `json:"intervalMs"` // milliseconds for frontend mapping
	NextRun  time.Time  `json:"nextRun"`
	LastRun  *time.Time `json:"lastRun,omitempty"`
}

type Scheduler struct {
	tasks    map[string]*TaskInfo
	triggers map[string]chan struct{}
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
			tasks:    make(map[string]*TaskInfo),
			triggers: make(map[string]chan struct{}),
			stopChan: make(chan struct{}),
		}
	})
	return globalScheduler
}

func (s *Scheduler) Start() {
	log.Println("[Scheduler] Starting scheduled task engine...")

	s.ScheduleTask("index_codebase", 24*time.Hour)
	s.ScheduleTask("check_issues", 1*time.Hour)
	s.ScheduleTask("cleanup_logs", 7*24*time.Hour)

	s.mu.Lock()
	for name := range s.tasks {
		s.wg.Add(1)
		go s.runTaskLoop(name)
	}
	s.mu.Unlock()
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
	s.tasks[name] = &TaskInfo{
		Name:     name,
		Interval: interval.Milliseconds(),
	}
	s.triggers[name] = make(chan struct{}, 1)
}

func (s *Scheduler) GetTasks() []TaskInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	var result []TaskInfo
	for _, info := range s.tasks {
		result = append(result, *info)
	}
	return result
}

func (s *Scheduler) Trigger(name string) error {
	s.mu.Lock()
	ch, exists := s.triggers[name]
	s.mu.Unlock()

	if !exists {
		return fmt.Errorf("task %s not found", name)
	}

	select {
	case ch <- struct{}{}:
	default:
		// already triggered
	}
	return nil
}

func (s *Scheduler) runTaskLoop(name string) {
	defer s.wg.Done()

	s.mu.Lock()
	info := s.tasks[name]
	triggerCh := s.triggers[name]
	interval := time.Duration(info.Interval) * time.Millisecond
	s.mu.Unlock()

	// Initial delay to avoid hammering at boot
	delay := 1 * time.Minute
	timer := time.NewTimer(delay)

	s.mu.Lock()
	info.NextRun = time.Now().Add(delay)
	s.mu.Unlock()

	for {
		select {
		case <-timer.C:
			s.executeAndUpdate(name, info, interval)
			timer.Reset(interval)
		case <-triggerCh:
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			s.executeAndUpdate(name, info, interval)
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

func (s *Scheduler) executeAndUpdate(name string, info *TaskInfo, interval time.Duration) {
	now := time.Now()
	s.executeTask(name)
	s.mu.Lock()
	info.LastRun = &now
	info.NextRun = time.Now().Add(interval)
	s.mu.Unlock()
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
