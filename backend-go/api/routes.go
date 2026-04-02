package api

import (
	"fmt"
	"log"
	"os"
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

// SetupRoutes registers all API routes
func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

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

	count := 0
	for _, s := range sessions {
		// Only sync active or recently completed sessions
		if s.Status == "active" || s.Status == "completed" || s.Status == "awaiting_approval" {
			payload := map[string]string{
				"sessionId": s.ID,
			}
			_, err := services.AddJob("sync_session_memory", payload)
			if err == nil {
				count++
			}
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Enqueued sync jobs for %d sessions", count),
		"count":   count,
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

	if action == "sendMessage" {
		var body struct {
			Prompt string `json:"prompt"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		client := services.NewJulesClient()
		result, err := client.CreateActivity(id, services.CreateActivityRequest{
			Content: body.Prompt,
			Type:    "message",
		})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(result)
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
	// Stub implementation: just return success
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
