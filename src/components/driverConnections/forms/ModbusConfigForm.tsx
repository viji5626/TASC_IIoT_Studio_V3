import React from 'react';
import { DriverConnection } from '../../../types';

interface ModbusConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
  isTcpProtocol: boolean;
  isModbus: boolean;
}

export const ModbusConfigForm: React.FC<ModbusConfigFormProps> = ({
  conn,
  setField,
  isTcpProtocol,
  isModbus
}) => {
  return (
    <div className="space-y-4">
      {/* Channel TCP/IP Settings (Modbus TCP, TCP Custom) */}
      {isTcpProtocol && (
        <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
            <i className="fas fa-ethernet text-[11px]"></i>
            <span>Channel TCP/IP Settings</span>
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">IP addr. or hostname</label>
              <input
                type="text"
                value={conn.host || ''}
                onChange={e => setField('host', e.target.value)}
                placeholder="127.0.0.1 or localhost"
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">TCP port</label>
              <input
                type="number"
                value={conn.port || 502}
                onChange={e => setField('port', parseInt(e.target.value) || 502)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">TCP sockets</label>
              <input
                type="number"
                value={conn.tcpSockets ?? 1}
                onChange={e => setField('tcpSockets', parseInt(e.target.value) || 1)}
                min={1} max={16}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="reopenSockets"
                checked={Boolean(conn.reopenSockets)}
                onChange={e => setField('reopenSockets', e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600 focus:ring-0 focus:outline-none cursor-pointer"
              />
              <label htmlFor="reopenSockets" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                Close & Re-open socket on each poll (forces new connection)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Modbus Settings (Modbus TCP & Modbus RTU) */}
      {isModbus && (
        <>
          {/* Device & Unit ID Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit / Slave ID *</label>
              <input
                type="number"
                value={conn.unitId ?? 1}
                onChange={e => setField('unitId', parseInt(e.target.value) || 1)}
                min={1} max={247}
                className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Base Scan Rate (ms)</label>
              <input
                type="number"
                value={conn.retryInterval ?? 1000}
                onChange={e => setField('retryInterval', parseInt(e.target.value) || 1000)}
                min={50} max={60000} step={100}
                className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
          </div>

          {/* Communication Timeouts */}
          <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
              <i className="fas fa-stopwatch text-[11px]"></i>
              <span>Communication Timeouts</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Send timeout (ms)</label>
                <input
                  type="number"
                  value={conn.sendTimeoutMs ?? 1000}
                  onChange={e => setField('sendTimeoutMs', parseInt(e.target.value) || 1000)}
                  min={100} max={10000} step={100}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Recv timeout (ms)</label>
                <input
                  type="number"
                  value={conn.recvTimeoutMs ?? 1000}
                  onChange={e => setField('recvTimeoutMs', parseInt(e.target.value) || 1000)}
                  min={100} max={10000} step={100}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Turnaround / Delay (ms)</label>
                <input
                  type="number"
                  value={conn.sendRecvDelayMs ?? 0}
                  onChange={e => setField('sendRecvDelayMs', parseInt(e.target.value) || 0)}
                  min={0} max={5000} step={10}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Frame retry count</label>
                <input
                  type="number"
                  value={conn.frameRetryCount ?? 0}
                  onChange={e => setField('frameRetryCount', parseInt(e.target.value) || 0)}
                  min={0} max={10}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Swap Options */}
          <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
              <i className="fas fa-arrow-right-arrow-left text-[11px]"></i>
              <span>Swap Options</span>
            </h3>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!conn.byteSwap}
                  onChange={e => setField('byteSwap', e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                />
                <span>Swap bytes inside words</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!conn.wordSwap}
                  onChange={e => setField('wordSwap', e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                />
                <span>Swap words inside dwords</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!conn.dwordSwap}
                  onChange={e => setField('dwordSwap', e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                />
                <span>Swap dwords inside 64-bit registers</span>
              </label>
            </div>
          </div>

          {/* Other Addressing & Function Settings */}
          <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
              <i className="fas fa-sliders text-[11px]"></i>
              <span>Other Settings</span>
            </h3>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={conn.zeroBasedAddressing !== false}
                  onChange={e => setField('zeroBasedAddressing', e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                />
                <span>Use zero based register addressing (0..65535)</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={conn.useSingleCoilWrite !== false}
                  onChange={e => setField('useSingleCoilWrite', e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                />
                <span>Use single coil write (Modbus Fnc 05)</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={conn.useSingleRegisterWrite !== false}
                  onChange={e => setField('useSingleRegisterWrite', e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                />
                <span>Use single register write (Modbus Fnc 06)</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
