using System;
using System.Drawing;
using System.Windows.Forms;
using System.Net.Http;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;

namespace JulesTray
{
    class TraySummary
    {
        public string status { get; set; }
        public int pendingJobs { get; set; }
        public int processingJobs { get; set; }
        public int nudgesLast5m { get; set; }
        public int failuresLast5m { get; set; }
        public Dictionary<string, int> sessionsByRaw { get; set; }
        public List<TrayEvent> events { get; set; }
    }

    class TrayEvent
    {
        public string time { get; set; }
        public string type { get; set; }
        public string message { get; set; }
    }

    class Program
    {
        static NotifyIcon tray;
        static HttpClient http = new HttpClient();
        static string apiUrl = "http://localhost:8082";
        static TraySummary lastSummary;
        static Form logWindow;
        static ListBox logList;
        static System.Windows.Forms.Timer pollTimer;

        [DllImport("user32.dll")]
        static extern IntPtr WindowFromPoint(Point p);

        [DllImport("user32.dll")]
        static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wp, IntPtr lp);

        static void Main()
        {
            // Read config from temp file (written by Go backend)
            string configDir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "jules-autopilot-tray");
            string configPath = System.IO.Path.Combine(configDir, "config.json");
            if (System.IO.File.Exists(configPath))
            {
                try
                {
                    var json = System.IO.File.ReadAllText(configPath);
                    var cfg = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
                    if (cfg != null && cfg.ContainsKey("apiUrl"))
                        apiUrl = cfg["apiUrl"];
                }
                catch { }
            }

            tray = new NotifyIcon();
            tray.Text = "Jules Autopilot - starting...";
            tray.Icon = MakeIcon(Color.FromArgb(0, 120, 212)); // blue

            // Build context menu
            var menu = new ContextMenuStrip();
            menu.Items.Add("Dashboard", null, (s, e) => System.Diagnostics.Process.Start(apiUrl));
            menu.Items.Add("Session Log", null, (s, e) => System.Diagnostics.Process.Start(apiUrl + "?tab=log"));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Show Events", null, (s, e) => ShowLogWindow());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Restart Daemon", null, async (s, e) =>
            {
                try { await http.PostAsync(apiUrl + "/api/daemon/restart", null); }
                catch { }
            });
            menu.Items.Add("Restart Worker", null, async (s, e) =>
            {
                try { await http.PostAsync(apiUrl + "/api/worker/restart", null); }
                catch { }
            });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Quit", null, (s, e) =>
            {
                tray.Visible = false;
                logWindow?.Close();
                Application.Exit();
            });
            tray.ContextMenuStrip = menu;

            // Double-click opens dashboard
            tray.DoubleClick += (s, e) => System.Diagnostics.Process.Start(apiUrl);

            // Hover shows live tooltip (updated by timer)
            tray.BalloonTipTitle = "Jules Autopilot";
            tray.BalloonTipIcon = ToolTipIcon.Info;

            tray.Visible = true;

            // Poll every 5 seconds
            pollTimer = new System.Windows.Forms.Timer();
            pollTimer.Interval = 5000;
            pollTimer.Tick += async (s, e) => await PollSummary();
            pollTimer.Start();

            Application.Run();
        }

        static async Task PollSummary()
        {
            try
            {
                var r = await http.GetAsync(apiUrl + "/api/tray/summary");
                var json = await r.Content.ReadAsStringAsync();
                lastSummary = JsonSerializer.Deserialize<TraySummary>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                UpdateTray();
            }
            catch
            {
                tray.Text = "Jules Autopilot - offline";
                tray.Icon = MakeIcon(Color.FromArgb(200, 0, 0)); // red
            }
        }

        static void UpdateTray()
        {
            if (lastSummary == null) return;

            int totalSessions = lastSummary.sessionsByRaw?.Values.Sum() ?? 0;
            int inProgress = lastSummary.sessionsByRaw?.ContainsKey("IN_PROGRESS") == true
                ? lastSummary.sessionsByRaw["IN_PROGRESS"] : 0;
            int completed = lastSummary.sessionsByRaw?.ContainsKey("COMPLETED") == true
                ? lastSummary.sessionsByRaw["COMPLETED"] : 0;

            // Tooltip: show live activity
            tray.Text = string.Format(
                "Jules Autopilot{0}{1}{2}{3}{4}",
                Environment.NewLine,
                string.Format("  {0} sessions ( {1} active, {2} done )", totalSessions, inProgress, completed),
                Environment.NewLine,
                string.Format("  {0} nudges | {1} failures (5m)", lastSummary.nudgesLast5m, lastSummary.failuresLast5m),
                Environment.NewLine + string.Format("  queue: {0} pending, {1} running", lastSummary.pendingJobs, lastSummary.processingJobs)
            );

            // Color code the icon
            if (lastSummary.failuresLast5m > 0)
                tray.Icon = MakeIcon(Color.FromArgb(200, 120, 0)); // orange — errors
            else if (lastSummary.nudgesLast5m > 0)
                tray.Icon = MakeIcon(Color.FromArgb(0, 180, 80));   // green — active nudges
            else
                tray.Icon = MakeIcon(Color.FromArgb(0, 120, 212));  // blue — idle
        }

        static void ShowLogWindow()
        {
            if (logWindow != null && !logWindow.IsDisposed)
            {
                logWindow.BringToFront();
                return;
            }

            logWindow = new Form();
            logWindow.Text = "Jules Autopilot — Recent Events";
            logWindow.Size = new Size(700, 500);
            logWindow.StartPosition = FormStartPosition.CenterScreen;
            logWindow.TopMost = true;

            logList = new ListBox();
            logList.Dock = DockStyle.Fill;
            logList.Font = new Font("Consolas", 9);
            logList.HorizontalScrollbar = true;

            var refreshBtn = new Button();
            refreshBtn.Text = "Refresh";
            refreshBtn.Dock = DockStyle.Bottom;
            refreshBtn.Click += async (s, e) => await RefreshLog();

            logWindow.Controls.Add(logList);
            logWindow.Controls.Add(refreshBtn);

            logWindow.FormClosing += (s, e) =>
            {
                logWindow.Hide();
                e.Cancel = true; // hide instead of close so we can reopen
            };

            logWindow.Show();
            _ = RefreshLog();

            // Auto-refresh every 10s while window is open
            var autoRefresh = new System.Windows.Forms.Timer();
            autoRefresh.Interval = 10000;
            autoRefresh.Tick += async (s, e) => await RefreshLog();
            autoRefresh.Start();
        }

        static async Task RefreshLog()
        {
            if (logList == null || logList.IsDisposed) return;
            try
            {
                var r = await http.GetAsync(apiUrl + "/api/tray/summary");
                var json = await r.Content.ReadAsStringAsync();
                var summary = JsonSerializer.Deserialize<TraySummary>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                logList.Items.Clear();
                if (summary?.events != null)
                {
                    foreach (var evt in summary.events)
                    {
                        string time = "";
                        if (DateTime.TryParse(evt.time, out var dt))
                            time = dt.ToLocalTime().ToString("HH:mm:ss");
                        logList.Items.Add(string.Format("[{0}] [{1}] {2}",
                            time.PadRight(8),
                            evt.type.PadRight(8),
                            evt.message));
                    }
                }
                logList.TopIndex = logList.Items.Count - 1; // scroll to bottom
            }
            catch
            {
                logList.Items.Add("--- Failed to fetch events ---");
            }
        }

        static Icon MakeIcon(Color color)
        {
            var bmp = new Bitmap(16, 16);
            using (var g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                using (var brush = new SolidBrush(color))
                {
                    g.FillPolygon(brush, new[] {
                        new Point(8, 1),
                        new Point(1, 14),
                        new Point(15, 14)
                    });
                    // Small inner glow
                    using (var inner = new SolidBrush(Color.FromArgb(60, 255, 255, 255)))
                    {
                        g.FillPolygon(inner, new[] {
                            new Point(8, 4),
                            new Point(4, 12),
                            new Point(12, 12)
                        });
                    }
                }
            }
            return Icon.FromHandle(bmp.GetHicon());
        }
    }
}
