package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

var broadcastHook func(interface{})

// SetBroadcaster allows the API package to register the active websocket broadcast function
// without creating an import cycle back from services -> api.
func SetBroadcaster(fn func(interface{})) {
	broadcastHook = fn
}

func emitRealtime(message interface{}) {
	if broadcastHook != nil {
		broadcastHook(message)
	}
}

func emitDaemonEvent(eventType string, data interface{}) {
	emitRealtime(map[string]interface{}{
		"type": eventType,
		"data": data,
	})
}

func addKeeperLog(message, logType, sessionID string, details interface{}) {
	var metadata *string
	if details != nil {
		payload, err := json.Marshal(details)
		if err == nil {
			value := string(payload)
			metadata = &value
		}
	}

	entry := models.KeeperLog{
		ID:        fmt.Sprintf("log-%s", uuid.New().String()[:16]),
		SessionID: sessionID,
		Type:      logType,
		Message:   message,
		Metadata:  metadata,
		CreatedAt: time.Now(),
	}

	_ = db.DB.Create(&entry).Error
	emitDaemonEvent("log_added", map[string]interface{}{"log": entry})

	// Cap keeper_logs at 100 — delete oldest when over
	var count int64
	db.DB.Model(&models.KeeperLog{}).Count(&count)
	if count > 100 {
		db.DB.Exec("DELETE FROM keeper_logs WHERE id NOT IN (SELECT id FROM keeper_logs ORDER BY created_at DESC LIMIT 100)")
	}

	// Record audit trail for action/error events
	if details != nil {
		if detailMap, ok := details.(map[string]interface{}); ok {
			if event, ok := detailMap["event"].(string); ok {
				auditAction(event, logType, sessionID, message, detailMap)
			}
		}
	}
}

func auditAction(event, logType, sessionID, message string, details map[string]interface{}) {
	resourceType := "session"
	resourceID := sessionID
	actor := "daemon"
	status := "success"

	if strings.Contains(event, "index") {
		resourceType = "codebase"
		resourceID = "default"
	}
	if strings.Contains(event, "issue") {
		resourceType = "issue"
		if sourceID, ok := details["sourceId"].(string); ok {
			resourceID = sourceID
		}
	}
	if strings.Contains(event, "circuit_breaker") {
		resourceType = "provider"
		actor = "circuit_breaker"
		if provider, ok := details["provider"].(string); ok {
			resourceID = provider
		}
	}
	if strings.Contains(event, "scheduler") {
		actor = "scheduler"
	}
	if logType == "error" {
		status = "failure"
	}
	if strings.Contains(event, "skipped") || strings.Contains(event, "_skipped") {
		status = "skipped"
	}

	AuditAction(event, actor, resourceType, resourceID, status, message, WithDetails(details))
}
