import React, { useState } from 'react';
import { DriverConnection } from '../../../types';

interface MelsecConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
}

export const MelsecConfigForm: React.FC<MelsecConfigFormProps> = ({ conn, setField }) => {
  const [melsecTestStatus, setMelsecTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false
  });

  const testMelsecConnection = async () => {
    setMelsecTestStatus({ testing: true });
    try {
      const res = await fetch('/api/melsec/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });
      const data = await res.json();
      setMelsecTestStatus({
        testing: false,
        success: data.success,
        message: data.message || (data.success ? '✓ Connected to Mitsubishi PLC' : '✗ Failed to connect to Mitsubishi PLC')
      });
    } catch (err: any) {
      setMelsecTestStatus({
        testing: false,
        success: false,
        message: err.message || 'MELSEC probe request failed'
      });
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Test Connection Probe Feedback Banner */}
      {melsecTestStatus.testing && (
        <div className="p-2.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center space-x-2 animate-pulse">
          <i className="fas fa-circle-notch fa-spin text-rose-400"></i>
          <span>Probing Mitsubishi PLC at {conn.host || '127.0.0.1'}:{conn.port || 5007} (3E Binary Frame)...</span>
        </div>
      )}
      {!melsecTestStatus.testing && melsecTestStatus.message && (
        <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${melsecTestStatus.success ? 'bg-rose-950/70 border-rose-500/40 text-rose-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
          <div className="flex items-center space-x-2">
            <i className={`fas ${melsecTestStatus.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
            <span>{melsecTestStatus.message}</span>
          </div>
          <button type="button" onClick={() => setMelsecTestStatus({ testing: false })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
        </div>
      )}

      <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
            <i className="fas fa-microchip text-rose-400"></i>
            <span>MELSEC Communication (MC Protocol)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded-md border border-rose-700/50">
            SLMP 3E Frame
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Controller Series *</label>
            <select
              value={conn.melsecSeries || 'iq_f'}
              onChange={e => setField('melsecSeries', e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
            >
              <option value="iq_f">MELSEC iQ-F Series (FX5U / FX5UJ)</option>
              <option value="iq_r">MELSEC iQ-R Series (R04, R08, R16)</option>
              <option value="q_series">MELSEC-Q Series (Q02, Q06, Q13)</option>
              <option value="l_series">MELSEC-L Series</option>
              <option value="fx_series">MELSEC-FX Series (FX3U + ENET)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Frame Type *</label>
            <select
              value={conn.melsecFrame || '3e_binary'}
              onChange={e => setField('melsecFrame', e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-mono"
            >
              <option value="3e_binary">3E Binary Frame (Recommended)</option>
              <option value="3e_ascii">3E ASCII Frame</option>
              <option value="1e_binary">1E Binary Frame (Legacy FX)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">PLC IP Address & Port (Default: 5007) *</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={conn.host || ''}
              onChange={e => setField('host', e.target.value)}
              placeholder="192.168.1.250"
              className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-mono"
            />
            <input
              type="number"
              value={conn.port ?? 5007}
              onChange={e => setField('port', parseInt(e.target.value) || 5007)}
              min={1} max={65535}
              className="w-24 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-mono"
            />
            <button
              type="button"
              onClick={testMelsecConnection}
              disabled={melsecTestStatus.testing || !conn.host}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <i className="fas fa-bolt text-[10px]"></i>
              <span>Test PLC</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 mb-1">Network No</label>
            <input
              type="number"
              value={conn.networkNumber ?? 0}
              onChange={e => setField('networkNumber', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 mb-1">PC No</label>
            <input
              type="number"
              value={conn.pcNumber ?? 255}
              onChange={e => setField('pcNumber', parseInt(e.target.value) || 255)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 mb-1">Dest Module I/O</label>
            <input
              type="number"
              value={conn.destinationModuleIoNumber ?? 1023}
              onChange={e => setField('destinationModuleIoNumber', parseInt(e.target.value) || 1023)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-300 mb-1">Station No</label>
            <input
              type="number"
              value={conn.destinationModuleStationNumber ?? 0}
              onChange={e => setField('destinationModuleStationNumber', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
