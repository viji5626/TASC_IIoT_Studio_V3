import React, { useState } from 'react';
import { DriverConnection } from '../../../types';

interface Iec61850ConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
}

export const Iec61850ConfigForm: React.FC<Iec61850ConfigFormProps> = ({ conn, setField }) => {
  const [iecTestStatus, setIecTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false
  });

  const testIecConnection = async () => {
    setIecTestStatus({ testing: true });
    try {
      const res = await fetch('/api/iec61850/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });
      const data = await res.json();
      setIecTestStatus({
        testing: false,
        success: data.success,
        message: data.message || (data.success ? '✓ Connected to IED successfully' : '✗ Failed to connect to IED')
      });
    } catch (err: any) {
      setIecTestStatus({
        testing: false,
        success: false,
        message: err.message || 'Probe request failed'
      });
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Test Connection Probe Feedback Banner */}
      {iecTestStatus.testing && (
        <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2 animate-pulse">
          <i className="fas fa-circle-notch fa-spin text-emerald-400"></i>
          <span>Probing IED at {conn.host || '127.0.0.1'}:{conn.port || conn.mmsPort || 102} via MMS (Port 102)...</span>
        </div>
      )}
      {!iecTestStatus.testing && iecTestStatus.message && (
        <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${iecTestStatus.success ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
          <div className="flex items-center space-x-2">
            <i className={`fas ${iecTestStatus.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
            <span>{iecTestStatus.message}</span>
          </div>
          <button type="button" onClick={() => setIecTestStatus({ testing: false })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
        </div>
      )}

      {/* IED Core Communication Settings */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <i className="fas fa-bolt text-emerald-400"></i>
            <span>IED MMS Communication</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded-md border border-emerald-700/50">
            libIEC61850 Stack
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">IED Identifier / Model Name *</label>
            <input
              type="text"
              value={conn.iedName || ''}
              onChange={e => setField('iedName', e.target.value)}
              placeholder="e.g. SEL_751_FEEDER1, SIPROTEC_5"
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">MMS Port (Default: 102) *</label>
            <input
              type="number"
              value={conn.port ?? conn.mmsPort ?? 102}
              onChange={e => {
                const val = parseInt(e.target.value) || 102;
                setField('port', val);
                setField('mmsPort', val);
              }}
              min={1} max={65535}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">IED Host IP Address *</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={conn.host || ''}
              onChange={e => setField('host', e.target.value)}
              placeholder="192.168.1.100 or 127.0.0.1"
              className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="button"
              onClick={testIecConnection}
              disabled={iecTestStatus.testing || !conn.host}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <i className="fas fa-bolt text-[10px]"></i>
              <span>Test IED</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">AP-Title</label>
            <input
              type="text"
              value={conn.apTitle || '1.1.1.999.1'}
              onChange={e => setField('apTitle', e.target.value)}
              placeholder="1.1.1.999.1"
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">AE-Qualifier</label>
            <input
              type="number"
              value={conn.aeQualifier ?? 12}
              onChange={e => setField('aeQualifier', parseInt(e.target.value) || 12)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* GOOSE Real-Time Subscribing */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-wave-square text-emerald-400 text-xs"></i>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">GOOSE Event Subscribing</span>
          </div>
          <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(conn.enableGoose)}
              onChange={e => setField('enableGoose', e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-600"
            />
            <span className="font-semibold text-slate-300">Enable GOOSE</span>
          </label>
        </div>

        {conn.enableGoose && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Network Interface</label>
              <input
                type="text"
                value={conn.gooseInterface || 'eth0'}
                onChange={e => setField('gooseInterface', e.target.value)}
                placeholder="eth0, enp3s0"
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">AppID Filter</label>
              <input
                type="text"
                value={conn.gooseAppId || '0x0001'}
                onChange={e => setField('gooseAppId', e.target.value)}
                placeholder="0x0001"
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
