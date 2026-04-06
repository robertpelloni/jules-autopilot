package api

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
	"github.com/jules-autopilot/backend/services"
)

// Global WebSocket clients management
var (
	ActiveClients = make(map[*websocket.Conn]bool)
	ClientsMutex  sync.Mutex
)

// Broadcast sends a message to all connected WebSocket clients
func Broadcast(message interface{}) {
	ClientsMutex.Lock()
	defer ClientsMutex.Unlock()

	for client := range ActiveClients {
		if err := client.WriteJSON(message); err != nil {
			log.Printf("WebSocket broadcast error: %v", err)
			client.Close()
			delete(ActiveClients, client)
		}
	}
}

func getVersion() string {
	versionPath := filepath.Clean(filepath.Join("..", "VERSION"))
	content, err := os.ReadFile(versionPath)
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(content))
}

func getPing(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok", "time": time.Now().Format(time.RFC3339)})
}

func getManifest(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"id":      "jules-autopilot-go-node-1",
		"name":    "Jules Autopilot Go Backend",
		"version": getVersion(),
		"capabilities": []string{
			"cloud_session_management",
			"semantic_rag_indexing",
			"queue_telemetry",
			"session_replay",
			"submodule_intelligence",
			"webhook_ingestion",
		},
		"endpoints": fiber.Map{
			"sessions":   "/api/sessions",
			"summary":    "/api/fleet/summary",
			"replay":     "/api/sessions/:id/replay",
			"submodules": "/api/system/submodules",
		},
		"borgCompatible": true,
	})
}

func getFleetSummary(c *fiber.Ctx) error {
	var sessions []models.JulesSession
	if err := db.DB.Find(&sessions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	statusCounts := map[string]int{}
	for _, session := range sessions {
		statusCounts[session.Status]++
	}

	var pendingCount, processingCount, chunkCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processingCount)
	db.DB.Model(&models.CodeChunk{}).Count(&chunkCount)

	var recentLogs []models.KeeperLog
	db.DB.Where("type = ?", "action").Order("created_at desc").Limit(5).Find(&recentLogs)

	actions := make([]fiber.Map, 0, len(recentLogs))
	for _, entry := range recentLogs {
		actions = append(actions, fiber.Map{
			"message": entry.Message,
			"time":    entry.CreatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"timestamp": time.Now().Format(time.RFC3339),
		"fleet": fiber.Map{
			"total":    len(sessions),
			"byStatus": statusCounts,
		},
		"orchestrator": fiber.Map{
			"queueDepth":               pendingCount + processingCount,
			"isActive":                 processingCount > 0,
			"recentAutonomousActions": actions,
		},
		"knowledgeBase": fiber.Map{
			"totalChunks": chunkCount,
			"isIndexed":   chunkCount > 0,
		},
		"borgReady": true,
	})
}

func getSystemSubmodules(c *fiber.Ctx) error {
	cmd := exec.Command("git", "submodule", "status")
	cmd.Dir = filepath.Clean("..")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("failed to fetch submodules: %v", err)
		return c.JSON(fiber.Map{"submodules": []fiber.Map{}})
	}

	var submodules []fiber.Map
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		statusChar := string(line[0])
		fullHash := strings.TrimLeft(parts[0], " +-")
		pathValue := parts[1]
		ref := "unknown"
		if len(parts) > 2 {
			ref = strings.Trim(strings.Join(parts[2:], " "), "()")
		}
		status := "uninitialized"
		if statusChar == " " {
			status = "synced"
		} else if statusChar == "+" {
			status = "modified"
		}
		hash := fullHash
		if len(hash) > 7 {
			hash = hash[:7]
		}
		submodules = append(submodules, fiber.Map{
			"name":     filepath.Base(pathValue),
			"path":     pathValue,
			"hash":     hash,
			"fullHash": fullHash,
			"ref":      ref,
			"status":   status,
		})
	}

	return c.JSON(fiber.Map{"submodules": submodules})
}

func getSessionReplay(c *fiber.Ctx) error {
	id := c.Params("id")
	client := services.NewJulesClient()

	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	activities, err := client.ListActivities(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	timeline := make([]fiber.Map, 0, len(activities))
	for _, activity := range activities {
		timeline = append(timeline, fiber.Map{
			"id":         activity.ID,
			"timestamp":  activity.CreatedAt,
			"role":       activity.Role,
			"type":       activity.Type,
			"content":    activity.Content,
			"hasDiff":    activity.Diff != "",
			"hasCommand": activity.BashOutput != "",
		})
	}

	return c.JSON(fiber.Map{
		"sessionId": id,
		"title":     session.Title,
		"status":    session.Status,
		"createdAt": session.CreatedAt,
		"timeline":  timeline,
	})
}

func postRAGQuery(c *fiber.Ctx) error {
	var body struct {
		Query string `json:"query"`
		TopK  int    `json:"topK"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if strings.TrimSpace(body.Query) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query is required"})
	}

	settings, _ := services.GetSettingsForAPI()
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" && settings.SupervisorApiKey != nil {
		apiKey = strings.TrimSpace(*settings.SupervisorApiKey)
	}
	if apiKey == "" || apiKey == "placeholder" {
		return c.Status(401).JSON(fiber.Map{"error": "OpenAI API key is required for RAG"})
	}

	results, err := services.QueryCodebase(body.Query, apiKey, body.TopK)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"results": results})
}

func postBorgWebhook(c *fiber.Ctx) error {
	var payload struct {
		Type   string                 `json:"type"`
		Source string                 `json:"source"`
		Data   map[string]interface{} `json:"data"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	logMessage := fmt.Sprintf("Received collective signal: %s from %s", payload.Type, payload.Source)
	if payload.Source == "" {
		logMessage = fmt.Sprintf("Received collective signal: %s", payload.Type)
	}

	entry := models.KeeperLog{
		ID:        fmt.Sprintf("hook-%d", time.Now().UnixNano()),
		SessionID: "global",
		Type:      "info",
		Message:   logMessage,
		CreatedAt: time.Now(),
	}
	db.DB.Create(&entry)
	Broadcast(fiber.Map{"type": "log_added", "data": fiber.Map{"log": entry}})
	Broadcast(fiber.Map{"type": "borg_signal_received", "data": fiber.Map{
		"type":      payload.Type,
		"source":    payload.Source,
		"data":      payload.Data,
		"timestamp": time.Now().Format(time.RFC3339),
	}})

	if payload.Type == "repo_updated" {
		_, _ = services.AddJob("index_codebase", map[string]string{})
	}
	if payload.Type == "fleet_command" {
		if action, ok := payload.Data["action"].(string); ok && action == "reindex_all" {
			_, _ = services.AddJob("index_codebase", map[string]string{})
		}
	}

	return c.JSON(fiber.Map{"success": true, "processed": true})
}

// SetupRoutes registers all API routes
func SetupRoutes(app *fiber.App) {
	services.SetBroadcaster(Broadcast)

	api := app.Group("/api")

	api.Get("/ping", getPing)
	api.Get("/manifest", getManifest)
	api.Get("/fleet/summary", getFleetSummary)
	api.Get("/system/submodules", getSystemSubmodules)
	api.Get("/sessions/:id/replay", getSessionReplay)
	api.Post("/rag/query", postRAGQuery)
	api.Post("/webhooks/borg", postBorgWebhook)
	api.Post("/webhooks/hypercode", postBorgWebhook)

	// Daemon routes
	api.Get("/daemon/status", getDaemonStatus)
	api.Post("/daemon/status", postDaemonStatus)

	// Settings routes
	api.Get("/settings/keeper", getKeeperSettings)
	api.Post("/settings/keeper", updateKeeperSettings)

	// Session routes
	api.Get("/sessions", getSessions)
	api.Post("/sessions/:id/activities", createActivity)
	api.Post("/sessions/:idAndAction", handleSessionAction)
	api.Post("/sessions/:id/export-to-repo", exportSessionToRepo)
	api.Post("/sessions/:id/save-memory", saveSessionMemory)
	api.Post("/sessions/:id/nudge", nudgeSession)

	// Broadcast route
	api.Post("/broadcast", postBroadcast)

	// Fleet sync route
	api.Post("/fleet/sync", triggerFleetSync)

	// Repo mapping routes
	api.Get("/repos/paths", getRepoPaths)
	api.Post("/repos/paths", updateRepoPath)
}

func triggerFleetSync(c *fiber.Ctx) error {
	client := services.NewJulesClient()
	sessions, err := client.ListSessions()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch sessions: " + err.Error()})
	}

	syncCount := 0
	sourceIDs := map[string]struct{}{}
	for _, s := range sessions {
		if strings.TrimSpace(s.SourceID) != "" {
			sourceIDs[s.SourceID] = struct{}{}
		}

		// Only sync active or recently completed sessions
		if s.Status == "active" || s.Status == "completed" || s.Status == "awaiting_approval" {
			payload := map[string]string{
				"sessionId": s.ID,
			}
			_, err := services.AddJob("sync_session_memory", payload)
			if err == nil {
				syncCount++
			}
		}
	}

	var repoPaths []models.RepoPath
	if err := db.DB.Find(&repoPaths).Error; err == nil {
		for _, path := range repoPaths {
			if strings.TrimSpace(path.SourceID) != "" {
				sourceIDs[path.SourceID] = struct{}{}
			}
		}
	}

	issueCount := 0
	for sourceID := range sourceIDs {
		_, err := services.AddJob("check_issues", map[string]string{"sourceId": sourceID})
		if err == nil {
			issueCount++
		}
	}

	_, _ = services.AddJob("index_codebase", map[string]string{})

	return c.JSON(fiber.Map{
		"success":           true,
		"message":           fmt.Sprintf("Enqueued %d memory sync jobs, %d issue-check jobs, and a codebase indexing job", syncCount, issueCount),
		"syncJobCount":      syncCount,
		"issueCheckJobCount": issueCount,
	})
}

func getRepoPaths(c *fiber.Ctx) error {
	var paths []models.RepoPath
	db.DB.Find(&paths)
	return c.JSON(paths)
}

func updateRepoPath(c *fiber.Ctx) error {
	var body models.RepoPath
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.SourceID == "" || body.LocalPath == "" {
		return c.Status(400).JSON(fiber.Map{"error": "sourceId and localPath are required"})
	}

	var existing models.RepoPath
	result := db.DB.Where("source_id = ?", body.SourceID).First(&existing)
	if result.Error == nil {
		existing.LocalPath = body.LocalPath
		db.DB.Save(&existing)
		return c.JSON(existing)
	}

	db.DB.Create(&body)
	return c.JSON(body)
}

func handleSessionAction(c *fiber.Ctx) error {
	idAndAction := c.Params("idAndAction")
	parts := strings.Split(idAndAction, ":")
	if len(parts) != 2 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action format"})
	}

	id := parts[0]
	action := parts[1]

	client := services.NewJulesClient()

	if action == "sendMessage" {
		var body struct {
			Prompt string `json:"prompt"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		result, err := client.CreateActivity(id, services.CreateActivityRequest{
			Content: body.Prompt,
			Type:    "message",
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(result)
	}

	if action == "approvePlan" {
		if err := client.ApprovePlan(id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		_, _ = services.AddJob("check_session", map[string]interface{}{
			"session": models.JulesSession{ID: id},
		})
		return c.JSON(fiber.Map{"success": true})
	}

	return c.Status(400).JSON(fiber.Map{"error": "Unsupported action: " + action})
}

func createActivity(c *fiber.Ctx) error {
	id := c.Params("id")
	var req services.CreateActivityRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	client := services.NewJulesClient()
	result, err := client.CreateActivity(id, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(result)
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

func exportSessionToRepo(c *fiber.Ctx) error {
	id := c.Params("id")
	client := services.NewJulesClient()

	// 1. Get session details for header
	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get session details: " + err.Error()})
	}

	// 2. Get all activities
	activities, err := client.ListActivities(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to list activities: " + err.Error()})
	}

	// 3. Format as Markdown
	var md strings.Builder
	md.WriteString(fmt.Sprintf("# %s\n\n", session.Title))
	md.WriteString(fmt.Sprintf("**Session ID:** %s\n", session.ID))
	md.WriteString(fmt.Sprintf("**Date:** %s\n", session.CreatedAt.Format(time.RFC1123)))
	md.WriteString(fmt.Sprintf("**Status:** %s\n", session.Status))
	md.WriteString(fmt.Sprintf("**Source:** %s\n", session.SourceID))
	md.WriteString(fmt.Sprintf("**Branch:** %s\n\n", session.Branch))

	md.WriteString("## Activity Log\n\n")

	for _, a := range activities {
		role := "Agent"
		if a.Role == "user" {
			role = "User"
		}
		md.WriteString(fmt.Sprintf("### %s (%s)\n\n", role, a.CreatedAt.Format(time.RFC1123)))
		md.WriteString(a.Content + "\n\n")

		if a.BashOutput != "" {
			md.WriteString(fmt.Sprintf("**Terminal Output:**\n```bash\n%s\n```\n\n", a.BashOutput))
		}
		if a.Diff != "" {
			md.WriteString(fmt.Sprintf("**Code Diff:**\n```diff\n%s\n```\n\n", a.Diff))
		}
		md.WriteString("---\n\n")
	}

	// 4. Resolve destination and save
	basePath := resolveRepoPath(session.SourceID)
	dir := fmt.Sprintf("%s/.jules/sessions", basePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create directory: " + err.Error()})
	}

	filename := fmt.Sprintf("%s/%s.md", dir, id)
	if err := os.WriteFile(filename, []byte(md.String()), 0644); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to write file: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"path":    filename,
	})
}

func saveSessionMemory(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	client := services.NewJulesClient()
	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get session details: " + err.Error()})
	}

	basePath := resolveRepoPath(session.SourceID)
	dir := fmt.Sprintf("%s/.jules/memory", basePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create directory: " + err.Error()})
	}

	filename := fmt.Sprintf("%s/architecture.md", dir)
	if err := os.WriteFile(filename, []byte(body.Content), 0644); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to write memory file: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"path":    filename,
	})
}

func getDaemonStatus(c *fiber.Ctx) error {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Settings not found"})
	}

	var logs []models.KeeperLog
	db.DB.Order("created_at desc").Limit(50).Find(&logs)

	var pendingCount, processingCount int64
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.QueueJob{}).Where("status = ?", "processing").Count(&processingCount)

	ClientsMutex.Lock()
	wsCount := len(ActiveClients)
	ClientsMutex.Unlock()

	return c.JSON(fiber.Map{
		"isEnabled": settings.IsEnabled,
		"logs":      logs,
		"wsClients": wsCount,
		"queue": fiber.Map{
			"pending":    pendingCount,
			"processing": processingCount,
		},
	})
}

func postDaemonStatus(c *fiber.Ctx) error {
	type Request struct {
		Action string `json:"action"` // "start" or "stop"
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Action == "start" {
		services.StartDaemon()
	} else if req.Action == "stop" {
		services.StopDaemon()
	} else {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
	}

	return c.JSON(fiber.Map{"success": true})
}

func getKeeperSettings(c *fiber.Ctx) error {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Settings not found"})
	}
	return c.JSON(settings)
}

func updateKeeperSettings(c *fiber.Ctx) error {
	var settings models.KeeperSettings
	if err := db.DB.First(&settings, "id = ?", "default").Error; err != nil {
		// If not found, create new one
		settings.ID = "default"
		if err := c.BodyParser(&settings); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		if err := db.DB.Create(&settings).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	} else {
		if err := c.BodyParser(&settings); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		settings.UpdatedAt = time.Now()
		if err := db.DB.Save(&settings).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	}
	return c.JSON(settings)
}

func getSessions(c *fiber.Ctx) error {
	client := services.NewJulesClient()
	liveSessions, err := client.ListSessions()
	if err == nil && len(liveSessions) > 0 {
		return c.JSON(fiber.Map{"sessions": liveSessions})
	}

	if err != nil {
		log.Printf("Failed to fetch live sessions: %v", err)
	}

	var sessions []models.JulesSession
	if err := db.DB.Find(&sessions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"sessions": sessions})
}

func nudgeSession(c *fiber.Ctx) error {
	id := c.Params("id")
	client := services.NewJulesClient()
	session, err := client.GetSession(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	message := "Please continue working on this task."
	if _, err := client.CreateActivity(id, services.CreateActivityRequest{
		Content: message,
		Type:    "message",
		Role:    "user",
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	_, _ = services.AddJob("check_session", map[string]interface{}{
		"session": session,
	})
	Broadcast(fiber.Map{"type": "activities_updated", "data": fiber.Map{"sessionId": id}})
	return c.JSON(fiber.Map{
		"success": true,
		"message": "Session " + id + " nudged",
	})
}

func postBroadcast(c *fiber.Ctx) error {
	var msg interface{}
	if err := c.BodyParser(&msg); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	Broadcast(msg)
	return c.Status(200).JSON(fiber.Map{"success": true})
}
