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
  const isHosted = isHostedMode();

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
          <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold">
              <i className="fas fa-download"></i>
              <span>Download & Start Edge Bridge on Your PC</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              If the bridge is not running on this computer, download the standalone lightweight package or run the portable launcher script:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Full Installer */}
              <a
                href="https://github.com/viji5626/TASC_IIoT_Studio_V3/releases"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <i className="fab fa-windows text-lg text-indigo-400"></i>
                  <div>
                    <span className="font-bold text-xs block group-hover:text-white">Windows Installer</span>
                    <span className="text-[10px] text-slate-400">Includes Inno Setup & Background Service</span>
                  </div>
                </div>
                <i className="fas fa-arrow-up-right-from-square text-xs text-indigo-400 group-hover:translate-x-0.5 transition-transform"></i>
              </a>

              {/* Option 2: Portable Script */}
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <i className="fas fa-terminal text-lg text-amber-400"></i>
                  <div>
                    <span className="font-bold text-xs block text-slate-100">Portable 1-Click Launcher</span>
                    <span className="text-[10px] text-slate-400 font-mono">start-tasc.bat (in project root)</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                  port :3000
                </span>
              </div>
            </div>
          </div>

          {/* Browser Permission Guide (Mixed Content on HTTPS) */}
          {isHosted && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 space-y-2 text-[11px] text-amber-200/90">
              <div className="flex items-center space-x-2 font-bold text-amber-300">
                <i className="fas fa-shield-halved"></i>
                <span>Browser Security Tip (Chrome & Edge on HTTPS):</span>
              </div>
              <p className="leading-relaxed">
                When loading <strong>https://app.tascautomation.com</strong>, browsers block connections to local IP addresses (<code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-100">http://127.0.0.1</code>) by default.
              </p>
              <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg border border-amber-500/20 text-slate-300">
                <span className="font-bold text-amber-400">Fix:</span>
                <span>Click the <strong>Tune / Lock icon</strong> next to the URL ➔ <strong>Site settings</strong> ➔ Set <strong>Insecure content</strong> to <strong>Allow</strong> ➔ Reload.</span>
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
