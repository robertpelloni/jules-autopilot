# Watchdog for Jules Autopilot Go Backend
# Checks every 30s, restarts if dead.
# Run: powershell -WindowStyle Hidden -File watchdog.ps1

$port = 8082
$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $backendDir "watchdog.log"
$serverLog = Join-Path $backendDir "server.log"
$checkInterval = 30

Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Watchdog started for backend on port $port"

while ($true) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            # Backend is healthy - sleep and loop
            Start-Sleep -Seconds $checkInterval
            continue
        }
    } catch {
        # Backend not responding
    }

    Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backend not responding. Restarting..."

    # Kill any stale process
    Get-Process -Name "backend" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "go" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 3

    # Set env var before starting so it's inherited
    $env:PORT = "$port"

    # Start fresh using pre-built binary
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = (Join-Path $backendDir "backend.exe")
    $startInfo.Arguments = ""
    $startInfo.WorkingDirectory = $backendDir
    $startInfo.RedirectStandardOutput = $false
    $startInfo.RedirectStandardError = $false
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $process.Start() | Out-Null
    
    Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Started backend (PID: $($process.Id))"

    # Wait for it to come up
    $healthy = $false
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep -Seconds 5
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 3 -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backend is healthy"
                $healthy = $true
                break
            }
        } catch {}
    }
    if (-not $healthy) {
        Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backend failed to start after 60s"
    }

    Start-Sleep -Seconds $checkInterval
}
