using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace TascIIoTStudio
{
    static class Program
    {
        private const string MutexName = "Global\\TASC_IIoT_Studio_Main_Mutex_v2";
        private static Mutex _mutex;

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [STAThread]
        static void Main(string[] args)
        {
            // Process command-line flags
            bool stopRequested = false;
            bool debugMode = false;
            bool openOnly = false;

            if (args != null && args.Length > 0)
            {
                foreach (string arg in args)
                {
                    string a = arg.Trim().ToLowerInvariant();
                    if (a == "--stop" || a == "-stop" || a == "/stop")
                    {
                        stopRequested = true;
                    }
                    else if (a == "--debug" || a == "-debug" || a == "/debug" || a == "--console")
                    {
                        debugMode = true;
                    }
                    else if (a == "--open" || a == "-open" || a == "/open")
                    {
                        openOnly = true;
                    }
                }
            }

            if (stopRequested)
            {
                StudioProcessManager.TerminateAllTascServices();
                return;
            }

            bool createdNew;
            _mutex = new Mutex(true, MutexName, out createdNew);

            if (!createdNew)
            {
                // App already running: launch or focus UI window and notify user
                StudioProcessManager.LaunchScadaWindow("http://localhost:3000");

                MessageBox.Show(
                    "TASC IIoT Studio is already running!\n\nThe SCADA interface has been opened.\nCheck the Windows System Tray near your clock for the TASC icon.",
                    "TASC IIoT Studio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            using (StudioTrayApplicationContext context = new StudioTrayApplicationContext(debugMode, openOnly))
            {
                Application.Run(context);
            }

            try
            {
                _mutex.ReleaseMutex();
            }
            catch { }
        }
    }

    public class StudioTrayApplicationContext : ApplicationContext
    {
        private const int TargetPort = 3000;
        private readonly string _serverUrl = "http://localhost:" + TargetPort;
        private readonly bool _debugMode;
        private readonly bool _openOnly;

        private NotifyIcon _trayIcon;
        private ContextMenuStrip _trayMenu;
        private ToolStripMenuItem _statusHeader;
        private Process _nodeProcess;
        private System.Windows.Forms.Timer _healthTimer;
        private DateTime _startTime;
        private bool _windowLaunched = false;

        public StudioTrayApplicationContext(bool debugMode, bool openOnly)
        {
            _debugMode = debugMode;
            _openOnly = openOnly;
            _startTime = DateTime.Now;

            InitializeTray();
            StartCoreServer();

            // Background health check & monitor timer (every 3 seconds)
            _healthTimer = new System.Windows.Forms.Timer { Interval = 3000 };
            _healthTimer.Tick += (s, e) => CheckHealth();
            _healthTimer.Start();

            // Background waiter for port 3000 to launch the SCADA App Window
            Thread launchThread = new Thread(WaitForServerAndLaunchWindow)
            {
                IsBackground = true
            };
            launchThread.Start();

            AppDomain.CurrentDomain.ProcessExit += (s, e) => Shutdown();
        }

        private void InitializeTray()
        {
            _trayMenu = new ContextMenuStrip();

            _statusHeader = new ToolStripMenuItem("⚡ TASC IIoT Studio (Starting...)")
            {
                Enabled = false,
                Font = new Font(_trayMenu.Font, FontStyle.Bold)
            };
            _trayMenu.Items.Add(_statusHeader);
            _trayMenu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem openWindowItem = new ToolStripMenuItem("🖥️ Open SCADA Studio Window", null, (s, e) =>
            {
                StudioProcessManager.LaunchScadaWindow(_serverUrl);
            })
            {
                Font = new Font(_trayMenu.Font, FontStyle.Bold)
            };
            _trayMenu.Items.Add(openWindowItem);

            _trayMenu.Items.Add(new ToolStripMenuItem("🌐 Open in Web Browser", null, (s, e) =>
            {
                StudioProcessManager.OpenInDefaultBrowser(_serverUrl);
            }));

            _trayMenu.Items.Add(new ToolStripMenuItem("📋 Status & Port Diagnostics", null, (s, e) =>
            {
                ShowDiagnosticsDialog();
            }));

            _trayMenu.Items.Add(new ToolStripMenuItem("🔄 Restart Studio Core", null, (s, e) =>
            {
                RestartCore();
            }));

            _trayMenu.Items.Add(new ToolStripSeparator());

            _trayMenu.Items.Add(new ToolStripMenuItem("🛑 Stop & Exit Studio", null, (s, e) =>
            {
                Shutdown();
                ExitThread();
            }));

            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
            Icon iconToUse = null;
            if (File.Exists(iconPath))
            {
                try { iconToUse = new Icon(iconPath); } catch { }
            }
            if (iconToUse == null)
            {
                iconToUse = SystemIcons.Application;
            }

            _trayIcon = new NotifyIcon
            {
                Icon = iconToUse,
                ContextMenuStrip = _trayMenu,
                Text = "TASC IIoT Studio - Industrial Core (:3000)",
                Visible = true
            };

            // Left click or double click opens the SCADA window
            _trayIcon.DoubleClick += (s, e) => StudioProcessManager.LaunchScadaWindow(_serverUrl);
            _trayIcon.Click += (s, e) =>
            {
                MouseEventArgs me = e as MouseEventArgs;
                if (me != null && me.Button == MouseButtons.Left)
                {
                    StudioProcessManager.LaunchScadaWindow(_serverUrl);
                }
            };
        }

        private void StartCoreServer()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string nodeExe = StudioProcessManager.FindNodeExecutable(baseDir);
                string serverScript = StudioProcessManager.FindServerScript(baseDir);

                if (string.IsNullOrEmpty(serverScript))
                {
                    UpdateStatusText("🔴 Error: server.cjs not found");
                    ShowBalloon("Startup Error", "dist\\server.cjs was not found.", ToolTipIcon.Error);
                    return;
                }

                if (string.IsNullOrEmpty(nodeExe))
                {
                    UpdateStatusText("🔴 Error: Node.js not found");
                    ShowBalloon("Node.js Required", "Node.js executable was not found. Please verify installation.", ToolTipIcon.Error);
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = baseDir,
                    CreateNoWindow = !_debugMode,
                    WindowStyle = _debugMode ? ProcessWindowStyle.Normal : ProcessWindowStyle.Hidden,
                    UseShellExecute = false
                };

                psi.EnvironmentVariables["PORT"] = TargetPort.ToString();
                psi.EnvironmentVariables["NODE_ENV"] = "production";
                psi.EnvironmentVariables["TASC_STUDIO_STANDALONE"] = "1";

                _nodeProcess = Process.Start(psi);
                UpdateStatusText("🟡 Initializing Core (Port " + TargetPort + ")...");
            }
            catch (Exception ex)
            {
                UpdateStatusText("🔴 Start Failed: " + ex.Message);
                ShowBalloon("Core Launch Error", ex.Message, ToolTipIcon.Error);
            }
        }

        private void WaitForServerAndLaunchWindow()
        {
            int retries = 70; // 70 * 500ms = 35 seconds
            bool ready = false;

            while (retries > 0)
            {
                try
                {
                    using (TcpClient tcp = new TcpClient())
                    {
                        IAsyncResult result = tcp.BeginConnect("127.0.0.1", TargetPort, null, null);
                        bool success = result.AsyncWaitHandle.WaitOne(400);
                        if (success && tcp.Connected)
                        {
                            tcp.EndConnect(result);
                            ready = true;
                            break;
                        }
                    }
                }
                catch { }

                Thread.Sleep(500);
                retries--;
            }

            if (ready)
            {
                UpdateStatusText("🟢 TASC IIoT Studio: Online (:3000)");

                if (!_windowLaunched)
                {
                    _windowLaunched = true;
                    StudioProcessManager.LaunchScadaWindow(_serverUrl);
                    ShowBalloon("TASC IIoT Studio Online", "Industrial Core listening on http://localhost:3000.\nSCADA App Window launched.", ToolTipIcon.Info);
                }
            }
            else
            {
                UpdateStatusText("⚠️ Warning: Port 3000 Delayed");
            }
        }

        private void CheckHealth()
        {
            if (_nodeProcess != null && _nodeProcess.HasExited)
            {
                UpdateStatusText("🔴 Core Stopped (Process Exited)");
            }
            else if (_nodeProcess != null && !_nodeProcess.HasExited)
            {
                UpdateStatusText("🟢 TASC IIoT Studio: Online (:3000)");
            }
        }

        private void UpdateStatusText(string text)
        {
            if (_statusHeader != null)
            {
                if (_trayMenu.InvokeRequired)
                {
                    _trayMenu.BeginInvoke(new Action(() => _statusHeader.Text = text));
                }
                else
                {
                    _statusHeader.Text = text;
                }
            }
            if (_trayIcon != null)
            {
                string shortText = text.Length > 63 ? text.Substring(0, 60) + "..." : text;
                _trayIcon.Text = shortText;
            }
        }

        private void ShowDiagnosticsDialog()
        {
            TimeSpan uptime = DateTime.Now - _startTime;
            string pid = _nodeProcess != null && !_nodeProcess.HasExited ? _nodeProcess.Id.ToString() : "Not Running";

            string msg = string.Format(
                "TASC IIoT Studio v2.12.0 - Diagnostics\n\n" +
                "• Status: {0}\n" +
                "• Core Server Port: {1}\n" +
                "• Web URL: {2}\n" +
                "• Node.js PID: {3}\n" +
                "• Uptime: {4:D2}h {5:D2}m {6:D2}s\n" +
                "• Directory: {7}\n\n" +
                "Click OK to return to system tray.",
                (_nodeProcess != null && !_nodeProcess.HasExited) ? "Online" : "Stopped",
                TargetPort,
                _serverUrl,
                pid,
                uptime.Hours, uptime.Minutes, uptime.Seconds,
                AppDomain.CurrentDomain.BaseDirectory);

            MessageBox.Show(msg, "TASC IIoT Studio Diagnostics", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void RestartCore()
        {
            StopNodeProcess();
            Thread.Sleep(800);
            StartCoreServer();
            _startTime = DateTime.Now;
            _windowLaunched = false;

            Thread launchThread = new Thread(WaitForServerAndLaunchWindow) { IsBackground = true };
            launchThread.Start();

            ShowBalloon("Restarted", "TASC IIoT Studio Core service was restarted.", ToolTipIcon.Info);
        }

        private void StopNodeProcess()
        {
            if (_nodeProcess != null)
            {
                try
                {
                    if (!_nodeProcess.HasExited)
                    {
                        StudioProcessManager.KillProcessTree(_nodeProcess.Id);
                    }
                }
                catch { }
                finally
                {
                    _nodeProcess = null;
                }
            }
        }

        private void Shutdown()
        {
            StopNodeProcess();
            StudioProcessManager.TerminateAllTascServices();

            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
                _trayIcon = null;
            }
        }

        private void ShowBalloon(string title, string text, ToolTipIcon icon)
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
    }

    public static class StudioProcessManager
    {
        public static string FindNodeExecutable(string baseDir)
        {
            // 1. Bundled nodejs/node.exe in application folder
            string bundled = Path.Combine(baseDir, "nodejs", "node.exe");
            if (File.Exists(bundled)) return bundled;

            // 2. node.exe directly in base directory
            string local = Path.Combine(baseDir, "node.exe");
            if (File.Exists(local)) return local;

            // 3. Search PATH for system node
            string pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                string[] paths = pathEnv.Split(';');
                foreach (string dir in paths)
                {
                    try
                    {
                        string candidate = Path.Combine(dir.Trim(), "node.exe");
                        if (File.Exists(candidate)) return candidate;
                    }
                    catch { }
                }
            }

            return "node.exe";
        }

        public static string FindServerScript(string baseDir)
        {
            // 1. dist/server.cjs
            string distScript = Path.Combine(baseDir, "dist", "server.cjs");
            if (File.Exists(distScript)) return distScript;

            // 2. server.cjs in base directory
            string rootScript = Path.Combine(baseDir, "server.cjs");
            if (File.Exists(rootScript)) return rootScript;

            // 3. staging/dist/server.cjs
            string stagingDist = Path.Combine(baseDir, "staging", "dist", "server.cjs");
            if (File.Exists(stagingDist)) return stagingDist;

            return null;
        }

        public static void LaunchScadaWindow(string url)
        {
            string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
            if (!File.Exists(edge))
            {
                edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
            }

            string chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe");
            if (!File.Exists(chrome))
            {
                chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe");
            }

            string browser = null;
            if (File.Exists(edge)) browser = edge;
            else if (File.Exists(chrome)) browser = chrome;

            try
            {
                if (!string.IsNullOrEmpty(browser))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = browser,
                        Arguments = "--app=" + url + " --start-maximized",
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }
                else
                {
                    OpenInDefaultBrowser(url);
                }
            }
            catch
            {
                OpenInDefaultBrowser(url);
            }
        }

        public static void OpenInDefaultBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch { }
        }

        public static void KillProcessTree(int pid)
        {
            try
            {
                Process killProc = new Process();
                killProc.StartInfo.FileName = "taskkill";
                killProc.StartInfo.Arguments = "/F /T /PID " + pid;
                killProc.StartInfo.CreateNoWindow = true;
                killProc.StartInfo.UseShellExecute = false;
                killProc.Start();
                killProc.WaitForExit(3000);
            }
            catch { }
        }

        public static void TerminateAllTascServices()
        {
            // Kill any processes listening on port 3000 (core) and 8765 (Python AI daemon)
            KillProcessOnPort(3000);
            KillProcessOnPort(8765);

            // Kill standalone helper daemons
            KillProcessByName("llama-server");
        }

        private static void KillProcessOnPort(int port)
        {
            try
            {
                Process netstat = new Process();
                netstat.StartInfo.FileName = "netstat";
                netstat.StartInfo.Arguments = "-aon";
                netstat.StartInfo.UseShellExecute = false;
                netstat.StartInfo.RedirectStandardOutput = true;
                netstat.StartInfo.CreateNoWindow = true;
                netstat.Start();

                string output = netstat.StandardOutput.ReadToEnd();
                netstat.WaitForExit(2000);

                string[] lines = output.Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string line in lines)
                {
                    if (line.Contains(":" + port) && line.Contains("LISTENING"))
                    {
                        string[] tokens = line.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        if (tokens.Length > 0)
                        {
                            string pidStr = tokens[tokens.Length - 1];
                            int pid;
                            if (int.TryParse(pidStr, out pid) && pid > 0)
                            {
                                KillProcessTree(pid);
                            }
                        }
                    }
                }
            }
            catch { }
        }

        private static void KillProcessByName(string processName)
        {
            try
            {
                Process[] procs = Process.GetProcessesByName(processName);
                foreach (Process p in procs)
                {
                    try { p.Kill(); } catch { }
                }
            }
            catch { }
        }
    }
}
