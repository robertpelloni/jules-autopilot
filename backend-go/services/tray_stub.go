//go:build !windows

package services

// StartTray is a no-op on non-Windows platforms.
func StartTray() {
	// tray icon is Windows-only
}

// GetTraySummary is not available on this platform.
func GetTraySummary() *TraySummary {
	return nil
}
