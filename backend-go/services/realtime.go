package services

import (
	"encoding/json"
	"fmt"
	"time"

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
		ID:        fmt.Sprintf("log-%d", time.Now().UnixNano()),
		SessionID: sessionID,
		Type:      logType,
		Message:   message,
		Metadata:  metadata,
		CreatedAt: time.Now(),
	}

	_ = db.DB.Create(&entry).Error
	emitDaemonEvent("log_added", map[string]interface{}{"log": entry})
}
