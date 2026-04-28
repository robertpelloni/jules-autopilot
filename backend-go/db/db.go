package db

import (
	"log"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/jules-autopilot/backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	var err error

	// Open SQLite with WAL mode for concurrent read/write performance
	dsn := "dev.db?_journal_mode=WAL&_busy_timeout=5000&_synchronous=NORMAL&_cache_size=-64000&_foreign_keys=1"
	DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Configure connection pool for SQLite
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("failed to get underlying DB: %v", err)
	}

	sqlDB.SetMaxOpenConns(1) // SQLite single-writer
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(0)
	sqlDB.SetConnMaxIdleTime(30 * time.Minute)

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
	purgeStaleData()
}

// purgeStaleData cleans up stale jobs and caps table sizes to prevent OOM
func purgeStaleData() {
	// Purge deprecated check_issues jobs
	DB.Where("type = ?", "check_issues").Delete(&models.QueueJob{})

	// Purge stale processing jobs (older than 30 minutes = dead worker)
	cutoff := time.Now().Add(-30 * time.Minute)
	stale := DB.Where("status = ? AND created_at < ?", "processing", cutoff).Delete(&models.QueueJob{})
	if stale.RowsAffected > 0 {
		log.Printf("[DB] Purged %d stale processing jobs", stale.RowsAffected)
	}

	// Cap audit entries to last 1000
	var auditCount int64
	DB.Model(&models.AuditEntry{}).Count(&auditCount)
	if auditCount > 1000 {
		DB.Exec("DELETE FROM audit_entries WHERE id NOT IN (SELECT id FROM audit_entries ORDER BY id DESC LIMIT 1000)")
		log.Printf("[DB] Trimmed audit_entries from %d to 1000", auditCount)
	}

	// Cap keeper_logs to last 500
	var logCount int64
	DB.Model(&models.KeeperLog{}).Count(&logCount)
	if logCount > 500 {
		DB.Exec("DELETE FROM keeper_logs WHERE id NOT IN (SELECT id FROM keeper_logs ORDER BY id DESC LIMIT 500)")
		log.Printf("[DB] Trimmed keeper_logs from %d to 500", logCount)
	}

	// Cap notifications to last 200
	var notifCount int64
	DB.Model(&models.Notification{}).Count(&notifCount)
	if notifCount > 200 {
		DB.Exec("DELETE FROM notifications WHERE id NOT IN (SELECT id FROM notifications ORDER BY id DESC LIMIT 200)")
		log.Printf("[DB] Trimmed notifications from %d to 200", notifCount)
	}
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
		IsEnabled:                  true,
		CheckIntervalSeconds:       900,
		InactivityThresholdMinutes: 10,
		ActiveWorkThresholdMinutes: 5,
		Messages:                   "[]",
		CustomMessages:             "[]",
		SupervisorProvider:         "openrouter",
		SupervisorModel:            "free",
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
			CheckIntervalSeconds:       900,
			InactivityThresholdMinutes: 1,
			ActiveWorkThresholdMinutes: 30,
			Messages:                   "Great! Please keep going as you advise!\nYes! Please continue to proceed as you recommend!\nThis looks correct. Please proceed.\nExcellent plan. Go ahead.\nLooks good to me. Continue.",
			CustomMessages:             "[]",
			SmartPilotEnabled:          true,
			SupervisorProvider:         "openrouter",
			SupervisorModel:            "free",
			ContextMessageCount:        20,
		}
		if err := DB.Create(&settings).Error; err != nil {
			log.Printf("failed to seed default settings: %v", err)
		}
	} else {
		// Force critical booleans ON for existing rows
		if !settings.IsEnabled || !settings.SmartPilotEnabled {
			DB.Model(&settings).Updates(map[string]interface{}{
				"is_enabled":          true,
				"smart_pilot_enabled":  true,
			})
			log.Println("[DB] Forced isEnabled + smartPilotEnabled = true")
		}
	}
}
