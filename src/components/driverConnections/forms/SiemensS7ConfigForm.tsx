import React, { useState } from 'react';
import { DriverConnection } from '../../../types';

interface SiemensS7ConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
}

export const SiemensS7ConfigForm: React.FC<SiemensS7ConfigFormProps> = ({ conn, setField }) => {
  const [s7TestStatus, setS7TestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false
  });

  const testS7Connection = async () => {
    setS7TestStatus({ testing: true });
    try {
      const res = await fetch('/api/s7/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });
      const data = await res.json();
      setS7TestStatus({
        testing: false,
        success: data.success,
        message: data.message || (data.success ? '✓ Connected to Siemens S7 PLC' : '✗ Failed to connect to Siemens S7 PLC')
      });
    } catch (err: any) {
      setS7TestStatus({
        testing: false,
        success: false,
        message: err.message || 'S7 probe request failed'
      });
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Test Connection Probe Feedback Banner */}
      {s7TestStatus.testing && (
        <div className="p-2.5 bg-cyan-950/70 border border-cyan-500/40 rounded-xl text-cyan-200 text-xs flex items-center space-x-2 animate-pulse">
          <i className="fas fa-circle-notch fa-spin text-cyan-400"></i>
          <span>Probing Siemens S7 PLC at {conn.host || '127.0.0.1'}:{conn.port || 102} (Rack {conn.rack ?? 0}, Slot {conn.slot ?? 1})...</span>
        </div>
      )}
      {!s7TestStatus.testing && s7TestStatus.message && (
        <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${s7TestStatus.success ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
          <div className="flex items-center space-x-2">
            <i className={`fas ${s7TestStatus.success ? 'fa-circle-check text-cyan-400' : 'fa-circle-xmark text-rose-400'}`}></i>
            <span>{s7TestStatus.message}</span>
          </div>
          <button type="button" onClick={() => setS7TestStatus({ testing: false })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
        </div>
      )}

      <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <i className="fas fa-industry text-cyan-400"></i>
            <span>Siemens S7Comm Parameters</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-900/60 text-cyan-300 rounded-md border border-cyan-700/50">
            Snap7 / ISO-on-TCP
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">PLC Hardware Series *</label>
            <select
              value={conn.s7Model || 's7_1500'}
              onChange={e => {
                const model = e.target.value as any;
                setField('s7Model', model);
                if (model === 's7_300' || model === 's7_400') {
                  setField('slot', 2);
                } else {
                  setField('slot', 1);
                }
              }}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="s7_1500">SIMATIC S7-1500 (Rack 0, Slot 1)</option>
              <option value="s7_1200">SIMATIC S7-1200 (Rack 0, Slot 1)</option>
              <option value="s7_300">SIMATIC S7-300 (Rack 0, Slot 2)</option>
              <option value="s7_400">SIMATIC S7-400 (Rack 0, Slot 2)</option>
              <option value="s7_200">SIMATIC S7-200 / Smart</option>
              <option value="logo">Siemens LOGO! 0BA7/0BA8</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">ISO Port (Default: 102) *</label>
            <input
              type="number"
              value={conn.port ?? 102}
              onChange={e => setField('port', parseInt(e.target.value) || 102)}
              min={1} max={65535}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">PLC IP Address *</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={conn.host || ''}
              onChange={e => setField('host', e.target.value)}
              placeholder="192.168.0.1"
              className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="button"
              onClick={testS7Connection}
              disabled={s7TestStatus.testing || !conn.host}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <i className="fas fa-bolt text-[10px]"></i>
              <span>Test S7 PLC</span>
            </button>
          </div>
        </div>

        {/* Contextual Hardware Routing Fields */}
        {conn.s7Model === 's7_200' ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Local TSAP (CP243-1) *</label>
                <input
                  type="text"
                  value={conn.localTsap || '0x1000'}
                  onChange={e => setField('localTsap', e.target.value)}
                  placeholder="0x1000 or 10.00"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block">Default: 0x1000 (01.00)</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Remote TSAP (PLC) *</label>
                <input
                  type="text"
                  value={conn.remoteTsap || '0x1000'}
                  onChange={e => setField('remoteTsap', e.target.value)}
                  placeholder="0x1000 or 10.00"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block">Default: 0x1000 (02.00)</span>
              </div>
            </div>
            <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[10px] text-cyan-300/90 leading-relaxed">
              <span className="font-bold">S7-200 V-Memory:</span> Connected via CP243-1 module. Variable Memory (V) is addressed as <code>VB100</code>, <code>VW100</code>, <code>VD100</code>, or <code>V100.0</code> and mapped directly to DB1.
            </div>
          </div>
        ) : conn.s7Model === 'logo' ? (
          <div className="space-y-2 pt-1">
            <div className="p-2.5 bg-cyan-950/50 border border-cyan-700/50 rounded-xl text-[11px] text-cyan-200 leading-relaxed">
              <div className="font-bold flex items-center space-x-1.5 text-cyan-300 mb-1">
                <i className="fas fa-microchip text-xs"></i>
                <span>LOGO! 0BA7 / 0BA8 Virtual DB1 Translation Active</span>
              </div>
              <p className="text-[10px] text-cyan-300/90">
                You can directly enter native LOGO! Soft Comfort addresses:
              </p>
              <ul className="text-[10px] text-slate-300 list-disc list-inside mt-1 space-y-0.5 font-mono">
                <li><span className="text-cyan-300 font-bold">I1..I24</span> &rarr; Digital Inputs (DB1.DBX923.0..925.7)</li>
                <li><span className="text-cyan-300 font-bold">Q1..Q20</span> &rarr; Digital Outputs (DB1.DBX942.0..944.3)</li>
                <li><span className="text-cyan-300 font-bold">M1..M64</span> &rarr; Internal Flags (DB1.DBX948.0..955.7)</li>
                <li><span className="text-cyan-300 font-bold">AI1..AI8</span> &rarr; Analog Inputs (DB1.DBW926..940)</li>
                <li><span className="text-cyan-300 font-bold">VW100 / VD100</span> &rarr; Variable Memory (DB1.DBW100 / DB1.DBD100)</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Rack Number *</label>
                <input
                  type="number"
                  value={conn.rack ?? 0}
                  onChange={e => setField('rack', parseInt(e.target.value) || 0)}
                  min={0} max={7}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">CPU Slot Number *</label>
                <input
                  type="number"
                  value={conn.slot ?? (conn.s7Model === 's7_300' || conn.s7Model === 's7_400' ? 2 : 1)}
                  onChange={e => setField('slot', parseInt(e.target.value) || 1)}
                  min={0} max={31}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[10px] text-cyan-300/90 leading-relaxed">
              <span className="font-bold">TIA Portal Requirement:</span> Enable <em>"Permit access with PUT/GET communication from remote partner"</em> in CPU Protection & Security settings, and disable <em>"Optimized block access"</em> on DBs.
            </div>
          </>
        )}
      </div>
    </div>
  );
};
