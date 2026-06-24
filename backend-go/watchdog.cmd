@echo off
setlocal enabledelayedexpansion
set PORT=8082
set DIR=%~dp0
echo [%DATE% %TIME%] Watchdog started >> "%DIR%watchdog.log"

:LOOP
timeout /t 30 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%/api/health' -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; if ($r.StatusCode -ne 200) { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [%DATE% %TIME%] DOWN - Restarting backend >> "%DIR%watchdog.log"
    taskkill /f /im "backend.exe" 2>nul
    timeout /t 3 /nobreak >nul
    cd /d "%DIR%"
    start /B /MIN cmd /c "go run . > server.log 2>&1"
    echo [%DATE% %TIME%] Backend restarted >> "%DIR%watchdog.log"
)
goto LOOP
