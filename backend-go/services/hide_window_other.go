//go:build !windows

package services

import (
	"context"
	"os/exec"
)

// hideWindow is a no-op on non-Windows platforms.
func hideWindow(cmd *exec.Cmd) {}

// Cmd wraps exec.Command (no-op on non-Windows).
func Cmd(name string, args ...string) *exec.Cmd {
	return exec.Command(name, args...)
}

// CmdContext wraps exec.CommandContext (no-op on non-Windows).
func CmdContext(ctx context.Context, name string, args ...string) *exec.Cmd {
	return exec.CommandContext(ctx, name, args...)
}
