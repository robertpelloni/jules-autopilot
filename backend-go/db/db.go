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
		&models.Notification{},
		&models.AuditEntry{},
		&models.HealthSnapshot{},
		&models.TokenUsage{},
		&models.AnomalyRecord{},
		&models.ScheduledTask{},
		&models.Swarm{},
		&models.SwarmAgent{},
		&models.SwarmEvent{},
		&models.Plugin{},
	)
	if err != nil {
		log.Fatalf("failed to auto-migrate models: %v", err)
	}

	log.Println("Database initialized and migrated successfully")

	seedDefaultSettings()
}

// InitTestDB creates an in-memory SQLite database for testing
func InitTestDB() (*gorm.DB, error) {
	var err error
	DB, err = gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

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
		&models.Notification{},
		&models.AuditEntry{},
		&models.HealthSnapshot{},
		&models.TokenUsage{},
		&models.AnomalyRecord{},
		&models.ScheduledTask{},
		&models.Swarm{},
		&models.SwarmAgent{},
		&models.SwarmEvent{},
		&models.Plugin{},
	)
	if err != nil {
		return nil, err
	}

	// Seed default settings for tests
	settings := models.KeeperSettings{
		ID:                         "default",
		IsEnabled:                  false,
		CheckIntervalSeconds:       30,
		InactivityThresholdMinutes: 10,
		ActiveWorkThresholdMinutes: 5,
		Messages:                   "[]",
		CustomMessages:             "[]",
		SupervisorProvider:         "openai",
		SupervisorModel:            "gpt-4o",
	}
	DB.Create(&settings)

	return DB, nil
}

func seedDefaultSettings() {
	var settings models.KeeperSettings
	if err := DB.First(&settings, "id = ?", "default").Error; err != nil {
		log.Println("Seeding default keeper settings...")
		settings = models.KeeperSettings{
			ID:                         "default",
			IsEnabled:                  false,
			AutoSwitch:                 true,
			CheckIntervalSeconds:       30,
			InactivityThresholdMinutes: 1,
			ActiveWorkThresholdMinutes: 30,
			Messages:                   "Great! Please keep going as you advise!\nYes! Please continue to proceed as you recommend!\nThis looks correct. Please proceed.\nExcellent plan. Go ahead.\nLooks good to me. Continue.",
			CustomMessages:             "[]",
			SmartPilotEnabled:          false,
			SupervisorProvider:         "openai",
			SupervisorModel:            "gpt-4o",
			ContextMessageCount:        20,
		}
		if err := DB.Create(&settings).Error; err != nil {
			log.Printf("failed to seed default settings: %v", err)
		}
	}
}
