package services

import (
	"log"
	"os"
	"path/filepath"
	"sync"
)

var trayOnce sync.Once

// StartTray initializes the system tray icon by launching a PowerShell tray script.
func StartTray() {
	trayOnce.Do(func() {
		log.Println("[Tray] Starting PowerShell tray icon...")
		psPath := filepath.Join(getScriptDir(), "tray.ps1")
		if _, err := os.Stat(psPath); os.IsNotExist(err) {
			log.Printf("[Tray] tray.ps1 not found at %s, skipping", psPath)
			return
		}
		cmd := Cmd("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", psPath)
		if err := cmd.Start(); err != nil {
			log.Printf("[Tray] Failed to start tray script: %v", err)
		} else {
			log.Printf("[Tray] Tray script started (PID: %d)", cmd.Process.Pid)
		}
	})
}

func getScriptDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(exe)
}
