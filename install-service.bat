@echo off
:: Install Jules Autopilot as Windows scheduled tasks (auto-start on login)
:: Runs as administrator

>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrator privileges...
    powershell Start-Process -FilePath "%0" -Verb RunAs
    exit /b
)

cd /d "%~dp0"
echo Installing Jules Autopilot startup tasks...
echo.

:: Remove old tasks
schtasks /delete /tn "JulesAutopilot" /f >nul 2>&1
schtasks /delete /tn "JulesAutopilotWatchdog" /f >nul 2>&1

:: Create backend task (starts on login)
schtasks /create /tn "JulesAutopilot" /sc onlogon /rl highest /f /it ^
    /tr "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -Command \"cd '%cd%\backend-go'; go run . > '%cd%\backend-go\server.log' 2>&1\"" ^
    /np
echo [OK] JulesAutopilot - starts backend on login

:: Create watchdog task (starts 2 min after login)
schtasks /create /tn "JulesAutopilotWatchdog" /sc onlogon /rl highest /f /it ^
    /tr "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File '%cd%\backend-go\watchdog_loop.ps1'" ^
    /np /delay 0002:00
echo [OK] JulesAutopilotWatchdog - starts watchdog 2min after login

echo.
echo Done! Tasks will start on next login.
echo To run now, use: Start-JulesAutopilot.bat
pause
