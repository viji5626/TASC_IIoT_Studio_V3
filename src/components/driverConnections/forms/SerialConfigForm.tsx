import React from 'react';
import { DriverConnection } from '../../../types';

interface SerialConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
  detectedPorts: Array<{ port: string; name?: string }>;
  isScanningPorts: boolean;
  scanError: string | null;
  scanSerialPorts: () => void;
  isModbus: boolean;
}

export const SerialConfigForm: React.FC<SerialConfigFormProps> = ({
  conn,
  setField,
  detectedPorts,
  isScanningPorts,
  scanError,
  scanSerialPorts,
  isModbus
}) => {
  return (
    <div className="space-y-4">
      {/* Channel Serial / RS-485 / RS-232 / USB Settings */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
            <i className="fas fa-microchip text-[11px]"></i>
            <span>Channel Serial (RS-485 / RS-232) Settings</span>
          </h3>
          <button
            type="button"
            onClick={scanSerialPorts}
            disabled={isScanningPorts}
            className="px-2.5 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-[10px] font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Scan machine for available COM ports"
          >
            <i className={`fas fa-rotate ${isScanningPorts ? 'animate-spin' : ''} text-[10px]`}></i>
            <span>{isScanningPorts ? 'Scanning...' : 'Auto-Detect Ports'}</span>
          </button>
        </div>

        {/* Serial Port Dropdown + Manual Entry */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Serial Port (COM Port / Device Path) *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select
              value={conn.portPath || 'COM1'}
              onChange={e => setField('portPath', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
            >
              {detectedPorts.length > 0 ? (
                detectedPorts.map(p => (
                  <option key={p.port} value={p.port}>
                    {p.name && p.name !== p.port ? `${p.port} — ${p.name}` : p.port}
                  </option>
                ))
              ) : (
                ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))
              )}
            </select>
            <input
              type="text"
              value={conn.portPath || ''}
              onChange={e => setField('portPath', e.target.value)}
              placeholder="e.g. COM3, COM10, /dev/ttyUSB0"
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
            />
          </div>
          {detectedPorts.length > 0 && (
            <div className="text-[10px] text-emerald-400/80 mt-1 flex items-center space-x-1">
              <i className="fas fa-check-circle text-[9px]"></i>
              <span>{detectedPorts.length} COM port(s) detected: {detectedPorts.map(p => p.port).join(', ')}</span>
            </div>
          )}
          {scanError && (
            <div className="text-[10px] text-rose-400 mt-1">
              {scanError}
            </div>
          )}
        </div>

        {/* Serial Framing: Baud Rate, Data Bits, Parity, Stop Bits */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Baud Rate *</label>
            <select
              value={conn.baudRate || 9600}
              onChange={e => setField('baudRate', parseInt(e.target.value) || 9600)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500 font-mono"
            >
              {[1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 230400].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Data Bits *</label>
            <select
              value={conn.dataBits ?? 8}
              onChange={e => setField('dataBits', parseInt(e.target.value) || 8)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500 font-mono"
            >
              <option value={8}>8 bits (Standard)</option>
              <option value={7}>7 bits (ASCII)</option>
              <option value={6}>6 bits</option>
              <option value={5}>5 bits</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Parity *</label>
            <select
              value={conn.parity || 'none'}
              onChange={e => setField('parity', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500"
            >
              <option value="none">None (N)</option>
              <option value="even">Even (E)</option>
              <option value="odd">Odd (O)</option>
              <option value="mark">Mark (M)</option>
              <option value="space">Space (S)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Stop Bits *</label>
            <select
              value={conn.stopBits ?? 1}
              onChange={e => setField('stopBits', parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500 font-mono"
            >
              <option value={1}>1 stop bit</option>
              <option value={1.5}>1.5 stop bits</option>
              <option value={2}>2 stop bits</option>
            </select>
          </div>
        </div>

        {/* Flow Control & RTS Direction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-center">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Flow Control</label>
            <select
              value={conn.flowControl || 'none'}
              onChange={e => setField('flowControl', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
            >
              <option value="none">None (Default RS-485)</option>
              <option value="rts/cts">RTS / CTS (Hardware)</option>
              <option value="xon/xoff">XON / XOFF (Software)</option>
            </select>
          </div>
          <div className="pt-3">
            <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!conn.rtsToggle}
                onChange={e => setField('rtsToggle', e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
              />
              <span className="font-medium">RTS Toggle / RS-485 Auto Direction</span>
            </label>
          </div>
        </div>
      </div>

      {/* Non-Modbus Serial settings (RS-485, RS-232, USB Serial) */}
      {!isModbus && (
        <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
            <i className="fas fa-stopwatch text-[11px]"></i>
            <span>Polling & Timeouts</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Base Scan Rate (ms)</label>
              <input
                type="number"
                value={conn.retryInterval ?? 1000}
                onChange={e => setField('retryInterval', parseInt(e.target.value) || 1000)}
                min={50} max={60000} step={100}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={conn.timeout ?? 1000}
                onChange={e => setField('timeout', parseInt(e.target.value) || 1000)}
                min={100} max={10000} step={100}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
