# Run: powershell -ExecutionPolicy Bypass -File watchdog_loop.ps1
# Or: Start-Process -WindowStyle Hidden powershell.exe '-ExecutionPolicy Bypass -File "C:\...\watchdog_loop.ps1"'

$port = 8082
$backendDir = "C:\Users\hyper\workspace\jules-autopilot\backend-go"
$logFile = "$backendDir\watchdog.log"
$exePath = "$backendDir\backend.exe"

Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Watchdog started"

# Single-instance mutex to prevent duplicate watchdogs
$mutexName = "Global\JulesAutopilotWatchdog"
$mutex = New-Object System.Threading.Mutex($false, $mutexName)
if (!$mutex.WaitOne(0)) {
    Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Another watchdog instance already running, exiting."
    exit
}

while ($true) {
    $healthy = $false
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $healthy = $true }
    } catch {}

    if (-not $healthy) {
        Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] DOWN - Restarting backend"
        Get-Process -Name "backend" -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 3

        # Set PORT via environment so child process inherits it
        $env:PORT = "$port"

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $exePath
        $psi.Arguments = ""
        $psi.WorkingDirectory = $backendDir
        $psi.RedirectStandardOutput = $false
        $psi.RedirectStandardError = $false
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $p = [System.Diagnostics.Process]::Start($psi)
        Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Started backend (PID: $($p.Id)) on port $port"

	for ($i = 0; $i -lt 12; $i++) {
            Start-Sleep -Seconds 5
            try {
                $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
                if ($r.StatusCode -eq 200) {
                    Add-Content $logFile "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backend is healthy"
                    break
                }
            } catch {}
        }
    }
    Start-Sleep -Seconds 30
}
