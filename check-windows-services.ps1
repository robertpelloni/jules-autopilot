$ports = @(1234, 4000, 8080, 8081)
Write-Host "=== Checking if any project ports are used by Windows services ==="
Write-Host ""

foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procId = $conn.OwningProcess
        $svc = Get-CimInstance -ClassName Win32_Service | Where-Object { $_.ProcessId -eq $procId } | Select-Object Name, DisplayName, StartName, State
        if ($svc) {
            Write-Host "  CONFLICT: Port $p is used by Windows Service '$($svc.Name)' ($($svc.DisplayName))"
            Write-Host "            Service runs as: $($svc.StartName), State: $($svc.State)"
        } else {
            Write-Host "  OK: Port $p -> user process PID $procId (not a Windows service)"
        }
    } else {
        Write-Host "  OK: Port $p -> not listening"
    }
}

Write-Host ""
Write-Host "=== Windows Services that might conflict ==="
$knownPorts = @{}
foreach ($p in $ports) {
    $knownPorts[$p] = $true
}

# Check common Windows services
$commonServices = @{
    80 = "HTTP (World Wide Web)"
    443 = "HTTPS"
    3389 = "RDP (Remote Desktop)"
    5985 = "WinRM HTTP"
    5986 = "WinRM HTTPS"
}
foreach ($sp in $commonServices.Keys) {
    if ($knownPorts.ContainsKey($sp)) {
        Write-Host "  CONFLICT: Port $sp ($($commonServices[$sp])) is used by both project and Windows"
    }
}
Write-Host "  No common Windows service port conflicts found."
