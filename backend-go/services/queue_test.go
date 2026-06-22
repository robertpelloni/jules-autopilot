package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func setupQueueTestDB(t *testing.T) {
	t.Helper()
	_, err := db.InitTestDB()
	if err != nil {
		t.Fatalf("Failed to initialize test DB: %v", err)
	}
}

func TestAddJob(t *testing.T) {
	setupQueueTestDB(t)

	payload := map[string]string{"sessionId": "test-session-1"}
	job, err := AddJob("check_session", payload)
	if err != nil {
		t.Fatalf("Failed to add job: %v", err)
	}
	if job.ID == "" {
		t.Error("Expected job to have an ID")
	}
	if job.Type != "check_session" {
		t.Errorf("Expected type 'check_session', got '%s'", job.Type)
	}
	if job.Status != "pending" {
		t.Errorf("Expected status 'pending', got '%s'", job.Status)
	}
	if job.Attempts != 0 {
		t.Errorf("Expected 0 attempts, got %d", job.Attempts)
	}
	if job.MaxAttempts != 3 {
		t.Errorf("Expected max attempts 3, got %d", job.MaxAttempts)
	}

	// Verify payload was serialized
	var stored map[string]string
	if err := json.Unmarshal([]byte(job.Payload), &stored); err != nil {
		t.Fatalf("Failed to parse payload: %v", err)
	}
	if stored["sessionId"] != "test-session-1" {
		t.Errorf("Expected sessionId in payload, got '%s'", stored["sessionId"])
	}
}

func TestAddJobWithScheduledTime(t *testing.T) {
	setupQueueTestDB(t)

	futureTime := time.Now().Add(1 * time.Hour)
	job, err := AddJob("index_codebase", map[string]string{}, futureTime)
	if err != nil {
		t.Fatalf("Failed to add scheduled job: %v", err)
	}
	if job.RunAt.After(futureTime.Add(1*time.Second)) || job.RunAt.Before(futureTime.Add(-1*time.Second)) {
		t.Errorf("Expected RunAt to be approximately %v, got %v", futureTime, job.RunAt)
	}
}

func TestWorkerLifecycle(t *testing.T) {
	setupQueueTestDB(t)

	worker := NewWorker(2)
	if worker.IsRunning() {
		t.Error("Worker should not be running initially")
	}

	worker.Start()
	if !worker.IsRunning() {
		t.Error("Worker should be running after Start()")
	}

	// Double start should be safe
	worker.Start()
	if !worker.IsRunning() {
		t.Error("Worker should still be running after double Start()")
	}

	worker.Stop()
	if worker.IsRunning() {
		t.Error("Worker should not be running after Stop()")
	}

	// Double stop should be safe
	worker.Stop()
}

func TestWorkerDefaultConcurrency(t *testing.T) {
	worker := NewWorker(0)
	if worker.concurrency != 4 {
		t.Errorf("Expected default concurrency 4, got %d", worker.concurrency)
	}
	worker2 := NewWorker(-1)
	if worker2.concurrency != 4 {
		t.Errorf("Expected default concurrency 4 for negative, got %d", worker2.concurrency)
	}
}

func TestWorkerProcessesJobs(t *testing.T) {
	setupQueueTestDB(t)

	worker := NewWorker(2)
	worker.Start()
	defer worker.Stop()

	// Add a job
	_, err := AddJob("index_codebase", map[string]string{})
	if err != nil {
		t.Fatalf("Failed to add job: %v", err)
	}

	// Wait for processing (worker ticker is 10s)
	time.Sleep(15 * time.Second)

	// Job should be completed or at least attempted
	var job models.QueueJob
	db.DB.Where("type = ?", "index_codebase").First(&job)
	if job.Status == "pending" && job.Attempts == 0 {
		t.Error("Job should have been picked up by worker")
	}
}

func TestGetSettings(t *testing.T) {
	setupQueueTestDB(t)

	settings, err := getSettings()
	if err != nil {
		t.Fatalf("Failed to get settings: %v", err)
	}
	if settings.ID != "default" {
		t.Errorf("Expected settings ID 'default', got '%s'", settings.ID)
	}
}

func TestParseMessages(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected int
	}{
		{"empty string", "", 0},
		{"json array", `["msg1","msg2"]`, 2},
		{"newline separated", "msg1\nmsg2\nmsg3", 3},
		{"single message", "Hello world", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ParseMessages(tt.input)
			if len(result) != tt.expected {
				t.Errorf("Expected %d messages, got %d", tt.expected, len(result))
			}
		})
	}
}

func TestIsRiskyPlan(t *testing.T) {
	lowRisk := isRiskyPlan("Fix a typo in the README")
	if lowRisk > 40 {
		t.Errorf("Simple fix should have low risk, got %d", lowRisk)
	}

	highRisk := isRiskyPlan("Delete the database schema, drop all tables, and rewrite the authentication and security layer. This migration affects billing, websocket connections, and the queue system.")
	if highRisk < 40 {
		t.Errorf("Dangerous plan should have high risk, got %d", highRisk)
	}
}

func TestComputeChecksum(t *testing.T) {
	sum1 := computeChecksum("hello world")
	sum2 := computeChecksum("hello world")
	sum3 := computeChecksum("hello universe")

	if sum1 != sum2 {
		t.Error("Same content should produce same checksum")
	}
	if sum1 == sum3 {
		t.Error("Different content should produce different checksum")
	}
}

func TestChooseNudgeMessage(t *testing.T) {
	settings := models.KeeperSettings{
		Messages:       `["Keep going!", "Please continue."]`,
		CustomMessages: `["Custom nudge"]`,
	}

	msg := chooseNudgeMessage(settings)
	if msg == "" {
		t.Error("Expected a nudge message")
	}
}

func TestApprovalStatusFromRisk(t *testing.T) {
	if approvalStatusFromRisk(10) != "approved" {
		t.Error("Low risk should be approved")
	}
	if approvalStatusFromRisk(50) != "pending" {
		t.Error("Medium risk should be pending")
	}
	if approvalStatusFromRisk(80) != "rejected" {
		t.Error("High risk should be rejected")
	}
}

func TestMapState(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"COMPLETED", "completed"},
		{"ACTIVE", "active"},
		{"PLANNING", "active"},
		{"QUEUED", "active"},
		{"IN_PROGRESS", "active"},
		{"AWAITING_PLAN_APPROVAL", "awaiting_approval"},
		{"FAILED", "failed"},
		{"PAUSED", "paused"},
		{"UNKNOWN_STATE", "active"},
	}

	for _, tt := range tests {
		result := mapState(tt.input)
		if result != tt.expected {
			t.Errorf("mapState(%s) = '%s', expected '%s'", tt.input, result, tt.expected)
		}
	}
}

func TestExtractProjectName(t *testing.T) {
	tests := []struct {
		sourceID string
		want     string
	}{
		{"hyper/jules-autopilot", "jules-autopilot"},
		{"jules-autopilot", "jules-autopilot"},
		{"hyper/turntUpToddler", "turntUpToddler"},
		{"", ""},
		{"hyper/repo/sub", "sub"},
	}
	for _, tt := range tests {
		got := extractProjectName(tt.sourceID)
		if got != tt.want {
			t.Errorf("extractProjectName(%q) = %q, want %q", tt.sourceID, got, tt.want)
		}
	}
}

func getProjectRootForTest() string {
	cwd, _ := os.Getwd()
	return filepath.Join(cwd, "..", "..")
}

func TestIndexRootResolution(t *testing.T) {
	root := getProjectRootForTest()
	if root == "" {
		t.Error("Expected a project root")
	}
}

func TestShouldIndexFile(t *testing.T) {
	tests := []struct {
		path     string
		expected bool
	}{
		{"test.ts", true},
		{"test.tsx", true},
		{"test.js", true},
		{"test.jsx", true},
		{"README.md", true},
		{"test.go", false},
		{"test.py", false},
		{"image.png", false},
		{"style.css", false},
	}

	for _, tt := range tests {
		result := shouldIndexFile(tt.path)
		if result != tt.expected {
			t.Errorf("shouldIndexFile(%s) = %v, expected %v", tt.path, result, tt.expected)
		}
	}
}
