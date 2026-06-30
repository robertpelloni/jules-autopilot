package main

import (
	"log"
	"os"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

func main() {
	os.Chdir("..") // cd to backend-go root
	dbPath := "dev.db"
	if _, err := os.Stat(dbPath); err != nil {
		log.Fatalf("DB not found at %s", dbPath)
	}

	db.InitDB()

	result := db.DB.Model(&models.JulesSession{}).
		Where("archived = ?", true).
		Update("archived", false)
	if result.Error != nil {
		log.Fatalf("Failed to unarchive: %v", result.Error)
	}
	log.Printf("Unarchived %d sessions", result.RowsAffected)
}
