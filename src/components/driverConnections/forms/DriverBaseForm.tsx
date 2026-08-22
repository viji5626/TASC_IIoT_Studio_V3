import React from 'react';
import { DriverConnection, DriverProtocol } from '../../../types';
import { PROTOCOL_LABELS } from '../constants';

interface DriverBaseFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
  onProtocolChange?: (protocol: DriverProtocol) => void;
}

export const DriverBaseForm: React.FC<DriverBaseFormProps> = ({
  conn,
  setField,
  onProtocolChange
}) => {
  return (
    <div className="space-y-4">
      {/* Connection Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Connection Name *</label>
        <input
          type="text"
          value={conn.connectionName || ''}
          onChange={e => setField('connectionName', e.target.value)}
          placeholder="e.g. PLC Line 1, SCADA Server, VFD Serial"
          className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Protocol Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Protocol</label>
        <select
          value={conn.protocol || 'modbus_tcp'}
          onChange={e => {
            const nextProto = e.target.value as DriverProtocol;
            setField('protocol', nextProto);
            if (onProtocolChange) {
              onProtocolChange(nextProto);
            }
          }}
          className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          {(Object.entries(PROTOCOL_LABELS) as [DriverProtocol, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
