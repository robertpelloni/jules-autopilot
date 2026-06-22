Write-Host "=== Any existing Jules services? ==="
Get-CimInstance -ClassName Win32_Service | Where-Object { $_.Name -like "*Jules*" -or $_.Name -like "*jules*" -or $_.Name -like "*Autopilot*" -or $_.DisplayName -like "*Jules*" } | ForEach-Object {
    Write-Host "  Name: $($_.Name)"
    Write-Host "  Display: $($_.DisplayName)"
    Write-Host "  State: $($_.State)"
    Write-Host "  StartMode: $($_.StartMode)"
    Write-Host "  PathName: $($_.PathName)"
    Write-Host "  ProcessId: $($_.ProcessId)"
    Write-Host ""
}

Write-Host "=== Services on our ports ==="
$ports = @{1234="LM Studio"; 4000="FreeLLM"; 8080="FreeLLM Web"; 8081="Jules Backend"}
foreach ($p in $ports.Keys) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procId = $conn.OwningProcess
        $svc = Get-CimInstance -ClassName Win32_Service | Where-Object { $_.ProcessId -eq $procId } | Select-Object Name, DisplayName, State, StartMode, PathName
        if ($svc) {
            Write-Host "  Port $p ($($ports[$p])) -> SERVICE"
            Write-Host "    Name: $($svc.Name)"
            Write-Host "    Display: $($svc.DisplayName)"
            Write-Host "    State: $($svc.State)  Start: $($svc.StartMode)"
            Write-Host ""
        } else {
            Write-Host "  Port $p ($($ports[$p])) -> user process PID $procId (not a service)"
        }
    }
}

Write-Host ""
Write-Host "=== All running services (top 30 by PID) ==="
$running = Get-CimInstance -ClassName Win32_Service | Where-Object { $_.State -eq "Running" } | Sort-Object ProcessId
$count = 0
foreach ($s in $running) {
    $count++
    if ($count -le 30) {
        Write-Host ("  PID {0,6}  {1,-25} {2}" -f $s.ProcessId, $s.Name, $s.DisplayName)
    }
}
if ($running.Count -gt 30) {
    Write-Host "  ... and $($running.Count - 30) more"
}
Write-Host "  Total running services: $($running.Count)"
