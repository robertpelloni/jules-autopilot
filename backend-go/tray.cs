using System;
using System.Drawing;
using System.Windows.Forms;
using System.Net.Http;
using System.Threading.Tasks;

namespace JulesTray
{
    class Program
    {
        static NotifyIcon tray;
        static HttpClient http = new HttpClient();
        static string url = "http://localhost:8082";

        static void Main()
        {
            tray = new NotifyIcon();
            tray.Text = "Jules Autopilot - starting...";

            // Build icon: 16x16 blue triangle
            var bmp = new Bitmap(16, 16);
            using (var g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                using (var brush = new SolidBrush(Color.FromArgb(0, 120, 212)))
                {
                    g.FillPolygon(brush, new[] {
                        new Point(8, 1),
                        new Point(1, 14),
                        new Point(15, 14)
                    });
                }
            }
            tray.Icon = Icon.FromHandle(bmp.GetHicon());

            var menu = new ContextMenuStrip();
            menu.Items.Add("Dashboard", null, (s, e) => System.Diagnostics.Process.Start(url));
            menu.Items.Add("Status", null, (s, e) => System.Diagnostics.Process.Start(url + "/api/health"));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Restart Daemon", null, async (s, e) => { await http.PostAsync(url + "/api/daemon/restart", null); });
            menu.Items.Add("Restart Worker", null, async (s, e) => { await http.PostAsync(url + "/api/worker/restart", null); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Quit", null, (s, e) => { tray.Visible = false; Application.Exit(); });
            tray.ContextMenuStrip = menu;
            tray.Visible = true;

            // Update tooltip every 30s
            var timer = new Timer();
            timer.Interval = 30000;
            timer.Tick += async (s, e) => {
                try
                {
                    var r = await http.GetAsync(url + "/api/health");
                    var json = await r.Content.ReadAsStringAsync();
                    // Just show a simple status
                    tray.Text = "Jules Autopilot - running";
                }
                catch
                {
                    tray.Text = "Jules Autopilot - offline";
                }
            };
            timer.Start();

            Application.Run();
        }
    }
}
