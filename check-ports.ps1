$watchPorts = @{
    1234 = "LM Studio"
    4000 = "FreeLLM"
    8080 = "Old backend"
    8081 = "Jules Backend"
    3000 = "Frontend dev server"
    3006 = "Vite dev server"
}

Write-Host "=== Current Port Usage ==="
Write-Host ""

foreach ($p in $watchPorts.Keys) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procId = $conn.OwningProcess
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            $name = $proc.ProcessName
            $start = $proc.StartTime.ToString("HH:mm:ss")
            Write-Host ("  {0,5} ({1,-20}) -> PID {2,6} {3,-15} started {4}" -f $p, $watchPorts[$p], $procId, $name, $start)
        } else {
            Write-Host ("  {0,5} ({1,-20}) -> PID {2,6} (gone)" -f $p, $watchPorts[$p], $procId)
        }
    } else {
        Write-Host ("  {0,5} ({1,-20}) -> NOT LISTENING" -f $p, $watchPorts[$p])
    }
}

Write-Host ""
Write-Host "=== Check for port conflicts ==="
$reserved = @{}
foreach ($p in $watchPorts.Keys) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procId = $conn.OwningProcess
        if ($reserved.ContainsKey($p)) {
            Write-Host "  CONFLICT: Port $p used by both $($watchPorts[$p]) and PID $procId"
        } else {
            $reserved[$p] = $procId
        }
    }
}
Write-Host "  No conflicts detected"
