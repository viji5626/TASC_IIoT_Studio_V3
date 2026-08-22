import React, { useState } from 'react';
import { DriverConnection } from '../../../types/driver';
import { gsdCatalogService } from '../../../drivers/gsd/gsdCatalogService';
import { ProfinetDcpDevice } from '../../../types/gsd';

interface ProfinetConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (field: keyof DriverConnection, value: any) => void;
  onOpenGsdManager?: () => void;
}

export const ProfinetConfigForm: React.FC<ProfinetConfigFormProps> = ({
  conn,
  setField,
  onOpenGsdManager
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [dcpDevices, setDcpDevices] = useState<ProfinetDcpDevice[]>([]);
  const [showDcpModal, setShowDcpModal] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const profiles = gsdCatalogService.getAllProfiles().filter(p => p.standard === 'profinet_gsdml');
  const selectedProfile = profiles.find(p => p.profileId === conn.gsdProfileId);

  const handleDcpScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/profinet/dcp-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeoutMs: 2500 })
      });
      const data = await res.json();
      if (data.devices) {
        setDcpDevices(data.devices);
        setShowDcpModal(true);
      }
    } catch (err) {
      console.error('DCP Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectDcpDevice = (device: ProfinetDcpDevice) => {
    setField('profinetStationName', device.stationName);
    setField('profinetIp', device.ipAddress);
    setField('host', device.ipAddress);
    setField('profinetMacAddress', device.macAddress);
    setField('profinetVendorId', device.vendorId);
    setField('profinetDeviceId', device.deviceId);
    setShowDcpModal(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/profinet/test', {
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
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
            <i className="fa-solid fa-network-wired text-sm" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-sm">PROFINET IO Real-Time Ethernet</div>
            <div className="text-[11px] text-slate-400">IEC 61158 / 61784 Industrial Ethernet Standard with GSDML support</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDcpScan}
          disabled={isScanning}
          className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
        >
          <i className={`fa-solid ${isScanning ? 'fa-spinner fa-spin' : 'fa-radar'}`} />
          <span>{isScanning ? 'Probing Network...' : 'DCP Network Scan'}</span>
        </button>
      </div>

      {/* Station Name & IP */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">
            PROFINET Device Name (Station Name) <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={conn.profinetStationName || ''}
            onChange={e => setField('profinetStationName', e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''))}
            placeholder="e.g. et200sp-pn-io"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <span className="text-[10px] text-slate-500">RFC 5890 DNS compliant (lowercase, digits, hyphen, dot)</span>
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">
            Node IP Address <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={conn.profinetIp || conn.host || ''}
            onChange={e => {
              setField('profinetIp', e.target.value);
              setField('host', e.target.value);
            }}
            placeholder="192.168.0.10"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <span className="text-[10px] text-slate-500">Target PROFINET device IP</span>
        </div>
      </div>

      {/* Controller & Subnet Settings */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-slate-400 mb-1">Subnet Mask</label>
          <input
            type="text"
            value={conn.profinetSubnet || '255.255.255.0'}
            onChange={e => setField('profinetSubnet', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Default Gateway</label>
          <input
            type="text"
            value={conn.profinetGateway || '192.168.0.1'}
            onChange={e => setField('profinetGateway', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Send Clock / Cycle</label>
          <select
            value={conn.profinetSendClockMs || 1}
            onChange={e => setField('profinetSendClockMs', Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
          >
            <option value={1}>1.0 ms (Real-Time)</option>
            <option value={2}>2.0 ms</option>
            <option value={4}>4.0 ms</option>
            <option value={8}>8.0 ms</option>
            <option value={16}>16.0 ms</option>
          </select>
        </div>
      </div>

      {/* GSDML Device Profile Selection */}
      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-slate-300 font-medium flex items-center space-x-1.5">
            <i className="fa-solid fa-file-code text-emerald-400" />
            <span>Associated GSDML Device Profile</span>
          </label>
          {onOpenGsdManager && (
            <button
              type="button"
              onClick={onOpenGsdManager}
              className="text-emerald-400 hover:text-emerald-300 text-[11px] underline flex items-center space-x-1"
            >
              <i className="fa-solid fa-folder-open" />
              <span>GSD/GSDML Catalog Manager</span>
            </button>
          )}
        </div>

        <select
          value={conn.gsdProfileId || ''}
          onChange={e => setField('gsdProfileId', e.target.value || undefined)}
          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="">-- No GSDML Profile Attached (Manual Addressing) --</option>
          {profiles.map(p => (
            <option key={p.profileId} value={p.profileId}>
              {p.vendorName} - {p.modelName} ({p.orderNumber || p.deviceIdHex})
            </option>
          ))}
        </select>

        {selectedProfile && (
          <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-emerald-300">Profile Loaded: {selectedProfile.modelName}</div>
            <div className="text-slate-400">
              Vendor ID: <span className="font-mono text-slate-200">{selectedProfile.vendorIdHex}</span> | Device ID: <span className="font-mono text-slate-200">{selectedProfile.deviceIdHex}</span> | Modules: <span className="text-slate-200 font-semibold">{selectedProfile.modules.length}</span>
            </div>
            <div className="text-slate-400">
              Process Image: <span className="text-emerald-400 font-mono">{selectedProfile.totalInputBytes} Bytes In</span> / <span className="text-cyan-400 font-mono">{selectedProfile.totalOutputBytes} Bytes Out</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Probe Button & Diagnostic */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting || (!conn.profinetStationName && !conn.profinetIp && !conn.host)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          <i className={`fa-solid ${isTesting ? 'fa-spinner fa-spin' : 'fa-circle-check text-emerald-400'}`} />
          <span>{isTesting ? 'Probing I&M Records...' : 'Test I&M0 Identification'}</span>
        </button>

        {testResult && (
          <div className={`text-xs px-2.5 py-1 rounded border flex items-center space-x-1.5 ${testResult.success ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>
            <i className={`fa-solid ${testResult.success ? 'fa-check' : 'fa-triangle-exclamation'}`} />
            <span>
              {testResult.success
                ? `Online: ${testResult.stationName} (Serial: ${testResult.serialNumber || 'N/A'})`
                : testResult.error || 'Probe failed'}
            </span>
          </div>
        )}
      </div>

      {/* DCP Network Scan Modal */}
      {showDcpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-radar text-emerald-400 text-base" />
                <span className="font-semibold text-slate-200 text-sm">Discovered PROFINET DCP Nodes</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDcpModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {dcpDevices.length === 0 ? (
                <div className="text-center py-6 text-slate-500">No PROFINET nodes responded to DCP broadcast.</div>
              ) : (
                dcpDevices.map((dev, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectDcpDevice(dev)}
                    className="p-3 bg-slate-950/80 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/40 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-200 group-hover:text-emerald-300 flex items-center space-x-2">
                        <span>{dev.stationName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {dev.macAddress}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        IP: <span className="font-mono text-slate-300">{dev.ipAddress}</span> | Subnet: <span className="font-mono text-slate-300">{dev.subnetMask}</span>
                      </div>
                      {dev.deviceTypeDescription && (
                        <div className="text-[10px] text-slate-500">{dev.deviceTypeDescription} {dev.orderNumber ? `(${dev.orderNumber})` : ''}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 bg-emerald-600/30 group-hover:bg-emerald-600 text-emerald-300 group-hover:text-white rounded text-[11px] transition-colors"
                    >
                      Select Node
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
