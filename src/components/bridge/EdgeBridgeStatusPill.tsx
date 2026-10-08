import React, { useState, useEffect } from 'react';
import { isHostedMode, getBridgeHost, probeBridgeHealth, openBridgeModal } from '../../utils/bridgeConfig';

export const EdgeBridgeStatusPill: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [bridgeHost, setBridgeHostState] = useState<string>(getBridgeHost());
  const isHosted = isHostedMode();

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await probeBridgeHealth(2000);
      setIsOnline(res.online);
      setBridgeHostState(res.host);
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);

    const onHostChange = (e: any) => {
      setBridgeHostState(e.detail || getBridgeHost());
      setTimeout(checkHealth, 300);
    };

    window.addEventListener('tasc-bridge-host-changed', onHostChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tasc-bridge-host-changed', onHostChange);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={openBridgeModal}
      className={`flex items-center space-x-1.5 px-2.5 sm:px-3 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border shadow-sm ${
        isOnline
          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
          : isHosted
          ? 'bg-slate-800/80 text-amber-300/90 border-amber-500/40 hover:bg-slate-700/80 hover:text-amber-200'
          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700/80'
      }`}
      title={
        isOnline
          ? `TASC Edge Bridge is connected on ${bridgeHost}. PLC Drivers & Local AI active.`
          : isHosted
          ? 'TASC Edge Bridge is offline. Click to download or configure local PLC bridge.'
          : 'Local Server running on this machine.'
      }
    >
      {/* LED Bulb */}
      <div className="relative flex h-2.5 w-2.5 shrink-0">
        {isOnline ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          </>
        ) : (
          <span className={`inline-flex rounded-full h-2.5 w-2.5 ${isHosted ? 'bg-amber-400/80' : 'bg-slate-500'}`}></span>
        )}
      </div>

      <div className="flex items-center space-x-1 font-mono text-[11px]">
        <i className="fas fa-network-wired text-[10px] text-slate-400"></i>
        <span className="hidden md:inline font-sans font-bold">
          {isOnline ? 'Bridge:' : 'Bridge:'}
        </span>
        <span className={isOnline ? 'text-emerald-300 font-bold' : isHosted ? 'text-amber-300 font-bold' : 'text-slate-400'}>
          {isOnline ? 'ONLINE' : isHosted ? 'OFFLINE' : 'LOCAL'}
        </span>
      </div>

      {isChecking && (
        <i className="fas fa-rotate text-[9px] text-slate-500 animate-spin ml-0.5"></i>
      )}
    </button>
  );
};
