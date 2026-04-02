package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

// Worker represents the SQLite Task Queue worker
type Worker struct {
	concurrency int
	isRunning   bool
	stopChan    chan struct{}
}

// NewWorker creates a new queue worker
func NewWorker(concurrency int) *Worker {
	if concurrency <= 0 {
		concurrency = 2
	}
	return &Worker{
		concurrency: concurrency,
		stopChan:    make(chan struct{}),
	}
}

// AddJob inserts a new job into the queue
func AddJob(jobType string, payload interface{}, runAt ...time.Time) (*models.QueueJob, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	scheduledTime := time.Now()
	if len(runAt) > 0 {
		scheduledTime = runAt[0]
	}

	job := &models.QueueJob{
		ID:          uuid.New().String(),
		Type:        jobType,
		Payload:     string(payloadBytes),
		Status:      "pending",
		RunAt:       scheduledTime,
		Attempts:    0,
		MaxAttempts: 3,
	}

	if err := db.DB.Create(job).Error; err != nil {
		return nil, fmt.Errorf("failed to create queue job: %w", err)
	}

	return job, nil
}

// Start begins polling for jobs
func (w *Worker) Start() {
	if w.isRunning {
		return
	}
	w.isRunning = true
	log.Printf("[Queue] SQLite Task Queue worker started (concurrency: %d)", w.concurrency)

	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if w.isRunning {
					w.processJobs()
				}
			case <-w.stopChan:
				return
			}
		}
	}()
}

// Stop halts the polling for jobs
func (w *Worker) Stop() {
	if !w.isRunning {
		return
	}
	w.isRunning = false
	close(w.stopChan)
	log.Println("[Queue] SQLite Task Queue worker stopped")
}

func (w *Worker) processJobs() {
	var jobs []models.QueueJob
	now := time.Now()

	// Find pending jobs that are ready to run
	err := db.DB.Where("status = ? AND run_at <= ? AND attempts < max_attempts", "pending", now).
		Order("run_at ASC").
		Limit(w.concurrency).
		Find(&jobs).Error

	if err != nil {
		log.Printf("[Queue] Failed to fetch jobs: %v", err)
		return
	}

	if len(jobs) == 0 {
		return
	}

	for _, job := range jobs {
		// Run in goroutine to respect concurrency if needed, 
		// but simple loop with goroutines works for now
		go w.executeJob(job)
	}
}

func (w *Worker) executeJob(job models.QueueJob) {
	// Mark as processing
	now := time.Now()
	err := db.DB.Model(&job).Updates(map[string]interface{}{
		"status":     "processing",
		"started_at": &now,
		"attempts":   job.Attempts + 1,
	}).Error

	if err != nil {
		log.Printf("[Queue] Failed to update job %s to processing: %v", job.ID, err)
		return
	}

	var result string
	var executeErr error

	// Handle job based on type
	switch job.Type {
	case "check_session":
		result, executeErr = w.handleCheckSession(job.Payload)
	case "index_codebase":
		result, executeErr = w.handleIndexCodebase(job.Payload)
	case "sync_session_memory":
		result, executeErr = w.handleSyncSessionMemory(job.Payload)
	case "check_issues":
		result, executeErr = w.handleCheckIssues(job.Payload)
	default:
		executeErr = fmt.Errorf("unknown job type: %s", job.Type)
	}

	if executeErr != nil {
		errMsg := executeErr.Error()
		log.Printf("[Queue] Job %s failed: %s", job.ID, errMsg)

		// Determine if we should mark as 'failed' or back to 'pending' for retry
		status := "pending"
		if job.Attempts+1 >= job.MaxAttempts {
			status = "failed"
		}

		db.DB.Model(&job).Updates(map[string]interface{}{
			"status":     status,
			"last_error": &errMsg,
		})
		return
	}

	// Mark as completed
	completedAt := time.Now()
	db.DB.Model(&job).Updates(map[string]interface{}{
		"status":       "completed",
		"completed_at": &completedAt,
	})

	log.Printf("[Queue] Job %s (%s) completed: %s", job.ID[:8], job.Type, result)
}

// Handlers are currently stubs to be implemented as functionality is ported to Go

var (
	globalWorker *Worker
	workerOnce   sync.Once
)

// StartWorker initializes and starts the global queue worker
func StartWorker() {
	workerOnce.Do(func() {
		globalWorker = NewWorker(2)
		globalWorker.Start()
	})
}

func (w *Worker) handleCheckSession(payload string) (string, error) {
	// TODO: Port handleCheckSession logic from TypeScript
	// This would involve JULES_API_KEY, session state evaluation, and auto-approval logic
	return "done", nil
}

func (w *Worker) handleIndexCodebase(payload string) (string, error) {
	// TODO: Port handleIndexCodebase logic from TypeScript
	// This would involve file system traversal and OpenAI embeddings
	return "done", nil
}

func (w *Worker) handleSyncSessionMemory(payload string) (string, error) {
	var data struct {
		SessionID string `json:"sessionId"`
	}
	json.Unmarshal([]byte(payload), &data)

	client := NewJulesClient()

	// 1. Send memory request prompt
	prompt := "Please provide a comprehensive summary of everything you've learned about this project's architecture, patterns, and decisions in Markdown format. Start your response with [PROJECT_MEMORY]."
	_, err := client.CreateActivity(data.SessionID, CreateActivityRequest{
		Content: prompt,
		Role:    "user",
		Type:    "message",
	})
	if err != nil {
		return "fail", fmt.Errorf("failed to send sync prompt: %v", err)
	}

	// 2. Poll for agent response (max 30 seconds)
	var memoryContent string
	for i := 0; i < 6; i++ {
		time.Sleep(5 * time.Second)
		activities, err := client.ListActivities(data.SessionID)
		if err != nil {
			continue
		}

		// Find the response to our prompt
		if len(activities) > 0 {
			last := activities[len(activities)-1]
			if last.Role == "agent" && strings.Contains(last.Content, "[PROJECT_MEMORY]") {
				memoryContent = strings.Replace(last.Content, "[PROJECT_MEMORY]", "", 1)
				memoryContent = strings.TrimSpace(memoryContent)
				break
			}
		}
	}

	if memoryContent == "" {
		return "fail", fmt.Errorf("agent did not provide [PROJECT_MEMORY] response in time")
	}

	// 3. Resolve path and save memory
	session, _ := client.GetSession(data.SessionID)
	basePath := resolveRepoPath(session.SourceID)

	memDir := fmt.Sprintf("%s/.jules/memory", basePath)
	os.MkdirAll(memDir, 0755)
	os.WriteFile(fmt.Sprintf("%s/architecture.md", memDir), []byte(memoryContent), 0644)

	// 4. Also perform full chat export
	activities, _ := client.ListActivities(data.SessionID)
	var md strings.Builder
	md.WriteString(fmt.Sprintf("# %s\n\n", session.Title))
	md.WriteString(fmt.Sprintf("**Session ID:** %s\n", session.ID))
	md.WriteString(fmt.Sprintf("**Source:** %s\n\n", session.SourceID))
	md.WriteString("## Activity Log\n\n")

	for _, a := range activities {
		role := "Agent"
		if a.Role == "user" {
			role = "User"
		}
		md.WriteString(fmt.Sprintf("### %s (%s)\n\n", role, a.CreatedAt.Format(time.RFC1123)))
		md.WriteString(a.Content + "\n\n---\n\n")
	}

	sessDir := fmt.Sprintf("%s/.jules/sessions", basePath)
	os.MkdirAll(sessDir, 0755)
	os.WriteFile(fmt.Sprintf("%s/%s.md", sessDir, data.SessionID), []byte(md.String()), 0644)

	return "done", nil
}

func resolveRepoPath(sourceId string) string {
	var mapping models.RepoPath
	result := db.DB.Where("source_id = ?", sourceId).First(&mapping)
	if result.Error == nil && mapping.LocalPath != "" {
		return mapping.LocalPath
	}

	// Default to C:/Users/hyper/workspace/[reponame]
	repoName := sourceId
	if strings.Contains(sourceId, "/") {
		parts := strings.Split(sourceId, "/")
		repoName = parts[len(parts)-1]
	}

	return "C:/Users/hyper/workspace/" + repoName
}

func (w *Worker) handleCheckIssues(payload string) (string, error) {
	// TODO: Port handleCheckIssues logic from TypeScript
	// This would involve GitHub issue scanning and evaluation
	return "done", nil
}
