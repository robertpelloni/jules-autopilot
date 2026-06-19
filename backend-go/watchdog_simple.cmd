@echo off
setlocal enabledelayedexpansion
set PORT=8081
set DIR=%~dp0
echo [%DATE% %TIME%] Watchdog started >> "%DIR%watchdog.log"

:LOOP
timeout /t 30 /nobreak >nul
curl -sf --connect-timeout 5 http://127.0.0.1:%PORT%/api/health >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] DOWN - Restarting backend >> "%DIR%watchdog.log"
    taskkill /f /im "backend.exe" 2>nul
    taskkill /f /im "go.exe" 2>nul
    timeout /t 3 /nobreak >nul
    cd /d "%DIR%"
    start /B /MIN cmd /c "go run . > server.log 2>&1"
    echo [%DATE% %TIME%] Backend started >> "%DIR%watchdog.log"
)
goto LOOP
