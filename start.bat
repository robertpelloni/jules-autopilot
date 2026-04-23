@echo off
title Jules Autopilot
cd /d "%~dp0"

echo [start] Building frontend...
call npx vite build 2>nul
if errorlevel 1 (
    echo [start] Frontend build failed!
    pause
    exit /b 1
)

echo [start] Starting Go backend on :8080...
cd backend-go
go run main.go
pause
