//go:build windows

package services

import (
	"os/exec"
	"syscall"
)

// hideWindow configures the command to not show a console window on Windows.
func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}

// Cmd wraps exec.Command and hides the console window on Windows.
func Cmd(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	hideWindow(cmd)
	return cmd
}
