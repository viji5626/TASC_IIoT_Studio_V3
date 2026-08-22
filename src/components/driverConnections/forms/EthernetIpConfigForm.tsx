/**
 * TASC IIoT Studio — Ethernet/IP (CIP) Connection Configuration Form
 *
 * Configures connection parameters for Rockwell ControlLogix, CompactLogix,
 * Micro800, MicroLogix, SLC 500, and generic ODVA CIP devices with live
 * Identity Object probing and EDS profile attachment.
 */

import React, { useState } from 'react';
import { DriverConnection } from '../../../types';
import { EdsCatalogService } from '../../../drivers/ethernet_ip/edsCatalogService';

interface EthernetIpConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
  onOpenEdsManager?: () => void;
}

export const EthernetIpConfigForm: React.FC<EthernetIpConfigFormProps> = ({ conn, setField, onOpenEdsManager }) => {
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
    identity?: any;
  }>({ testing: false });

  const catalog = EdsCatalogService.getInstance();
  const allProfiles = catalog.getAllProfiles();

  const testConnection = async () => {
    setTestStatus({ testing: true });
    try {
      const res = await fetch('/api/ethernetip/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn)
      });
      const data = await res.json();
      setTestStatus({
        testing: false,
        success: data.success,
        message: data.message || (data.success ? '✓ Connected to EtherNet/IP Controller' : '✗ Failed to connect'),
        identity: data.identity
      });
    } catch (err: any) {
      setTestStatus({
        testing: false,
        success: false,
        message: err.message || 'EtherNet/IP probe request failed'
      });
    }
  };

  const cpuType = conn.eipCpuType || 'compactlogix';

  return (
    <div className="space-y-3 pt-1">
      {/* Test Connection Feedback Banner */}
      {testStatus.testing && (
        <div className="p-3 bg-amber-950/70 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center space-x-2 animate-pulse">
          <i className="fas fa-circle-notch fa-spin text-amber-400"></i>
          <span>Probing EtherNet/IP Controller at {conn.host || '127.0.0.1'}:{conn.port || 44818} (Slot {conn.cipSlot || 0})...</span>
        </div>
      )}

      {!testStatus.testing && testStatus.message && (
        <div className={`p-3 rounded-xl text-xs flex flex-col space-y-1.5 border ${testStatus.success ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-medium">
              <i className={`fas ${testStatus.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
              <span>{testStatus.message}</span>
            </div>
            <button type="button" onClick={() => setTestStatus({ testing: false })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
          </div>
          {testStatus.identity && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-500/20 text-[11px] font-mono text-emerald-300">
              <div><span className="text-slate-400">Device:</span> {testStatus.identity.productName}</div>
              <div><span className="text-slate-400">Vendor:</span> {testStatus.identity.vendorName}</div>
              <div><span className="text-slate-400">Firmware:</span> v{testStatus.identity.revision.major}.{testStatus.identity.revision.minor}</div>
              <div><span className="text-slate-400">S/N:</span> {testStatus.identity.serialNumber}</div>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <i className="fas fa-network-wired text-amber-400"></i>
            <span>EtherNet/IP & CIP Protocol Settings</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-900/60 text-amber-300 rounded-md border border-amber-700/50">
            ODVA CIP Port 44818
          </span>
        </div>

        {/* Controller Architecture / Hardware Family */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Controller Architecture *</label>
            <select
              value={cpuType}
              onChange={e => setField('eipCpuType', e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="compactlogix">Rockwell CompactLogix (5370 / 5380)</option>
              <option value="controllogix">Rockwell ControlLogix (1756 Modular)</option>
              <option value="micro800">Rockwell Micro800 (Micro820 / 850 / 870)</option>
              <option value="micrologix">Rockwell MicroLogix (1100 / 1400 via PCCC)</option>
              <option value="slc500">Rockwell SLC 500 / PLC-5 (PCCC)</option>
              <option value="generic_cip">Generic ODVA CIP Device (VFD, I/O, Valve)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Chassis Slot (0..17) *</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="17"
                value={conn.cipSlot !== undefined ? conn.cipSlot : 0}
                onChange={e => setField('cipSlot', parseInt(e.target.value, 10) || 0)}
                disabled={cpuType === 'micro800' || cpuType === 'micrologix' || cpuType === 'slc500'}
                className="w-24 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-400 italic">
                {cpuType === 'controllogix' ? '1756 CPU Slot in chassis' : cpuType === 'compactlogix' ? 'Slot 0 (Embedded CPU)' : 'Not applicable'}
              </span>
            </div>
          </div>
        </div>

        {/* IP Address and TCP Port */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Controller IP Address & Encapsulation Port *</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={conn.host || '192.168.1.10'}
              onChange={e => setField('host', e.target.value)}
              placeholder="e.g. 192.168.1.10"
              className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
            />
            <span className="text-slate-500">:</span>
            <input
              type="number"
              value={conn.port || 44818}
              onChange={e => setField('port', parseInt(e.target.value, 10) || 44818)}
              className="w-24 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={testConnection}
              disabled={testStatus.testing}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <i className="fas fa-satellite-dish"></i>
              <span>Identify PLC</span>
            </button>
          </div>
        </div>

        {/* Multi-Hop Route Path (Optional) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Custom CIP Connection Route Path <span className="text-slate-400 font-normal">(Optional for multi-hop or bridge routing)</span>
          </label>
          <input
            type="text"
            value={conn.cipRoutePath || ''}
            onChange={e => setField('cipRoutePath', e.target.value)}
            placeholder='Default is "1,0" (Port 1, Slot 0). e.g. "1,2" or "1,2,2,192.168.1.50,1,0"'
            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* EDS Profile Association */}
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1.5">
              <i className="fas fa-file-invoice text-amber-400"></i>
              <span>Attached EDS Device Profile</span>
            </label>
            {onOpenEdsManager && (
              <button
                type="button"
                onClick={onOpenEdsManager}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1"
              >
                <i className="fas fa-folder-open"></i>
                <span>Open EDS Catalog</span>
              </button>
            )}
          </div>
          <select
            value={conn.edsProfileId || ''}
            onChange={e => setField('edsProfileId', e.target.value || undefined)}
            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="">None (Native Symbolic Tag Mode)</option>
            {allProfiles.map(p => (
              <option key={p.profileId} value={p.profileId}>
                {p.vendorName} — {p.productName} ({p.parameters?.length || 0} Params, {p.assemblies?.length || 0} Assemblies)
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            Attaching an EDS profile enables auto-discovery of all assembly instances and device parameters with 1-click SCADA tag creation.
          </p>
        </div>
      </div>
    </div>
  );
};
