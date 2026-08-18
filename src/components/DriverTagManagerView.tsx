import React, { useState, useRef, useEffect } from 'react';
import { AppState, AppView, DriverTag, DriverProtocol, DriverTagDataType, DriverAccessType, ModbusRegisterType } from '../types';
import { validateDriverTag, exportDriverTagsCsv, parseDriverTagsCsv, parseDriverTagsJson } from '../utils/driverTagManager';
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
  opcua:      { label: 'OPC UA',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  opcda:      { label: 'OPC DA',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  modbus_tcp: { label: 'Modbus',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  modbus_rtu: { label: 'Modbus',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  rs485:      { label: 'RS-485',   color: 'bg-orange-500/15 text-orange-300 border-orange-500/25' },
  rs232:      { label: 'RS-232',   color: 'bg-amber-600/15 text-amber-300 border-amber-500/25' },
  usb_serial: { label: 'USB',      color: 'bg-green-500/15 text-green-300 border-green-500/25' },
  tcp_custom: { label: 'TCP',      color: 'bg-slate-500/15 text-slate-300 border-slate-500/25' },
  custom:     { label: 'Custom',   color: 'bg-slate-500/15 text-slate-300 border-slate-500/25' }
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
  address: 0
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
            className={`flex items-center space-x-2 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              atLimit ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500'
            }`}
          >
            <i className="fas fa-plus text-xs"></i>
            <span>Add Tag</span>
          </button>
        </div>
      </div>

      {/* Community Edition Limit Banner */}
      {isCommunity && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          atLimit ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-300'
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
                const liveReading = latestValues ? (latestValues[tag.tagId] || latestValues[tag.tagName]) : null;
                const conn = connections.find(c => c.connectionId === tag.connectionId || c.connectionName === tag.connectionId);
                const isConnDisconnected = !conn || conn.enabled === false || conn.connectionState === 'disconnected' || conn.connectionState === 'unavailable' || conn.connectionState === 'error';
                const tagTimeoutSec = 10;
                const isStale = liveReading?.timestampMs ? ((Date.now() - liveReading.timestampMs) / 1000 > tagTimeoutSec) : false;
                const isBadQuality = liveReading?.quality === 'bad' || isStale || isConnDisconnected;
                const hasValue = liveReading && liveReading.val !== undefined && liveReading.val !== null && !isBadQuality;
                const liveValueDisplay = hasValue ? String(liveReading.val) : (isBadQuality ? 'BAD DATA' : '--');
                const isGood = hasValue && !isBadQuality;

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
                        <span className={`w-2 h-2 rounded-full ${
                          conn?.enabled === false ? 'bg-slate-600' :
                          conn?.connectionState === 'connected' ? 'bg-emerald-400' :
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
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        tag.accessType === 'read-write' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
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
