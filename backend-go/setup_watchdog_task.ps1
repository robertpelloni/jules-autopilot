$watchdogScript = @'
$logFile = "C:\Users\hyper\workspace\jules-autopilot\backend-go\watchdog.log"
try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8082/api/health' -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { exit 0 }
} catch {}
Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] DOWN - Restarting backend"
Get-Process -Name "backend" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "go"
$psi.Arguments = "run ."
$psi.WorkingDirectory = "C:\Users\hyper\workspace\jules-autopilot\backend-go"
$psi.RedirectStandardOutput = $false
$psi.RedirectStandardError = $false
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$p = [System.Diagnostics.Process]::Start($psi)
Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Started backend (PID: $($p.Id))"
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Seconds 5
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8082/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backend is healthy"
            break
        }
    } catch {}
}
'@

$taskName = "JulesAutopilotWatchdog"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false 2>$null
Start-Sleep -Seconds 1

# Run every 2 minutes indefinitely using a daily trigger with repeat
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -NoProfile -Command `"$watchdogScript`""
$trigger = New-ScheduledTaskTrigger -Daily -At "00:00" -DaysInterval 1
$trigger.Repetition.Interval = "PT2M"
$trigger.Repetition.Duration = "P1D"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -Hidden -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
Write-Host "Scheduled task '$taskName' created - runs every 2 minutes"
