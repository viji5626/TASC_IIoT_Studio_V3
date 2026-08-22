import React, { useState } from 'react';
import { DriverConnection } from '../../../types/driver';
import { gsdCatalogService } from '../../../drivers/gsd/gsdCatalogService';

interface ProfibusConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (field: keyof DriverConnection, value: any) => void;
  onOpenGsdManager?: () => void;
}

export const ProfibusConfigForm: React.FC<ProfibusConfigFormProps> = ({
  conn,
  setField,
  onOpenGsdManager
}) => {
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const profiles = gsdCatalogService.getAllProfiles().filter(p => p.standard === 'profibus_gsd');
  const selectedProfile = profiles.find(p => p.profileId === conn.gsdProfileId);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/profibus/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs text-slate-300">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent border border-purple-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
            <i className="fa-solid fa-microchip text-sm" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-sm">PROFIBUS DP Master / Slave Driver</div>
            <div className="text-[11px] text-slate-400">IEC 61158 Fieldbus via Industrial Gateways & Serial RS-485 Masters</div>
          </div>
        </div>
      </div>

      {/* Gateway Transport & Host */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">
            Gateway Transport Architecture <span className="text-rose-400">*</span>
          </label>
          <select
            value={conn.profibusGatewayType || 'ie_pb_link'}
            onChange={e => setField('profibusGatewayType', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
          >
            <option value="ie_pb_link">Siemens IE/PB Link PN IO (Ethernet Gateway)</option>
            <option value="netlink">Hilscher NetLink / Helmholz (RFC 1006 / TCP 102)</option>
            <option value="anybus">HMS Anybus X-gateway (Modbus/Ethernet to DP)</option>
            <option value="serial_rs485">Direct USB / PCIe RS-485 DP Master</option>
          </select>
          <span className="text-[10px] text-slate-500">Bridge interface between Studio & PROFIBUS segment</span>
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">
            Gateway IP / Serial Port <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={conn.host || ''}
            onChange={e => setField('host', e.target.value)}
            placeholder={conn.profibusGatewayType === 'serial_rs485' ? 'COM3 or /dev/ttyUSB0' : '192.168.0.100'}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
          />
          <span className="text-[10px] text-slate-500">IP address of the bridge gateway or serial device</span>
        </div>
      </div>

      {/* DP Slave Node Address & Baud Rate */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">
            DP Slave Node Address (0 - 126) <span className="text-rose-400">*</span>
          </label>
          <input
            type="number"
            min={0}
            max={126}
            value={conn.profibusNodeAddress ?? 3}
            onChange={e => setField('profibusNodeAddress', Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
          />
          <span className="text-[10px] text-slate-500">Target slave physical address</span>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Baud Rate</label>
          <select
            value={conn.profibusBaudRate || '1.5M'}
            onChange={e => setField('profibusBaudRate', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
          >
            <option value="9.6k">9.6 kbit/s</option>
            <option value="19.2k">19.2 kbit/s</option>
            <option value="45.45k">45.45 kbit/s</option>
            <option value="93.75k">93.75 kbit/s</option>
            <option value="187.5k">187.5 kbit/s</option>
            <option value="500k">500 kbit/s</option>
            <option value="1.5M">1.5 Mbit/s (Standard)</option>
            <option value="3M">3.0 Mbit/s</option>
            <option value="6M">6.0 Mbit/s</option>
            <option value="12M">12.0 Mbit/s</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">DP Ident Number</label>
          <input
            type="text"
            value={conn.profibusIdentNumber || ''}
            onChange={e => setField('profibusIdentNumber', e.target.value)}
            placeholder="0x8054"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
          />
          <span className="text-[10px] text-slate-500">PNO Assigned Ident (Hex)</span>
        </div>
      </div>

      {/* GSD Device Profile Selection */}
      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-slate-300 font-medium flex items-center space-x-1.5">
            <i className="fa-solid fa-file-lines text-purple-400" />
            <span>Associated PROFIBUS GSD Profile</span>
          </label>
          {onOpenGsdManager && (
            <button
              type="button"
              onClick={onOpenGsdManager}
              className="text-purple-400 hover:text-purple-300 text-[11px] underline flex items-center space-x-1"
            >
              <i className="fa-solid fa-folder-open" />
              <span>GSD/GSDML Catalog Manager</span>
            </button>
          )}
        </div>

        <select
          value={conn.gsdProfileId || ''}
          onChange={e => setField('gsdProfileId', e.target.value || undefined)}
          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="">-- No GSD Profile Attached (Manual Offset Addressing) --</option>
          {profiles.map(p => (
            <option key={p.profileId} value={p.profileId}>
              {p.vendorName} - {p.modelName} (Ident: {p.identNumberHex || p.deviceIdHex})
            </option>
          ))}
        </select>

        {selectedProfile && (
          <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-purple-300">Profile Loaded: {selectedProfile.modelName}</div>
            <div className="text-slate-400">
              Vendor: <span className="text-slate-200">{selectedProfile.vendorName}</span> | Ident Number: <span className="font-mono text-slate-200">{selectedProfile.identNumberHex || selectedProfile.deviceIdHex}</span>
            </div>
            <div className="text-slate-400">
              Cyclic Data: <span className="text-emerald-400 font-mono">{selectedProfile.totalInputBytes} Bytes In</span> / <span className="text-cyan-400 font-mono">{selectedProfile.totalOutputBytes} Bytes Out</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Probe Button & Diagnostic */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting || !conn.host}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          <i className={`fa-solid ${isTesting ? 'fa-spinner fa-spin' : 'fa-circle-check text-purple-400'}`} />
          <span>{isTesting ? 'Testing DP Slave Node...' : 'Test DP Slave Diagnostics'}</span>
        </button>

        {testResult && (
          <div className={`text-xs px-2.5 py-1 rounded border flex items-center space-x-1.5 ${testResult.success ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>
            <i className={`fa-solid ${testResult.success ? 'fa-check' : 'fa-triangle-exclamation'}`} />
            <span>
              {testResult.success
                ? `Node ${testResult.nodeAddress} Online (${testResult.baudRate})`
                : testResult.error || 'Test failed'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
