package db

import (
	"log"

	"github.com/glebarez/sqlite"
	"github.com/jules-autopilot/backend/models"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	DB, err = gorm.Open(sqlite.Open("dev.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate models
	err = DB.AutoMigrate(
		&models.Account{},
		&models.ApiKey{},
		&models.Debate{},
		&models.KeeperLog{},
		&models.KeeperSettings{},
		&models.Session{},
		&models.JulesSession{},
		&models.SessionTemplate{},
		&models.SupervisorState{},
		&models.User{},
		&models.VerificationToken{},
		&models.Workspace{},
		&models.WorkspaceMember{},
		&models.CodeChunk{},
		&models.MemoryChunk{},
		&models.RepoPath{},
		&models.QueueJob{},
	)
	if err != nil {
		log.Fatalf("failed to auto-migrate models: %v", err)
	}

	log.Println("Database initialized and migrated successfully")
}
