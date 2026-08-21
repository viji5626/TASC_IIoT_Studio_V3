import React, { useState, useRef, useEffect } from 'react';
import { AppState, AppView, DriverTag, DriverProtocol, DriverTagDataType, DriverAccessType, ModbusRegisterType } from '../types';
import { validateDriverTag, exportDriverTagsCsv, parseDriverTagsCsv, parseDriverTagsJson } from '../utils/driverTagManager';
import { parseS7Address } from '../drivers/siemens_s7/s7AddressParser';
import { parseMelsecAddress } from '../drivers/mitsubishi_melsec/melsecAddressParser';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';

interface DriverTagManagerViewProps {
  onBack?: () => void;
  appState: AppState;
  latestValues?: Record<string, { val: any; time: string; quality?: string }>;
  onNavigate?: (view: AppView) => void;
  onAdd: (tag: DriverTag) => void;
  onUpdate: (tag: DriverTag) => void;
  onDelete: (tagId: string) => void;
  onImport: (tags: DriverTag[]) => void;
}

const PROTOCOL_BADGES: Record<DriverProtocol, { label: string; color: string }> = {
  opcua: { label: 'OPC UA', color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  opcda: { label: 'OPC DA', color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  modbus_tcp: { label: 'Modbus', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  modbus_rtu: { label: 'Modbus', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  iec61850: { label: 'IEC 61850', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  s7: { label: 'Siemens S7', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
  melsec: { label: 'MELSEC', color: 'bg-rose-500/15 text-rose-300 border-rose-500/25' },
  rs485: { label: 'RS-485', color: 'bg-orange-500/15 text-orange-300 border-orange-500/25' },
  rs232: { label: 'RS-232', color: 'bg-amber-600/15 text-amber-300 border-amber-500/25' },
  usb_serial: { label: 'USB', color: 'bg-green-500/15 text-green-300 border-green-500/25' },
  tcp_custom: { label: 'TCP', color: 'bg-slate-500/15 text-slate-300 border-slate-500/25' },
  custom: { label: 'Custom', color: 'bg-slate-500/15 text-slate-300 border-slate-500/25' }
};

const emptyTag = (defaultConnId: string = ''): Partial<DriverTag> => ({
  tagId: `tag_${Date.now()}`,
  tagName: '',
  protocol: 'modbus_tcp',
  sourceType: 'manual',
  connectionId: defaultConnId,
  dataType: 'float',
  accessType: 'read',
  pollRate: 100,
  enabled: true,
  registerType: 'holding_register',
  address: 0,
  // S7 Defaults
  s7Area: 'DB',
  dbNumber: 1,
  byteOffset: 0,
  bitOffset: 0,
  s7Address: 'DB1.DBD0',
  // MELSEC Defaults
  melsecAddress: 'D100',
  melsecDeviceCode: 0xA8,
  // IEC 61850 Defaults
  logicalDevice: 'LD0',
  logicalNode: 'MMXU1',
  functionalConstraint: 'MX',
  dataObject: 'A',
  dataAttribute: 'phsA.cVal.mag.f',
  iecPath: 'LD0/MMXU1.A.phsA.cVal.mag.f'
});

const DriverTagManagerView: React.FC<DriverTagManagerViewProps> = ({
  onBack,
  appState,
  latestValues = {},
  onNavigate,
  onAdd,
  onUpdate,
  onDelete,
  onImport
}) => {
  const tags = appState.driverTags || [];
  const connections = appState.driverConnections || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTagTourOpen, setIsTagTourOpen] = useState(false);

  useEffect(() => {
    if (!isTourSuppressed('driver_tag_manager')) {
      setIsTagTourOpen(true);
    }
  }, []);

  // 1-second live ticker to keep staleness and time checks continuously reactive
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<string>('all');

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTag, setEditingTag] = useState<Partial<DriverTag>>(emptyTag(connections[0]?.connectionId || ''));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Community limit check
  const isCommunity = appState.productEdition === 'community' || appState.userRole === 'community';
  const maxTags = isCommunity ? 5 : Infinity;
  const atLimit = isCommunity && tags.length >= maxTags;

  const getConnectionName = (connId: string) => {
    const conn = connections.find(c => c.connectionId === connId);
    return conn ? conn.connectionName : connId || 'Unassigned';
  };

  const getAddressDisplay = (tag: DriverTag): string => {
    if (tag.protocol === 'iec61850' || tag.iecPath) {
      return tag.iecPath || `${tag.logicalDevice || 'LD0'}/${tag.logicalNode || 'MMXU1'}.${tag.dataObject || 'TotW'}.${tag.dataAttribute || 'mag.f'}`;
    }
    if (tag.protocol === 's7' || tag.s7Address) {
      return tag.s7Address || `DB${tag.dbNumber || 1}.DBD${tag.byteOffset || 0}`;
    }
    if (tag.protocol === 'melsec' || tag.melsecAddress) {
      return tag.melsecAddress || `D${tag.address ?? 100}`;
    }
    if (tag.nodeId) return tag.nodeId;
    if (tag.itemId) return tag.itemId;
    if (tag.address !== undefined) {
      const reg = tag.registerType ? tag.registerType.replace('_', ' ') : '';
      return `${reg} ${tag.address}`;
    }
    return '-';
  };

  // Filtered tags list
  const filteredTags = tags.filter(t => {
    const matchesSearch = t.tagName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getAddressDisplay(t).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProtocol = protocolFilter === 'all' || t.protocol === protocolFilter;
    const matchesAccess = accessFilter === 'all' || t.accessType === accessFilter;
    return matchesSearch && matchesProtocol && matchesAccess;
  });

  const handleOpenAdd = () => {
    if (atLimit) {
      alert(`🔒 Free Demo Limit: Maximum 5 Driver Tags allowed for Community Edition. Upgrade to Engineering Studio for unlimited tags.`);
      return;
    }
    setEditingTag(emptyTag(connections[0]?.connectionId || ''));
    setIsEditing(false);
    setValidationErrors([]);
    setValidationWarnings([]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tag: DriverTag) => {
    setEditingTag({ ...tag });
    setIsEditing(true);
    setValidationErrors([]);
    setValidationWarnings([]);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    const result = validateDriverTag(editingTag);
    if (!result.valid) {
      setValidationErrors(result.errors);
      setValidationWarnings(result.warnings);
      return;
    }

    const tag = editingTag as DriverTag;
    if (isEditing) {
      onUpdate(tag);
    } else {
      if (atLimit) {
        alert(`🔒 Free Demo Limit: Maximum 5 Driver Tags allowed for Community Edition.`);
        return;
      }
      onAdd(tag);
    }

    setIsFormOpen(false);
    setEditingTag(emptyTag());
  };

  const handleDelete = (tagId: string) => {
    onDelete(tagId);
    setDeleteConfirmId(null);
  };

  const handleExport = () => {
    const csv = exportDriverTagsCsv(tags);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-tags-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = file.name.endsWith('.json')
        ? parseDriverTagsJson(text)
        : parseDriverTagsCsv(text);
      if (result.errors.length > 0) {
        alert(`Import completed with errors:\n` + result.errors.map(err => `Row ${err.row}: ${err.message}`).join('\n'));
      }
      if (result.imported.length > 0) {
        if (isCommunity && tags.length + result.imported.length > maxTags) {
          alert(`🔒 Free Demo Limit: Importing these tags would exceed the 5-tag Community limit. Truncating to 5 tags max.`);
          const remainingSlots = Math.max(0, maxTags - tags.length);
          onImport(result.imported.slice(0, remainingSlots));
        } else {
          onImport(result.imported);
          alert(`Successfully imported ${result.imported.length} driver tags.`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const setField = (key: keyof DriverTag, value: any) => {
    setEditingTag(prev => {
      const updated = { ...prev, [key]: value };
      // Sync protocol when connection selection changes
      if (key === 'connectionId') {
        const conn = connections.find(c => c.connectionId === value);
        if (conn) {
          updated.protocol = conn.protocol;
        }
      }
      return updated;
    });
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate(AppView.DASHBOARD);
    }
  };

  return (
    <div className="flex-grow overflow-y-auto p-6 max-w-6xl mx-auto space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div data-tour="tag-header" className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all cursor-pointer flex items-center space-x-2 shrink-0 active:scale-95"
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-sm"></i>
            <span className="text-xs font-bold">Back</span>
          </button>
          <i className="fas fa-database text-violet-400 text-xl"></i>
          <div>
            <h1 className="text-xl font-bold text-white">Driver Tag Manager</h1>
            <p className="text-sm text-slate-400">Configure and manage industrial driver tags (OPC UA, Modbus, Serial)</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsTagTourOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Launch Driver Tag Manager Guided Tour"
          >
            <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
            <span>Tour</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".csv,.json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <i className="fas fa-file-import text-xs text-sky-400"></i>
            <span>Import</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={tags.length === 0}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="fas fa-file-export text-xs text-emerald-400"></i>
            <span>Export</span>
          </button>
          <button
            type="button"
            data-tour="tag-add-btn"
            onClick={handleOpenAdd}
            disabled={atLimit}
            className={`flex items-center space-x-2 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer ${atLimit ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500'
              }`}
          >
            <i className="fas fa-plus text-xs"></i>
            <span>Add Tag</span>
          </button>
        </div>
      </div>

      {/* Community Edition Limit Banner */}
      {isCommunity && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${atLimit ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-300'
          }`}>
          <div className="flex items-center space-x-3 text-xs">
            <i className={`fas ${atLimit ? 'fa-lock text-amber-400' : 'fa-cube text-emerald-400'} text-base`}></i>
            <div>
              <span className="font-bold">Community Edition (Free Demo): </span>
              <span>{tags.length} / 5 Driver Tags used.</span>
              {atLimit && <span className="ml-1 text-amber-400 font-semibold">Maximum limit reached. Upgrade to Engineering Studio for unlimited tags.</span>}
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            Free Demo
          </span>
        </div>
      )}

      {/* Filters */}
      <div data-tour="tag-search" className="flex flex-wrap gap-3 items-center bg-slate-800/50 border border-slate-700 p-3.5 rounded-2xl">
        <div className="flex-1 min-w-[200px] relative">
          <i className="fas fa-search absolute left-3 top-2.5 text-xs text-slate-400"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tags by name, address..."
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={protocolFilter}
          onChange={e => setProtocolFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="all">All Protocols</option>
          <option value="modbus_tcp">Modbus TCP</option>
          <option value="modbus_rtu">Modbus RTU</option>
          <option value="opcua">OPC UA</option>
          <option value="opcda">OPC DA</option>
          <option value="rs485">RS-485</option>
          <option value="rs232">RS-232</option>
          <option value="usb_serial">USB Serial</option>
        </select>
        <select
          value={accessFilter}
          onChange={e => setAccessFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
        >
          <option value="all">All Access Types</option>
          <option value="read">Read Only</option>
          <option value="write">Write Only</option>
          <option value="read-write">Read / Write</option>
        </select>
      </div>

      {/* Tag Table */}
      <div data-tour="tag-table">
        {filteredTags.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-10 text-center">
            <i className="fas fa-database text-4xl text-violet-400/30 mb-3 block"></i>
            <p className="text-slate-400 font-medium">
              {tags.length === 0 ? 'No driver tags configured' : 'No tags match the current filters'}
            </p>
            <p className="text-slate-500 text-xs mt-1 mb-4">
              {tags.length === 0 ? 'Add your first Modbus or OPC UA driver tag to get started' : 'Try clearing your search query or filters'}
            </p>
            {tags.length === 0 && !atLimit && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                + Add First Tag
              </button>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 border-b border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Tag Name</th>
                  <th className="p-3.5">Protocol</th>
                  <th className="p-3.5">Connection</th>
                  <th className="p-3.5">Address / NodeID</th>
                  <th className="p-3.5 text-emerald-400">Live Value</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Data Type</th>
                  <th className="p-3.5">Access</th>
                  <th className="p-3.5">Poll Rate</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTags.map(tag => {
                  const badge = PROTOCOL_BADGES[tag.protocol] || { label: tag.protocol, color: 'bg-slate-700 text-slate-300' };
                  const liveReading = (latestValues && (latestValues[tag.tagId] || latestValues[tag.tagName])) || (tag.lastValue !== undefined ? {
                    val: tag.lastValue,
                    quality: tag.quality || 'good',
                    time: tag.lastTimestamp ? new Date(tag.lastTimestamp).toLocaleTimeString() : undefined,
                    timestampMs: tag.lastTimestamp ? new Date(tag.lastTimestamp).getTime() : undefined,
                    lastGoodValue: tag.lastGoodValue,
                    lastGoodTimestamp: tag.lastGoodTimestamp
                  } : null);
                  const conn = connections.find(c => c.connectionId === tag.connectionId || c.connectionName === tag.connectionId);
                  const isConnConnected = !!(conn && conn.enabled !== false && (conn.connectionState === 'connected' || (conn.connected && conn.connectionState !== 'disconnected' && conn.connectionState !== 'error')));
                  const tagTimeoutSec = Math.max(5, ((tag.pollRate || 1000) * 3) / 1000); // 5s threshold (or 3x poll rate)
                  const isStale = liveReading?.timestampMs ? ((Date.now() - liveReading.timestampMs) / 1000 > tagTimeoutSec) : (!liveReading);
                  const isBadQuality = !liveReading || liveReading.quality === 'bad' || isStale;
                  const hasValue = !isBadQuality && liveReading!.val !== undefined && liveReading!.val !== null;
                  const liveValueDisplay = hasValue ? String(liveReading!.val) : (isBadQuality ? 'BAD DATA' : '--');
                  const isGood = hasValue && (isConnConnected || liveReading?.quality === 'good');

                  return (
                    <tr key={tag.tagId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-semibold text-white">
                        <div>{tag.tagName}</div>
                        {tag.description && <div className="text-[10px] text-slate-500 font-normal">{tag.description}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${conn?.enabled === false ? 'bg-slate-600' :
                            isConnConnected ? 'bg-emerald-400' :
                              conn?.connectionState === 'reconnecting' ? 'bg-amber-400 animate-pulse' :
                                'bg-rose-500'
                            }`} />
                          <span>{getConnectionName(tag.connectionId)}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{getAddressDisplay(tag)}</td>

                      <td className="p-3.5 font-mono font-bold">
                        {hasValue ? (
                          <div className="flex items-center space-x-1.5 text-emerald-400">
                            <span className="text-sm">{liveValueDisplay}</span>
                            {liveReading.time && (
                              <span className="text-[9px] text-slate-500 font-normal">({liveReading.time})</span>
                            )}
                          </div>
                        ) : isBadQuality ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 text-rose-400">
                              <span className="text-xs font-black uppercase tracking-wider">{liveValueDisplay}</span>
                              {liveReading?.time && (
                                <span className="text-[9px] text-slate-500 font-normal">({liveReading.time})</span>
                              )}
                            </div>
                            {liveReading?.lastGoodValue !== undefined && liveReading?.lastGoodValue !== null && (
                              <div className="text-[10px] text-amber-300/80 font-normal font-mono">
                                Last Known: <span className="font-bold">{String(liveReading.lastGoodValue)}</span> {liveReading.lastGoodTimestamp ? `(${new Date(liveReading.lastGoodTimestamp).toLocaleTimeString()})` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-normal">--</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {isGood ? (
                          <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold rounded-full flex items-center space-x-1 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>GOOD</span>
                          </span>
                        ) : isBadQuality ? (
                          <span className="px-2 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[9px] font-bold rounded-full flex items-center space-x-1 w-max animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            <span>BAD</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-medium rounded-full w-max">
                            IDLE
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-400 uppercase text-[10px] font-bold">{tag.dataType}</td>
                      <td className="p-3.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tag.accessType === 'read-write' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                          tag.accessType === 'write' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}>
                          {tag.accessType.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono">{tag.pollRate}ms</td>
                      <td className="p-3.5 text-right">
                        {deleteConfirmId === tag.tagId ? (
                          <div className="flex items-center justify-end space-x-1">
                            <span className="text-[10px] text-rose-400">Delete?</span>
                            <button onClick={() => handleDelete(tag.tagId)} className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] rounded cursor-pointer">Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded cursor-pointer">No</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(tag)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                              title="Edit Tag"
                            >
                              <i className="fas fa-pen text-[10px]"></i>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(tag.tagId)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                              title="Delete Tag"
                            >
                              <i className="fas fa-trash-can text-[10px]"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">{isEditing ? 'Edit Driver Tag' : 'Add Driver Tag'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Validation errors/warnings */}
              {validationErrors.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-xs text-rose-400 flex items-center space-x-1.5">
                      <i className="fas fa-circle-exclamation text-[10px]"></i>
                      <span>{err}</span>
                    </p>
                  ))}
                </div>
              )}
              {validationWarnings.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                  {validationWarnings.map((warn, i) => (
                    <p key={i} className="text-xs text-amber-300 flex items-center space-x-1.5">
                      <i className="fas fa-triangle-exclamation text-[10px]"></i>
                      <span>{warn}</span>
                    </p>
                  ))}
                </div>
              )}

              {/* Tag Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tag Name *</label>
                <input
                  type="text"
                  value={editingTag.tagName || ''}
                  onChange={e => setField('tagName', e.target.value)}
                  placeholder="e.g. TT-101_Temperature"
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Driver Connection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Driver Connection *</label>
                <select
                  value={editingTag.connectionId || ''}
                  onChange={e => setField('connectionId', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Select Connection --</option>
                  {connections.map(conn => (
                    <option key={conn.connectionId} value={conn.connectionId}>
                      {conn.connectionName} ({conn.protocol})
                    </option>
                  ))}
                </select>
                {connections.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">No driver connections configured yet. Create a connection in Driver Connections first.</p>
                )}
              </div>

              {/* Protocol-specific fields */}
              {['modbus_tcp', 'modbus_rtu'].includes(editingTag.protocol || '') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Register Type *</label>
                    <select
                      value={editingTag.registerType || 'holding_register'}
                      onChange={e => setField('registerType', e.target.value as ModbusRegisterType)}
                      className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                    >
                      <option value="holding_register">Holding Register (4x)</option>
                      <option value="input_register">Input Register (3x)</option>
                      <option value="coil">Coil (0x)</option>
                      <option value="discrete_input">Discrete Input (1x)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Address *</label>
                    <input
                      type="number"
                      value={editingTag.address ?? 0}
                      onChange={e => setField('address', parseInt(e.target.value) || 0)}
                      min={0} max={65535}
                      className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              {editingTag.protocol === 'opcua' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Node ID *</label>
                    <input
                      type="text"
                      value={editingTag.nodeId || ''}
                      onChange={e => setField('nodeId', e.target.value)}
                      placeholder="ns=2;i=1002 or ns=2;s=Temperature"
                      className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Browse Path (Optional)</label>
                    <input
                      type="text"
                      value={editingTag.browsePath || ''}
                      onChange={e => setField('browsePath', e.target.value)}
                      placeholder="/Objects/DeviceSet/PLC1/Temp"
                      className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </>
              )}

              {editingTag.protocol === 'opcda' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Item ID *</label>
                  <input
                    type="text"
                    value={editingTag.itemId || ''}
                    onChange={e => setField('itemId', e.target.value)}
                    placeholder="Channel1.Device1.Tag1"
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              )}

              {/* IEC 61850 Logical Device / Node / Data Attribute Editor */}
              {editingTag.protocol === 'iec61850' && (
                <div className="space-y-3 bg-slate-850 border border-slate-700/80 rounded-xl p-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <i className="fas fa-bolt text-emerald-400"></i>
                      <span>IEC 61850 Data Attribute</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/80 text-emerald-300 rounded border border-emerald-800/60">
                      MMS Polled / GOOSE
                    </span>
                  </div>

                  {/* Standard Substation Template Picker */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Quick Substation Presets</label>
                    <select
                      onChange={e => {
                        const val = e.target.value;
                        if (!val) return;
                        const presets: Record<string, { ld: string; ln: string; fc: string; doName: string; daName: string; path: string; dt: DriverTagDataType; unit: string }> = {
                          current_a: { ld: 'LD0', ln: 'MMXU1', fc: 'MX', doName: 'A', daName: 'phsA.cVal.mag.f', path: 'LD0/MMXU1.A.phsA.cVal.mag.f', dt: 'float', unit: 'A' },
                          voltage_a: { ld: 'LD0', ln: 'MMXU1', fc: 'MX', doName: 'PhV', daName: 'phsA.cVal.mag.f', path: 'LD0/MMXU1.PhV.phsA.cVal.mag.f', dt: 'float', unit: 'V' },
                          active_pwr: { ld: 'LD0', ln: 'MMXU1', fc: 'MX', doName: 'TotW', daName: 'mag.f', path: 'LD0/MMXU1.TotW.mag.f', dt: 'float', unit: 'kW' },
                          frequency: { ld: 'LD0', ln: 'MMXU1', fc: 'MX', doName: 'Hz', daName: 'mag.f', path: 'LD0/MMXU1.Hz.mag.f', dt: 'float', unit: 'Hz' },
                          breaker_pos: { ld: 'LD0', ln: 'XCBR1', fc: 'ST', doName: 'Pos', daName: 'stVal', path: 'LD0/XCBR1.Pos.stVal', dt: 'boolean', unit: '' },
                          switch_pos: { ld: 'LD0', ln: 'CSWI1', fc: 'ST', doName: 'Pos', daName: 'stVal', path: 'LD0/CSWI1.Pos.stVal', dt: 'boolean', unit: '' },
                          oc_trip: { ld: 'LD0', ln: 'PTOC1', fc: 'ST', doName: 'Op', daName: 'general', path: 'LD0/PTOC1.Op.general', dt: 'boolean', unit: '' }
                        };
                        const p = presets[val];
                        if (p) {
                          setField('logicalDevice', p.ld);
                          setField('logicalNode', p.ln);
                          setField('functionalConstraint', p.fc);
                          setField('dataObject', p.doName);
                          setField('dataAttribute', p.daName);
                          setField('iecPath', p.path);
                          setField('dataType', p.dt);
                          if (p.unit) setField('unit', p.unit);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Choose Standard Substation Model --</option>
                      <option value="current_a">MMXU1: Phase A Current (A.phsA.cVal.mag.f)</option>
                      <option value="voltage_a">MMXU1: Phase A Voltage (PhV.phsA.cVal.mag.f)</option>
                      <option value="active_pwr">MMXU1: Total Active Power (TotW.mag.f)</option>
                      <option value="frequency">MMXU1: Bus Frequency (Hz.mag.f)</option>
                      <option value="breaker_pos">XCBR1: Circuit Breaker Status (Pos.stVal)</option>
                      <option value="switch_pos">CSWI1: Disconnector Switch Status (Pos.stVal)</option>
                      <option value="oc_trip">PTOC1: Overcurrent Protection Trip (Op.general)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Logical Device</label>
                      <input
                        type="text"
                        value={editingTag.logicalDevice || 'LD0'}
                        onChange={e => {
                          const ld = e.target.value;
                          setField('logicalDevice', ld);
                          setField('iecPath', `${ld}/${editingTag.logicalNode || 'MMXU1'}.${editingTag.dataObject || 'TotW'}.${editingTag.dataAttribute || 'mag.f'}`);
                        }}
                        placeholder="e.g. LD0, PROT"
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Logical Node</label>
                      <input
                        type="text"
                        value={editingTag.logicalNode || 'MMXU1'}
                        onChange={e => {
                          const ln = e.target.value;
                          setField('logicalNode', ln);
                          setField('iecPath', `${editingTag.logicalDevice || 'LD0'}/${ln}.${editingTag.dataObject || 'TotW'}.${editingTag.dataAttribute || 'mag.f'}`);
                        }}
                        placeholder="e.g. MMXU1, XCBR1, PTOC1"
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Functional Constraint (FC)</label>
                      <select
                        value={editingTag.functionalConstraint || 'MX'}
                        onChange={e => setField('functionalConstraint', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                      >
                        <option value="MX">MX (Measurands)</option>
                        <option value="ST">ST (Status Information)</option>
                        <option value="CO">CO (Control / Operation)</option>
                        <option value="SP">SP (Setpoints / Parameters)</option>
                        <option value="SV">SV (Sampled Values)</option>
                        <option value="CF">CF (Configuration)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Data Object & Attribute</label>
                      <input
                        type="text"
                        value={editingTag.dataAttribute || 'mag.f'}
                        onChange={e => {
                          const da = e.target.value;
                          setField('dataAttribute', da);
                          setField('iecPath', `${editingTag.logicalDevice || 'LD0'}/${editingTag.logicalNode || 'MMXU1'}.${editingTag.dataObject || 'TotW'}.${da}`);
                        }}
                        placeholder="e.g. phsA.cVal.mag.f, stVal"
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full IEC Data Attribute Path *</label>
                    <input
                      type="text"
                      value={editingTag.iecPath || ''}
                      onChange={e => setField('iecPath', e.target.value)}
                      placeholder="e.g. LD0/MMXU1.A.phsA.cVal.mag.f"
                      className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Siemens S7 Tag Address Settings */}
              {editingTag.protocol === 's7' && (
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      <i className="fas fa-industry text-cyan-400"></i>
                      <span>Siemens S7 Address & Data Block</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-900/60 text-cyan-300 rounded-md border border-cyan-700/50">
                      Snap7 / S7Comm
                    </span>
                  </div>

                  {/* Quick S7 Templates */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Quick S7 / LOGO! / S7-200 Address Presets</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { label: 'DB1.DBD0 (Real Float)', addr: 'DB1.DBD0', dt: 'float', name: 'Process Temp / Real' },
                        { label: 'DB1.DBW4 (Int16)', addr: 'DB1.DBW4', dt: 'int16', name: 'Motor Speed RPM' },
                        { label: 'DB1.DBX0.0 (Bit)', addr: 'DB1.DBX0.0', dt: 'boolean', name: 'Start PB / Interlock' },
                        { label: 'I0.0 (Digital Input)', addr: 'I0.0', dt: 'boolean', name: 'Limit Switch Input' },
                        { label: 'Q0.0 (Digital Output)', addr: 'Q0.0', dt: 'boolean', name: 'Valve Output Coil' },
                        { label: 'M0.0 (Internal Flag)', addr: 'M0.0', dt: 'boolean', name: 'System Auto Mode' },
                        { label: 'VW100 (LOGO VM / S7-200)', addr: 'VW100', dt: 'int16', name: 'LOGO! Variable Memory' },
                        { label: 'AI1 (LOGO Analog In)', addr: 'AI1', dt: 'int16', name: 'LOGO! Analog Sensor' }
                      ].map(preset => (
                        <button
                          key={preset.addr}
                          type="button"
                          onClick={() => {
                            const parsed = parseS7Address(preset.addr, preset.dt as any);
                            setField('s7Address', preset.addr);
                            setField('s7Area', parsed.area);
                            setField('dbNumber', parsed.dbNumber);
                            setField('byteOffset', parsed.byteOffset);
                            setField('bitOffset', parsed.bitOffset);
                            setField('dataType', preset.dt as any);
                            if (!editingTag.tagName) setField('tagName', preset.name);
                          }}
                          className="text-left px-2 py-1.5 bg-slate-900 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-[11px] transition-all cursor-pointer group"
                        >
                          <div className="font-mono text-cyan-300 group-hover:text-cyan-200 truncate">{preset.addr}</div>
                          <div className="text-[9px] text-slate-400 truncate">{preset.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Memory Area *</label>
                      <select
                        value={editingTag.s7Area || 'DB'}
                        onChange={e => {
                          const area = e.target.value as any;
                          setField('s7Area', area);
                          const dbNum = area === 'DB' ? (editingTag.dbNumber || 1) : 0;
                          const byteOff = editingTag.byteOffset || 0;
                          const addr = area === 'DB' ? `DB${dbNum}.DBD${byteOff}` : `${area}${byteOff}.0`;
                          setField('s7Address', addr);
                        }}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="DB">Data Block (DB)</option>
                        <option value="I">Process Inputs (I / E)</option>
                        <option value="Q">Process Outputs (Q / A)</option>
                        <option value="M">Bit Memory / Merkers (M)</option>
                        <option value="T">Timers (T)</option>
                        <option value="C">Counters (C)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">DB Number</label>
                      <input
                        type="number"
                        value={editingTag.dbNumber ?? 1}
                        disabled={editingTag.s7Area !== 'DB'}
                        onChange={e => {
                          const dbNum = parseInt(e.target.value) || 1;
                          setField('dbNumber', dbNum);
                          setField('s7Address', `DB${dbNum}.DBD${editingTag.byteOffset || 0}`);
                        }}
                        min={1} max={65535}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Byte & Bit Offset</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          value={editingTag.byteOffset ?? 0}
                          onChange={e => {
                            const bo = parseInt(e.target.value) || 0;
                            setField('byteOffset', bo);
                            if (editingTag.s7Area === 'DB') {
                              setField('s7Address', `DB${editingTag.dbNumber || 1}.DBD${bo}`);
                            } else {
                              setField('s7Address', `${editingTag.s7Area || 'M'}${bo}.${editingTag.bitOffset || 0}`);
                            }
                          }}
                          min={0}
                          placeholder="Byte"
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                        <span className="text-slate-500 font-bold">.</span>
                        <input
                          type="number"
                          value={editingTag.bitOffset ?? 0}
                          onChange={e => setField('bitOffset', parseInt(e.target.value) || 0)}
                          min={0} max={7}
                          placeholder="Bit"
                          className="w-14 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Siemens S7 Address *</label>
                    <input
                      type="text"
                      value={editingTag.s7Address || ''}
                      onChange={e => {
                        const addr = e.target.value;
                        setField('s7Address', addr);
                        const parsed = parseS7Address(addr, editingTag.dataType);
                        if (parsed.valid) {
                          setField('s7Area', parsed.area);
                          setField('dbNumber', parsed.dbNumber);
                          setField('byteOffset', parsed.byteOffset);
                          setField('bitOffset', parsed.bitOffset);
                        }
                      }}
                      placeholder="e.g. DB1.DBD0, DB1.DBW4, DB1.DBX0.0, M0.0, IW0, Q0.0"
                      className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Mitsubishi MELSEC Tag Address Settings */}
              {editingTag.protocol === 'melsec' && (
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                      <i className="fas fa-microchip text-rose-400"></i>
                      <span>Mitsubishi MELSEC Device Register</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded-md border border-rose-700/50">
                      MC Protocol / SLMP
                    </span>
                  </div>

                  {/* Quick MELSEC Templates */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Quick MELSEC Device Presets</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { label: 'D100 (Data Register)', addr: 'D100', dt: 'float', name: 'Speed / Flow Rate' },
                        { label: 'W100 (Link Register)', addr: 'W100', dt: 'int16', name: 'Network Buffer Word' },
                        { label: 'M100 (Internal Relay)', addr: 'M100', dt: 'boolean', name: 'Cycle Start Flag' },
                        { label: 'X0 (Physical Input)', addr: 'X0', dt: 'boolean', name: 'Proximity Sensor' },
                        { label: 'Y0 (Physical Output)', addr: 'Y0', dt: 'boolean', name: 'Solenoid Actuator' },
                        { label: 'ZR1000 (File Register)', addr: 'ZR1000', dt: 'float', name: 'Recipe Parameter' }
                      ].map(preset => (
                        <button
                          key={preset.addr}
                          type="button"
                          onClick={() => {
                            const parsed = parseMelsecAddress(preset.addr, preset.dt as any);
                            setField('melsecAddress', parsed.formattedAddress);
                            setField('melsecDeviceCode', parsed.deviceCode);
                            setField('dataType', preset.dt as any);
                            if (!editingTag.tagName) setField('tagName', preset.name);
                          }}
                          className="text-left px-2 py-1.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 rounded-lg text-[11px] transition-all cursor-pointer group"
                        >
                          <div className="font-mono text-rose-300 group-hover:text-rose-200">{preset.addr}</div>
                          <div className="text-[9px] text-slate-400 truncate">{preset.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Device Type *</label>
                      <select
                        value={editingTag.melsecAddress ? editingTag.melsecAddress.charAt(0) : 'D'}
                        onChange={e => {
                          const dev = e.target.value;
                          setField('melsecAddress', `${dev}100`);
                          const parsed = parseMelsecAddress(`${dev}100`, editingTag.dataType);
                          if (parsed.valid) {
                            setField('melsecDeviceCode', parsed.deviceCode);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
                      >
                        <option value="D">D — Data Register (0xA8, Decimal Word)</option>
                        <option value="W">W — Link Register (0xB4, Hex Word)</option>
                        <option value="M">M — Internal Relay (0x90, Decimal Bit)</option>
                        <option value="X">X — Physical Input (0x9C, Hex Bit)</option>
                        <option value="Y">Y — Physical Output (0x9D, Hex Bit)</option>
                        <option value="R">R — File Register (0xAF, Decimal Word)</option>
                        <option value="ZR">ZR — Extension File Register (0xB0, Decimal Word)</option>
                        <option value="SM">SM — Special Relay (0x91, Decimal Bit)</option>
                        <option value="SD">SD — Special Register (0xA2, Decimal Word)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full MELSEC Device Address *</label>
                      <input
                        type="text"
                        value={editingTag.melsecAddress || ''}
                        onChange={e => {
                          const addr = e.target.value;
                          setField('melsecAddress', addr);
                          const parsed = parseMelsecAddress(addr, editingTag.dataType);
                          if (parsed.valid) {
                            setField('melsecDeviceCode', parsed.deviceCode);
                          }
                        }}
                        placeholder="e.g. D100, M100, X0, Y0, W100, ZR1000"
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Data Type & Access Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data Type *</label>
                  <select
                    value={editingTag.dataType || 'float'}
                    onChange={e => setField('dataType', e.target.value as DriverTagDataType)}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  >
                    <option value="boolean">Boolean</option>
                    <option value="int16">Int16</option>
                    <option value="int32">Int32</option>
                    <option value="uint16">UInt16</option>
                    <option value="uint32">UInt32</option>
                    <option value="float">Float (32-bit)</option>
                    <option value="double">Double (64-bit)</option>
                    <option value="string">String</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Access Type *</label>
                  <select
                    value={editingTag.accessType || 'read'}
                    onChange={e => setField('accessType', e.target.value as DriverAccessType)}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  >
                    <option value="read">Read Only</option>
                    <option value="write">Write Only</option>
                    <option value="read-write">Read / Write</option>
                  </select>
                </div>
              </div>

              {/* Poll Rate & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Poll Rate (ms)</label>
                  <input
                    type="number"
                    value={editingTag.pollRate || 100}
                    onChange={e => setField('pollRate', parseInt(e.target.value) || 100)}
                    min={100} step={100}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Engineering Unit</label>
                  <input
                    type="text"
                    value={editingTag.unit || ''}
                    onChange={e => setField('unit', e.target.value)}
                    placeholder="°C, bar, RPM, %"
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={editingTag.description || ''}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="e.g. Tank 1 Top Temperature Sensor"
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                {isEditing ? 'Save Changes' : 'Add Tag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Tag Manager Guided Tour Screen Overlay */}
      <CoachMarkOverlay
        tourId="driver_tag_manager"
        isOpen={isTagTourOpen}
        onClose={() => setIsTagTourOpen(false)}
      />
    </div>
  );
};

export default DriverTagManagerView;
