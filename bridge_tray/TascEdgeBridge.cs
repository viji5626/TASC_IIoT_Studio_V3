using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace TascEdgeBridge
{
    static class Program
    {
        private const string MutexName = "Global\\TascEdgeBridge_Daemon_Mutex_v3";
        private static Mutex _mutex;

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [STAThread]
        static void Main()
        {
            bool createdNew;
            _mutex = new Mutex(true, MutexName, out createdNew);

            if (!createdNew)
            {
                // Already running - find existing window or notify
                Process current = Process.GetCurrentProcess();
                foreach (Process p in Process.GetProcessesByName(current.ProcessName))
                {
                    if (p.Id != current.Id && p.MainWindowHandle != IntPtr.Zero)
                    {
                        ShowWindow(p.MainWindowHandle, 9); // SW_RESTORE
                        SetForegroundWindow(p.MainWindowHandle);
                        return;
                    }
                }

                MessageBox.Show(
                    "TASC Edge Bridge is already running!\nLook for the TASC icon in your Windows System Tray near the clock.",
                    "TASC Edge Bridge",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            BridgeMainWindow mainWindow = new BridgeMainWindow();
            Application.Run(mainWindow);

            try
            {
                _mutex.ReleaseMutex();
            }
            catch { }
        }
    }

    public class BridgeMainWindow : Form
    {
        private NotifyIcon _trayIcon;
        private ContextMenuStrip _trayMenu;
        private Process _nodeProcess;
        private System.Windows.Forms.Timer _healthTimer;
        private System.Windows.Forms.Timer _uptimeTimer;
        private DateTime _startTime;
        private bool _allowExit = false;

        // UI Controls
        private Label _lblStatusBadge;
        private Label _lblPortInfo;
        private Label _lblPidInfo;
        private Label _lblUptime;
        private Button _btnOpenWeb;
        private Button _btnOpenLocal;
        private Button _btnRestart;
        private Button _btnMinimize;
        private ToolStripMenuItem _trayStatusHeader;

        public BridgeMainWindow()
        {
            _startTime = DateTime.Now;
            InitializeWindow();
            InitializeTray();
            StartBridgeProcess();

            // Uptime counter timer (1s)
            _uptimeTimer = new System.Windows.Forms.Timer { Interval = 1000 };
            _uptimeTimer.Tick += (s, e) => UpdateUptime();
            _uptimeTimer.Start();

            // Health check timer (3s)
            _healthTimer = new System.Windows.Forms.Timer { Interval = 3000 };
            _healthTimer.Tick += (s, e) => CheckHealth();
            _healthTimer.Start();

            // Ensure clean termination on system shutdown/exit
            AppDomain.CurrentDomain.ProcessExit += (s, e) => StopBridgeProcess();
        }

        private void InitializeWindow()
        {
            this.Text = "TASC Edge Bridge - Industrial Hardware Gateway";
            this.Size = new Size(540, 480);
            this.MinimumSize = new Size(540, 480);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 23, 42); // slate-900
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9.25f, FontStyle.Regular);

            // Icon
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
            if (File.Exists(iconPath))
            {
                try { this.Icon = new Icon(iconPath); } catch { }
            }

            // Top Header Panel
            Panel headerPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 72,
                BackColor = Color.FromArgb(30, 41, 59) // slate-800
            };

            Label titleLabel = new Label
            {
                Text = "⚡ TASC Edge Bridge v3.0",
                Font = new Font("Segoe UI", 13.5f, FontStyle.Bold),
                ForeColor = Color.FromArgb(56, 189, 248), // sky-400
                Location = new Point(18, 12),
                AutoSize = true
            };

            Label subTitleLabel = new Label
            {
                Text = "Local Port 3000 Gateway for Modbus, Siemens S7, Mitsubishi, OPC UA/DA & Ethernet/IP",
                Font = new Font("Segoe UI", 8.25f, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184), // slate-400
                Location = new Point(20, 42),
                AutoSize = true
            };

            headerPanel.Controls.Add(titleLabel);
            headerPanel.Controls.Add(subTitleLabel);
            this.Controls.Add(headerPanel);

            // Main Status Group Box / Container
            Panel cardPanel = new Panel
            {
                Location = new Point(18, 86),
                Size = new Size(490, 160),
                BackColor = Color.FromArgb(30, 41, 59),
                BorderStyle = BorderStyle.FixedSingle
            };

            _lblStatusBadge = new Label
            {
                Text = "🟢 STATUS: ONLINE",
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                ForeColor = Color.FromArgb(52, 211, 153), // emerald-400
                Location = new Point(16, 14),
                AutoSize = true
            };

            _lblPortInfo = new Label
            {
                Text = "• Local Server Port: 3000  (http://127.0.0.1:3000)",
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                ForeColor = Color.FromArgb(226, 232, 240),
                Location = new Point(16, 46),
                AutoSize = true
            };

            _lblPidInfo = new Label
            {
                Text = "• Daemon Process: Initializing...",
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(16, 72),
                AutoSize = true
            };

            _lblUptime = new Label
            {
                Text = "• Bridge Uptime: 00:00:00",
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(16, 98),
                AutoSize = true
            };

            Label driverLabel = new Label
            {
                Text = "• Active Drivers: Modbus TCP/RTU, S7 ISO-on-TCP, SLMP, OPC UA, EtherNet/IP",
                Font = new Font("Segoe UI", 8.25f, FontStyle.Italic),
                ForeColor = Color.FromArgb(148, 163, 184),
                Location = new Point(16, 126),
                AutoSize = true
            };

            cardPanel.Controls.Add(_lblStatusBadge);
            cardPanel.Controls.Add(_lblPortInfo);
            cardPanel.Controls.Add(_lblPidInfo);
            cardPanel.Controls.Add(_lblUptime);
            cardPanel.Controls.Add(driverLabel);
            this.Controls.Add(cardPanel);

            // Action Buttons Panel
            _btnOpenWeb = CreateStyledButton("🌐 Open Web Studio", new Point(18, 258), new Size(238, 42), Color.FromArgb(14, 116, 144));
            _btnOpenWeb.Click += (s, e) => OpenBrowser("https://app.tascautomation.com");
            this.Controls.Add(_btnOpenWeb);

            _btnOpenLocal = CreateStyledButton("⚡ Check Local Health (:3000)", new Point(270, 258), new Size(238, 42), Color.FromArgb(30, 41, 59));
            _btnOpenLocal.Click += (s, e) => OpenBrowser("http://127.0.0.1:3000/api/health");
            this.Controls.Add(_btnOpenLocal);

            _btnRestart = CreateStyledButton("🔄 Restart Bridge Engine", new Point(18, 310), new Size(238, 40), Color.FromArgb(51, 65, 85));
            _btnRestart.Click += (s, e) =>
            {
                _btnRestart.Enabled = false;
                StopBridgeProcess();
                Thread.Sleep(800);
                StartBridgeProcess();
                _startTime = DateTime.Now;
                _btnRestart.Enabled = true;
                ShowTrayBalloon("Restarted", "TASC Edge Bridge engine restarted successfully.", ToolTipIcon.Info);
            };
            this.Controls.Add(_btnRestart);

            _btnMinimize = CreateStyledButton("📥 Hide to System Tray", new Point(270, 310), new Size(238, 40), Color.FromArgb(51, 65, 85));
            _btnMinimize.Click += (s, e) =>
            {
                this.Hide();
                ShowTrayBalloon("TASC Edge Bridge Running", "Bridge is active in background. Double-click tray icon to restore.", ToolTipIcon.Info);
            };
            this.Controls.Add(_btnMinimize);

            // Footer instructions info
            Panel footerPanel = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 64,
                BackColor = Color.FromArgb(2, 6, 23),
                BorderStyle = BorderStyle.FixedSingle
            };

            Label footerInfo = new Label
            {
                Text = "ℹ️ Note for SCADA Engineers: Closing this window [X] minimizes to the System Tray.\nTo completely stop and quit the bridge, right-click the tray icon and select 'Exit & Quit'.",
                Font = new Font("Segoe UI", 8.25f, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184),
                Location = new Point(14, 12),
                AutoSize = true
            };
            footerPanel.Controls.Add(footerInfo);
            this.Controls.Add(footerPanel);

            // Closing Event: Minimize to Tray instead of terminating process
            this.FormClosing += (s, e) =>
            {
                if (!_allowExit && e.CloseReason == CloseReason.UserClosing)
                {
                    e.Cancel = true;
                    this.Hide();
                    ShowTrayBalloon(
                        "TASC Edge Bridge Minimized",
                        "The bridge is still running on port 3000.\nRight-click this icon to quit or reopen window.",
                        ToolTipIcon.Info);
                }
            };
        }

        private Button CreateStyledButton(string text, Point loc, Size size, Color backColor)
        {
            Button btn = new Button
            {
                Text = text,
                Location = loc,
                Size = size,
                BackColor = backColor,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btn.FlatAppearance.BorderColor = Color.FromArgb(71, 85, 105);
            btn.FlatAppearance.BorderSize = 1;
            return btn;
        }

        private void InitializeTray()
        {
            _trayMenu = new ContextMenuStrip();

            _trayStatusHeader = new ToolStripMenuItem("🟢 TASC Bridge: Online (:3000)")
            {
                Enabled = false,
                Font = new Font(_trayMenu.Font, FontStyle.Bold)
            };
            _trayMenu.Items.Add(_trayStatusHeader);
            _trayMenu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem showItem = new ToolStripMenuItem("🗔 Show Status Window", null, (s, e) => RestoreWindow());
            showItem.Font = new Font(_trayMenu.Font, FontStyle.Bold);
            _trayMenu.Items.Add(showItem);

            _trayMenu.Items.Add(new ToolStripMenuItem("🌐 Open Web Studio (app.tascautomation.com)", null, (s, e) =>
            {
                OpenBrowser("https://app.tascautomation.com");
            }));

            _trayMenu.Items.Add(new ToolStripMenuItem("⚡ Open Local Bridge (127.0.0.1:3000)", null, (s, e) =>
            {
                OpenBrowser("http://127.0.0.1:3000/api/health");
            }));

            _trayMenu.Items.Add(new ToolStripMenuItem("🔄 Restart Bridge", null, (s, e) =>
            {
                StopBridgeProcess();
                Thread.Sleep(800);
                StartBridgeProcess();
                _startTime = DateTime.Now;
                ShowTrayBalloon("Restarted", "TASC Edge Bridge was restarted.", ToolTipIcon.Info);
            }));

            _trayMenu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem exitItem = new ToolStripMenuItem("❌ Exit & Quit Bridge", null, (s, e) =>
            {
                FullExit();
            });
            _trayMenu.Items.Add(exitItem);

            _trayIcon = new NotifyIcon
            {
                ContextMenuStrip = _trayMenu,
                Visible = true,
                Text = "TASC Edge Bridge (Port 3000)"
            };

            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
            if (File.Exists(iconPath))
            {
                try { _trayIcon.Icon = new Icon(iconPath); } catch { _trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                _trayIcon.Icon = SystemIcons.Application;
            }

            _trayIcon.DoubleClick += (s, e) => RestoreWindow();
            _trayIcon.Click += (s, e) =>
            {
                MouseEventArgs me = e as MouseEventArgs;
                if (me != null && me.Button == MouseButtons.Left)
                {
                    RestoreWindow();
                }
            };

            ShowTrayBalloon(
                "TASC Edge Bridge Active",
                "Listening on http://127.0.0.1:3000 for PLC & SCADA connections.\nRight-click icon anytime to manage or exit.",
                ToolTipIcon.Info);
        }

        private void RestoreWindow()
        {
            this.Show();
            this.WindowState = FormWindowState.Normal;
            this.BringToFront();
            this.Activate();
        }

        private void StartBridgeProcess()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string nodeExe = FindNodeExecutable(baseDir);
                string serverScript = FindServerScript(baseDir);

                if (string.IsNullOrEmpty(serverScript))
                {
                    UpdateStatus("🔴 Error: server.cjs not found", Color.FromArgb(248, 113, 113));
                    ShowTrayBalloon("Bridge Script Missing", "server.cjs was not found in the bridge directory.", ToolTipIcon.Error);
                    return;
                }

                if (string.IsNullOrEmpty(nodeExe))
                {
                    UpdateStatus("🔴 Error: Node.js runtime not found", Color.FromArgb(248, 113, 113));
                    ShowTrayBalloon("Node.js Required", "node.exe was not found. Please install Node.js v18+ or run installer.", ToolTipIcon.Error);
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = baseDir,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    UseShellExecute = false,
                    RedirectStandardOutput = false,
                    RedirectStandardError = false
                };

                psi.EnvironmentVariables["PORT"] = "3000";
                psi.EnvironmentVariables["NODE_ENV"] = "production";

                _nodeProcess = Process.Start(psi);
                _lblPidInfo.Text = "• Daemon Process: Running (PID " + _nodeProcess.Id + ")";
                UpdateStatus("🟢 STATUS: ONLINE", Color.FromArgb(52, 211, 153));
            }
            catch (Exception ex)
            {
                UpdateStatus("🔴 Start Failed: " + ex.Message, Color.FromArgb(248, 113, 113));
            }
        }

        private void UpdateStatus(string statusText, Color color)
        {
            if (_lblStatusBadge != null)
            {
                _lblStatusBadge.Text = statusText;
                _lblStatusBadge.ForeColor = color;
            }
            if (_trayStatusHeader != null)
            {
                _trayStatusHeader.Text = statusText;
            }
        }

        private string FindNodeExecutable(string baseDir)
        {
            // 1. Bundled nodejs/node.exe
            string bundled = Path.Combine(baseDir, "nodejs", "node.exe");
            if (File.Exists(bundled)) return bundled;

            // 2. Local node.exe in base directory
            string local = Path.Combine(baseDir, "node.exe");
            if (File.Exists(local)) return local;

            // 3. Staging nodejs/node.exe (for development environment)
            string stagingBundled = Path.Combine(baseDir, "staging", "nodejs", "node.exe");
            if (File.Exists(stagingBundled)) return stagingBundled;

            // 4. Parent nodejs/node.exe
            string parentBundled = Path.Combine(baseDir, "..", "nodejs", "node.exe");
            if (File.Exists(parentBundled)) return Path.GetFullPath(parentBundled);

            // 5. Parent staging nodejs/node.exe
            string parentStaging = Path.Combine(baseDir, "..", "staging", "nodejs", "node.exe");
            if (File.Exists(parentStaging)) return Path.GetFullPath(parentStaging);

            // 6. System PATH lookup
            try
            {
                Process p = new Process();
                p.StartInfo.FileName = "where";
                p.StartInfo.Arguments = "node.exe";
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.RedirectStandardOutput = true;
                p.StartInfo.CreateNoWindow = true;
                p.Start();
                string output = p.StandardOutput.ReadLine();
                p.WaitForExit();
                if (!string.IsNullOrEmpty(output) && File.Exists(output.Trim()))
                {
                    return output.Trim();
                }
            }
            catch { }

            return null;
        }

        private string FindServerScript(string baseDir)
        {
            // 1. dist/server.cjs
            string distScript = Path.Combine(baseDir, "dist", "server.cjs");
            if (File.Exists(distScript)) return distScript;

            // 2. server.cjs in base directory
            string rootScript = Path.Combine(baseDir, "server.cjs");
            if (File.Exists(rootScript)) return rootScript;

            // 3. staging/server.cjs
            string stagingScript = Path.Combine(baseDir, "staging", "server.cjs");
            if (File.Exists(stagingScript)) return stagingScript;

            // 4. Parent dist/server.cjs
            string parentDist = Path.Combine(baseDir, "..", "dist", "server.cjs");
            if (File.Exists(parentDist)) return Path.GetFullPath(parentDist);

            return null;
        }

        private void CheckHealth()
        {
            if (_nodeProcess != null && _nodeProcess.HasExited)
            {
                UpdateStatus("🔴 STATUS: STOPPED (Exited)", Color.FromArgb(248, 113, 113));
                _lblPidInfo.Text = "• Daemon Process: Stopped";
            }
            else if (_nodeProcess != null && !_nodeProcess.HasExited)
            {
                UpdateStatus("🟢 STATUS: ONLINE", Color.FromArgb(52, 211, 153));
                _lblPidInfo.Text = "• Daemon Process: Running (PID " + _nodeProcess.Id + ")";
            }
        }

        private void UpdateUptime()
        {
            if (_nodeProcess != null && !_nodeProcess.HasExited)
            {
                TimeSpan diff = DateTime.Now - _startTime;
                _lblUptime.Text = string.Format("• Bridge Uptime: {0:D2}:{1:D2}:{2:D2}", diff.Hours, diff.Minutes, diff.Seconds);
            }
        }

        private void StopBridgeProcess()
        {
            if (_nodeProcess != null)
            {
                try
                {
                    if (!_nodeProcess.HasExited)
                    {
                        KillProcessTree(_nodeProcess.Id);
                    }
                }
                catch { }
                finally
                {
                    _nodeProcess = null;
                }
            }
        }

        private void KillProcessTree(int pid)
        {
            try
            {
                Process killProc = new Process();
                killProc.StartInfo.FileName = "taskkill";
                killProc.StartInfo.Arguments = "/F /T /PID " + pid;
                killProc.StartInfo.CreateNoWindow = true;
                killProc.StartInfo.UseShellExecute = false;
                killProc.Start();
                killProc.WaitForExit(1500);
            }
            catch { }
        }

        private void OpenBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch { }
        }

        private void ShowTrayBalloon(string title, string text, ToolTipIcon icon)
        {
            try
            {
                if (_trayIcon != null)
                {
                    _trayIcon.ShowBalloonTip(3000, title, text, icon);
                }
            }
            catch { }
        }

        private void FullExit()
        {
            _allowExit = true;
            if (_healthTimer != null) _healthTimer.Stop();
            if (_uptimeTimer != null) _uptimeTimer.Stop();
            StopBridgeProcess();
            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
            }
            Application.Exit();
        }
    }
}
