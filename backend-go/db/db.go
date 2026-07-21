package db

import (
	"log"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/jules-autopilot/backend/models"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	// SQLite pragma order matters: WAL + busy_timeout first, then performance tuning.
	// _busy_timeout is a modernc.org/sqlite DSN parameter (not a pragma) that sets
	// the busy handler; it must be in the DSN before any connections are opened.
	dsn := "dev.db" +
		"?_pragma=journal_mode(WAL)" +
		"&_pragma=busy_timeout(30000)" +
		"&_pragma=temp_store(MEMORY)" +
		"&_pragma=synchronous(NORMAL)" +
		"&_pragma=cache_size(-8000)" +
		"&_pragma=mmap_size(268435456)"

	var err error
	DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// SQLite with WAL mode needs exactly ONE connection to avoid SQLITE_BUSY.
	// WAL allows concurrent reads through the same connection; writes are serialized.
	// MaxLifetime prevents connection bloat after bursts.
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("failed to get underlying sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

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
		&models.Plugin{},
		&models.Swarm{},
		&models.SwarmAgent{},
		&models.SwarmEvent{},
		&models.ShadowPilotSettings{},
		&models.VulnerabilityRecord{},
		&models.ScheduledTask{},
	)
	if err != nil {
		log.Fatalf("failed to auto-migrate models: %v", err)
	}

	log.Println("Database initialized and migrated successfully")

	seedDefaultSettings()
	seedShadowPilotSettings()
}

// InitTestDB creates an in-memory SQLite database for testing
func InitTestDB() (*gorm.DB, error) {
	var err error
	DB, err = gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

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
		&models.Plugin{},
		&models.Swarm{},
		&models.SwarmAgent{},
		&models.SwarmEvent{},
		&models.ShadowPilotSettings{},
		&models.VulnerabilityRecord{},
		&models.ScheduledTask{},
	)
	if err != nil {
		return nil, err
	}

	// Seed default settings for tests
	settings := models.KeeperSettings{
		ID:                         "default",
		IsEnabled:                  false,
		CheckIntervalSeconds:       300,
		InactivityThresholdMinutes: 10,
		ActiveWorkThresholdMinutes: 5,
		Messages:                   "[]",
		CustomMessages:             "[]",
		SupervisorProvider:         "openrouter",
		SupervisorModel:            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
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
			IsEnabled:                  true,
			AutoSwitch:                 true,
			CheckIntervalSeconds:       300,
			InactivityThresholdMinutes: 1,
			ActiveWorkThresholdMinutes: 30,
			Messages:                   "Great! Please keep going as you advise!\nYes! Please continue to proceed as you recommend!\nThis looks correct. Please proceed.\nExcellent plan. Go ahead.\nLooks good to me. Continue.",
			CustomMessages:             "[]",
			SmartPilotEnabled:          false,
			SupervisorProvider:         "openrouter",
			SupervisorModel:            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
			ContextMessageCount:        20,
		}
		if err := DB.Create(&settings).Error; err != nil {
			log.Printf("failed to seed default settings: %v", err)
		}
	}
}

func seedShadowPilotSettings() {
	var settings models.ShadowPilotSettings
	if err := DB.First(&settings, "id = ?", "default").Error; err != nil {
		log.Println("Seeding default shadow pilot settings...")
		settings = models.ShadowPilotSettings{
			ID:                "default",
			IsEnabled:         true,
			ScanIntervalHours: 6,
			AutoFix:           false,
			MinSeverity:       "medium",
		}
		if err := DB.Create(&settings).Error; err != nil {
			log.Printf("failed to seed shadow pilot settings: %v", err)
		}
	}
}
