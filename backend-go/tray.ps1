# Jules Autopilot System Tray Icon
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$backendUrl = "http://localhost:8082"

# Create the NotifyIcon
$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Text = "Jules Autopilot - starting..."

# Create a 16x16 blue triangle icon
$bmp = New-Object System.Drawing.Bitmap(16, 16)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 120, 212))
$points = @(
    [System.Drawing.Point]::new(8, 1)
    [System.Drawing.Point]::new(1, 14)
    [System.Drawing.Point]::new(15, 14)
)
$g.FillPolygon($brush, $points)
$g.Dispose()
$hIcon = $bmp.GetHicon()
$tray.Icon = [System.Drawing.Icon]::FromHandle($hIcon)

# Build context menu
$menu = New-Object System.Windows.Forms.ContextMenuStrip

$mDashboard = New-Object System.Windows.Forms.ToolStripMenuItem
$mDashboard.Text = "Dashboard"
$mDashboard.Add_Click({ Start-Process $backendUrl })

$mStatus = New-Object System.Windows.Forms.ToolStripMenuItem
$mStatus.Text = "Status"
$mStatus.Add_Click({ Start-Process "$backendUrl/api/health" })

$menu.Items.Add($mDashboard)
$menu.Items.Add($mStatus)
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

$mRestartDaemon = New-Object System.Windows.Forms.ToolStripMenuItem
$mRestartDaemon.Text = "Restart Daemon"
$mDaemonClick = {
    try {
        Invoke-RestMethod -Uri "$backendUrl/api/daemon/restart" -Method Post -ErrorAction Stop | Out-Null
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to restart daemon: $_", "Error")
    }
}
$mRestartDaemon.Add_Click($mDaemonClick)

$mRestartWorker = New-Object System.Windows.Forms.ToolStripMenuItem
$mRestartWorker.Text = "Restart Worker"
$mWorkerClick = {
    try {
        Invoke-RestMethod -Uri "$backendUrl/api/worker/restart" -Method Post -ErrorAction Stop | Out-Null
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to restart worker: $_", "Error")
    }
}
$mRestartWorker.Add_Click($mWorkerClick)

$menu.Items.Add($mRestartDaemon)
$menu.Items.Add($mRestartWorker)
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

$mQuit = New-Object System.Windows.Forms.ToolStripMenuItem
$mQuit.Text = "Quit"
$mQuit.Add_Click({
    $tray.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})
$menu.Items.Add($mQuit)

$tray.ContextMenuStrip = $menu
$tray.Visible = $true

# Tooltip updater
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 30000
$timer.Add_Tick({
    try {
        $r = Invoke-RestMethod -Uri "$backendUrl/api/health" -TimeoutSec 5 -ErrorAction Stop
        $q = $r.queue
        $s = $r.totals.sessions
        $tray.Text = "Jules Autopilot - Queue: $($q.pending)/$($q.processing) Sessions: $s"
    } catch {
        $tray.Text = "Jules Autopilot - offline"
    }
})
$timer.Start()

# Keep running
[System.Windows.Forms.Application]::Run()
