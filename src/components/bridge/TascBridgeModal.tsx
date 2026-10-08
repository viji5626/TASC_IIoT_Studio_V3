import React, { useState, useEffect } from 'react';
import { 
  getBridgeHost, 
  setBridgeHost, 
  isHostedMode, 
  probeBridgeHealth, 
  BridgeHealthStatus 
} from '../../utils/bridgeConfig';

interface TascBridgeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const TascBridgeModal: React.FC<TascBridgeModalProps> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    setInternalIsOpen(false);
  };

  const [currentHost, setCurrentHost] = useState<string>(getBridgeHost());
  const [inputHost, setInputHost] = useState<string>(getBridgeHost());
  const [healthStatus, setHealthStatus] = useState<BridgeHealthStatus>({ online: false, host: getBridgeHost() });
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const isHosted = isHostedMode();

  const handleCopyCmd = (cmd: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(null), 2500);
    }
  };

  const GDRIVE_BRIDGE_FOLDER_URL = 'https://drive.google.com/drive/folders/18ghNYf__t5EsC-vVPrNcSU_0DEO8oX8l?usp=sharing';
  const DIRECT_INSTALLER_PATH = '/downloads/TASC_Edge_Bridge_Setup.exe';

  const handleDownloadExe = () => {
    if (isHosted) {
      window.open(GDRIVE_BRIDGE_FOLDER_URL, '_blank');
      return;
    }
    const a = document.createElement('a');
    a.href = DIRECT_INSTALLER_PATH;
    a.download = 'TASC_Edge_Bridge_Setup.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadLauncherBat = () => {
    const batContent = `@echo off
title TASC Edge Bridge - Local Industrial Hardware Gateway
echo =========================================================================
echo   TASC IIoT Studio - Local Edge Bridge Daemon
echo   Connecting app.tascautomation.com to Local Hardware ^& AI
echo =========================================================================
echo.

cd /d "%~dp0"

:: 1. Check if running inside project root
if exist "dist\\server.cjs" (
    echo [OK] Found local TASC server build.
    echo Starting Edge Bridge on http://127.0.0.1:3000 ...
    echo Keep this terminal window open while using app.tascautomation.com
    echo.
    if exist "nodejs\\node.exe" (
        "nodejs\\node.exe" "dist\\server.cjs"
    ) else (
        node "dist\\server.cjs"
    )
    goto end
)

if exist "server.ts" (
    echo [OK] Found server.ts in folder. Launching via npx tsx...
    npx -y tsx server.ts
    goto end
)

:: 2. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js is installed.
    echo.
    echo If you already cloned TASC Studio, place this file inside
    echo your project root folder (where package.json is) and run it again.
    echo.
    echo To download pre-built Windows 1-Click setup:
    echo   https://drive.google.com/drive/folders/18ghNYf__t5EsC-vVPrNcSU_0DEO8oX8l?usp=sharing
    echo.
    pause
    goto end
)

echo [!] Node.js not detected on system PATH.
echo Please download the standalone TASC_Edge_Bridge_Setup.exe installer.
pause

:end
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'start-tasc-bridge.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleOpenEvent = () => setInternalIsOpen(true);
    window.addEventListener('open-tasc-bridge-modal', handleOpenEvent);
    return () => window.removeEventListener('open-tasc-bridge-modal', handleOpenEvent);
  }, []);

  const handleProbe = async () => {
    setIsProbing(true);
    setSaveSuccess(false);
    try {
      const res = await probeBridgeHealth(2500);
      setHealthStatus(res);
    } catch {
      setHealthStatus({ online: false, host: inputHost });
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const active = getBridgeHost();
      setCurrentHost(active);
      setInputHost(active);
      handleProbe();
    }
  }, [isOpen]);

  const handleSaveHost = (targetHost: string) => {
    setBridgeHost(targetHost);
    setCurrentHost(targetHost);
    setInputHost(targetHost);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      handleProbe();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <i className="fas fa-network-wired text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>TASC Edge Bridge</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  v3.2 Local Companion
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Connects cloud web studio to local industrial PLCs, OPC UA, and Local AI models
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs">
          {/* Live Status Card */}
          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            healthStatus.online
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="relative flex h-3.5 w-3.5 shrink-0">
                {healthStatus.online ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_12px_#10b981]"></span>
                  </>
                ) : (
                  <span className="inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                  <span>{healthStatus.online ? 'Bridge Connected & Active' : 'Edge Bridge Offline / Not Detected'}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Target Host: <span className="text-slate-200 font-semibold">{currentHost}</span>
                  {healthStatus.online && (
                    <span className="text-emerald-400 ml-2">✓ Modbus, S7, Mitsubishi & OPC UA ready</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isProbing}
              onClick={handleProbe}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <i className={`fas fa-rotate-right ${isProbing ? 'animate-spin text-indigo-400' : ''}`}></i>
              <span>{isProbing ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Bridge Host Setting */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 flex items-center space-x-2">
                <i className="fas fa-server text-indigo-400"></i>
                <span>Bridge Gateway Address</span>
              </label>
              {saveSuccess && (
                <span className="text-emerald-400 text-[11px] font-bold animate-in fade-in">
                  ✓ Address updated!
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputHost}
                onChange={(e) => setInputHost(e.target.value)}
                placeholder="e.g. 127.0.0.1:3000 or 192.168.1.100:3000"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleSaveHost(inputHost)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
              >
                Save
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center space-x-2 pt-1 text-[11px]">
              <span className="text-slate-500">Presets:</span>
              <button
                type="button"
                onClick={() => handleSaveHost('127.0.0.1:3000')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors cursor-pointer"
              >
                127.0.0.1:3000 (Local PC)
              </button>
              <button
                type="button"
                onClick={() => handleSaveHost('localhost:3000')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors cursor-pointer"
              >
                localhost:3000
              </button>
            </div>
          </div>

          {/* Supported Protocols Matrix */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="font-bold text-slate-200 flex items-center space-x-2">
              <i className="fas fa-layer-group text-sky-400"></i>
              <span>Hardware Protocols Routed Through Edge Bridge</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
                <i className="fas fa-microchip text-emerald-400 text-sm"></i>
                <div>
                  <span className="font-bold text-slate-200 block">Modbus TCP & RTU</span>
                  <span className="text-slate-500 text-[10px]">Port 502 / Coils & Registers</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
                <i className="fas fa-industry text-blue-400 text-sm"></i>
                <div>
                  <span className="font-bold text-slate-200 block">Siemens S7 (S7-1200 / 1500 / 300)</span>
                  <span className="text-slate-500 text-[10px]">Port 102 / S7Comm DB Blocks</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
                <i className="fas fa-cogs text-rose-400 text-sm"></i>
                <div>
                  <span className="font-bold text-slate-200 block">Mitsubishi MELSEC (SLMP / MC)</span>
                  <span className="text-slate-500 text-[10px]">FX5U, iQ-R, Q, L / 3E Binary Frames</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-2.5">
                <i className="fas fa-sitemap text-amber-400 text-sm"></i>
                <div>
                  <span className="font-bold text-slate-200 block">OPC UA & OPC DA</span>
                  <span className="text-slate-500 text-[10px]">Hierarchical Node Browser & Subscriptions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Download & Launch Instructions */}
          <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-300 font-bold">
                <i className="fas fa-rocket"></i>
                <span>Start Edge Bridge on This PC</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded font-mono">
                Port :3000
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              If the Edge Bridge is not yet running on your computer, download the standalone Windows setup below. No Git or Node.js installation is required:
            </p>

            {/* Featured Hero: 1-Click Standalone Installer (.EXE) */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/40 text-left shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm">
                    <i className="fab fa-windows"></i>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white flex items-center space-x-2">
                      <span>TASC Edge Bridge (Windows .EXE Setup)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Recommended
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Standalone Inno Setup Installer • Built for PLC & SCADA Engineers (~73.5 MB)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadExe}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer group"
                  >
                    <i className="fas fa-download group-hover:scale-110 transition-transform"></i>
                    <span>Download .EXE Setup</span>
                  </button>
                  <a
                    href={GDRIVE_BRIDGE_FOLDER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/50 text-sky-200 text-xs font-bold flex items-center space-x-2 transition-colors group"
                  >
                    <i className="fab fa-google-drive text-amber-400 group-hover:scale-110 transition-transform"></i>
                    <span>Google Drive Mirror (All 3 Files)</span>
                  </a>
                </div>
              </div>

              {/* Feature Highlights for PLC Engineers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-300">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-microchip text-emerald-400"></i>
                  <span>Zero setup: Includes Node + Drivers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-window-minimize text-sky-400"></i>
                  <span>Closing <strong>[X]</strong> minimizes to System Tray</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-power-off text-rose-400"></i>
                  <span>Right-click tray icon & select <strong>Quit</strong></span>
                </div>
              </div>

              {/* Secondary Options */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <i className="fas fa-folder-open text-sky-400"></i>
                  <span>Google Drive includes: <code>TASC_Edge_Bridge_Setup.exe</code>, portable <code>TascEdgeBridge.exe</code>, and <code>README.md</code>.</span>
                </span>

                <button
                  type="button"
                  onClick={handleDownloadLauncherBat}
                  className="text-slate-400 hover:text-slate-200 flex items-center space-x-1 cursor-pointer"
                >
                  <i className="fas fa-file-code"></i>
                  <span>Download Portable .BAT Script</span>
                </button>
              </div>
            </div>

            {/* Local Developer Option (Terminal Run) */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-left flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <i className="fas fa-terminal text-slate-400 text-xs"></i>
                <span className="text-slate-400">Already cloned the repository locally? Run terminal:</span>
                <code className="bg-slate-950 text-emerald-400 px-2 py-0.5 rounded font-mono text-[11px]">
                  npm run dev
                </code>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCmd('npm run dev')}
                className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[10px] transition-colors cursor-pointer"
              >
                {copiedCmd === 'npm run dev' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Browser Permission Guide (Mixed Content on HTTPS) */}
          {isHosted && (
            <div className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-4 space-y-2.5 text-[11px] text-amber-200/95">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-amber-300 text-xs">
                  <i className="fas fa-shield-halved text-amber-400"></i>
                  <span>Important: Allow Insecure Content in Chrome & Edge</span>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <i className="fas fa-rotate-right text-[9px]"></i>
                  <span>Reload Page</span>
                </button>
              </div>

              <p className="leading-relaxed text-slate-300">
                Because <strong>https://app.tascautomation.com</strong> is loaded over secure HTTPS, Chrome & Edge automatically block requests to local addresses (<code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">http://127.0.0.1:3000</code>) as mixed content by default.
              </p>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-500/30 space-y-1.5">
                <div className="font-semibold text-amber-300 text-xs flex items-center space-x-1.5">
                  <i className="fas fa-wrench"></i>
                  <span>2-Click Fix in Chrome / Edge:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                  <li>Click the <strong>Tune / Lock icon</strong> <i className="fas fa-sliders text-amber-400 mx-1"></i> on the left side of the address bar next to <code className="text-sky-300 font-mono">app.tascautomation.com</code>.</li>
                  <li>Click <strong>Site settings</strong>.</li>
                  <li>Scroll down to <strong>Insecure content</strong> and change from <em>Block (default)</em> to <strong className="text-emerald-400">Allow</strong>.</li>
                  <li>Come back and click <strong>Reload Page</strong> — your Edge Bridge pill will turn <span className="text-emerald-400 font-bold">🟢 ONLINE</span> immediately!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            TASC IIoT Studio Edge Companion
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
