package services

import (
	"log"
	"os"
	"path/filepath"
	"sync"
)

var trayOnce sync.Once

// StartTray launches the tray icon as a hidden console process.
func StartTray() {
	trayOnce.Do(func() {
		trayExe := filepath.Join(getScriptDir(), "trayicon.exe")
		if _, err := os.Stat(trayExe); os.IsNotExist(err) {
			log.Printf("[Tray] trayicon.exe not found at %s", trayExe)
			return
		}
		// Kill any stale one first
		kill := Cmd("taskkill", "/f", "/im", "trayicon.exe")
		_ = kill.Run()

		cmd := Cmd(trayExe)
		if err := cmd.Start(); err != nil {
			log.Printf("[Tray] Failed: %v", err)
		} else {
			log.Printf("[Tray] Started PID %d", cmd.Process.Pid)
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
