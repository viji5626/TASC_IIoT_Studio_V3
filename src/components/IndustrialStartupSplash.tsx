import React, { useState, useEffect, useRef } from 'react';

interface IndustrialStartupSplashProps {
  onComplete: () => void;
}

interface BootStep {
  id: string;
  subsystem: string;
  desc: string;
  status: 'pending' | 'active' | 'done';
}

export const IndustrialStartupSplash: React.FC<IndustrialStartupSplashProps> = ({ onComplete }) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [steps, setSteps] = useState<BootStep[]>([
    { id: 'kernel', subsystem: 'SYS_CORE', desc: 'Windows x64 Native Runtime & Hardware Bus', status: 'active' },
    { id: 'poller', subsystem: 'POLL_MGR', desc: 'High-Frequency 100ms Tag Telemetry Engine', status: 'pending' },
    { id: 'sql', subsystem: 'DB_HISTORIAN', desc: 'SQL Server Native Pools & Time-Series DB', status: 'pending' },
    { id: 'drivers', subsystem: 'IO_DRIVERS', desc: 'Modbus TCP, OPC-UA & MQTT Industrial Bridges', status: 'pending' },
    { id: 'ai', subsystem: 'EDGE_AI', desc: 'Embedded Neural LFM Copilot & Vision Daemon', status: 'pending' },
  ]);

  useEffect(() => {
    // Check if splash has already been shown in this tab session
    const hasShown = sessionStorage.getItem('tasc_splash_shown');
    if (hasShown === 'true') {
      onCompleteRef.current();
      return;
    }

    const startTime = Date.now();
    const duration = 2600; // 2.6s total boot sequence

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      // Transition boot checklist steps based on percentage
      const stepIdx = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
      setCurrentStepIndex(stepIdx);

      setSteps(prev =>
        prev.map((step, idx) => {
          if (idx < stepIdx) return { ...step, status: 'done' };
          if (idx === stepIdx) return { ...step, status: 'active' };
          return { ...step, status: 'pending' };
        })
      );

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            sessionStorage.setItem('tasc_splash_shown', 'true');
            onCompleteRef.current();
          }, 500);
        }, 300);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  const handleSkip = () => {
    sessionStorage.setItem('tasc_splash_shown', 'true');
    setIsFadingOut(true);
    setTimeout(() => onCompleteRef.current(), 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#06090f] text-slate-200 flex flex-col items-center justify-between select-none overflow-hidden transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 35%, rgba(6, 182, 212, 0.12) 0%, transparent 60%),
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 32px 32px, 32px 32px'
      }}
    >
      {/* Top Industrial Status Banner */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
            TASC IIoT Studio // Industrial Workstation Core
          </span>
        </div>
        <div className="flex items-center space-x-4 text-[10px] font-mono text-slate-400">
          <span>PORT: 3000 [OFFLINE]</span>
          <span className="hidden sm:inline">ARCH: x64 WIN32</span>
          <span className="text-emerald-400 font-bold">● HOST READY</span>
        </div>
      </div>

      {/* Centerpiece: Glowing TASC Industrial Logo & Branding */}
      <div className="flex flex-col items-center justify-center my-auto px-4 max-w-xl w-full text-center">
        {/* Logo Container with Glowing Ring & Scanline Pulse */}
        <div className="relative group mb-6">
          <div className="absolute -inset-4 rounded-3xl bg-cyan-500/20 blur-2xl animate-pulse" />
          <div className="relative p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.25)] flex flex-col items-center">
            <img
              src="/logo.png"
              alt="TASC Logo"
              className="h-24 sm:h-28 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            />
          </div>
        </div>

        {/* Industrial Signal Pulse Bar */}
        <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md mb-6">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400 flex items-center space-x-2">
              <i className="fas fa-microchip text-cyan-400 text-xs animate-spin" />
              <span>INITIALIZING SCADA KERNEL</span>
            </span>
            <span className="font-bold text-cyan-300 font-mono text-sm tracking-wider">
              {progress}%
            </span>
          </div>

          {/* Glowing Animated Progress Track */}
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Diagnostic Boot Checklist */}
        <div className="w-full bg-black/60 border border-slate-800/70 rounded-xl p-3 text-left font-mono text-[11px] space-y-1.5 backdrop-blur-sm">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                s.status === 'active'
                  ? 'bg-cyan-950/40 text-cyan-300 border-l-2 border-cyan-400'
                  : s.status === 'done'
                  ? 'text-slate-400'
                  : 'text-slate-600'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-[10px] font-bold text-slate-500">[{s.subsystem}]</span>
                <span className="truncate">{s.desc}</span>
              </div>
              <div className="shrink-0 ml-3 font-bold text-[10px]">
                {s.status === 'done' ? (
                  <span className="text-emerald-400">✓ READY</span>
                ) : s.status === 'active' ? (
                  <span className="text-cyan-400 animate-pulse">● BOOTING...</span>
                ) : (
                  <span className="text-slate-700">WAIT</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Industrial Disclaimer & Fast-Skip Control */}
      <div className="w-full px-6 py-3 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div>
          <span>TENACIOUS AUTOMATION SOLUTIONS & CONSULTING</span>
          <span className="hidden sm:inline text-slate-600"> | v2.12.0 Enterprise</span>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-cyan-400 hover:text-cyan-300 font-bold tracking-wider cursor-pointer transition-colors flex items-center space-x-1.5"
        >
          <span>ENTER STUDIO</span>
          <i className="fas fa-angles-right text-xs" />
        </button>
      </div>
    </div>
  );
};
