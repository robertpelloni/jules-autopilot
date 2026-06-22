# Install Jules Autopilot Backend as a scheduled task
# Run as Administrator once: powershell -ExecutionPolicy Bypass -File install-service.ps1

$taskName = "JulesAutopilot"
$projectRoot = "C:\Users\hyper\workspace\jules-autopilot"
$backendDir = "$projectRoot\backend-go"
$watchdogScript = "$backendDir\watchdog_loop.ps1"
$serverLog = "$backendDir\server.log"

Write-Host "Installing Jules Autopilot startup tasks..."
Write-Host ""

# Remove existing
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false 2>$null
Unregister-ScheduledTask -TaskName "${taskName}Watchdog" -Confirm:$false 2>$null
Start-Sleep -Seconds 1

# Backend task (runs on login)
$ba = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -Command `"cd '$backendDir'; go run . > '$serverLog' 2>&1`""
$bt = New-ScheduledTaskTrigger -AtLogOn
$bs = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $ba -Trigger $bt -Settings $bs -Force
Write-Host "  [OK] '$taskName' - starts backend on login"

# Watchdog task (runs 2 min after login)
$wa = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File '$watchdogScript'"
$wt = New-ScheduledTaskTrigger -AtLogOn
$wt.Delay = "PT2M"
$ws = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "${taskName}Watchdog" -Action $wa -Trigger $wt -Settings $ws -Force
Write-Host "  [OK] '${taskName}Watchdog' - starts watchdog 2min after login"

Write-Host ""
Write-Host "Done! Run 'schtasks /query /tn JulesAutopilot*' to verify."
Write-Host "Tasks will start automatically on next login."
