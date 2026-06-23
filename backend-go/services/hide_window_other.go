//go:build !windows

package services

import "os/exec"

// hideWindow is a no-op on non-Windows platforms.
func hideWindow(cmd *exec.Cmd) {}

// Cmd wraps exec.Command (no-op on non-Windows).
func Cmd(name string, args ...string) *exec.Cmd {
	return exec.Command(name, args...)
}
