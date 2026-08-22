import React, { useState } from 'react';
import { AppState, DriverTag, DriverProtocol } from '../types';

const PROTOCOL_BADGES: Record<DriverProtocol, { label: string; color: string }> = {
  opcua:      { label: 'OPC UA',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  opcda:      { label: 'OPC DA',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  modbus_tcp: { label: 'Modbus TCP', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  modbus_rtu: { label: 'Modbus RTU', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  iec61850:   { label: 'IEC 61850',color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  s7:         { label: 'Siemens S7',color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
  melsec:     { label: 'MELSEC',   color: 'bg-rose-500/15 text-rose-300 border-rose-500/25' },
  ethernet_ip:{ label: 'EtherNet/IP', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  profinet:   { label: 'PROFINET', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  profibus:   { label: 'PROFIBUS', color: 'bg-purple-500/15 text-purple-300 border-purple-500/25' },
  rs485:      { label: 'RS-485',   color: 'bg-orange-500/15 text-orange-300 border-orange-500/25' },
  rs232:      { label: 'RS-232',   color: 'bg-amber-600/15 text-amber-300 border-amber-500/25' },
  usb_serial: { label: 'USB',      color: 'bg-green-500/15 text-green-300 border-green-500/25' },
  tcp_custom: { label: 'TCP',      color: 'bg-slate-500/15 text-slate-300 border-slate-500/25' },
  custom:     { label: 'Custom',   color: 'bg-slate-500/15 text-slate-300 border-slate-500/25' }
};

interface DriverTagSelectorProps {
  appState: AppState;
  selectedTagId: string | undefined;
  onChange: (tagId: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
}

const DriverTagSelector: React.FC<DriverTagSelectorProps> = ({
  appState,
  selectedTagId,
  onChange,
  label = 'BIND DRIVER TAG',
  placeholder = 'Search tags...',
  compact = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedProtocolFilter, setSelectedProtocolFilter] = useState<string>('all');
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allTags = appState.driverTags || [];
  const connections = appState.driverConnections || [];

  const getConnectionName = (connId: string) => {
    const conn = connections.find(c => c.connectionId === connId);
    return conn ? conn.connectionName : connId;
  };

  const getAddressPreview = (tag: DriverTag): string => {
    if (tag.protocol === 'profinet' || (tag.pnSlot !== undefined && tag.protocol !== 'profibus')) {
      const dir = tag.pnIoDirection === 'output' ? 'Q' : 'I';
      const bit = tag.pnBitOffset !== undefined ? `.${tag.pnBitOffset}` : '';
      return `Slot ${tag.pnSlot ?? 1}.${tag.pnSubslot ?? 1} [${dir}${tag.pnByteOffset ?? 0}${bit}]`;
    }
    if (tag.protocol === 'profibus' || tag.profibusNodeAddress !== undefined) {
      const dir = tag.pnIoDirection === 'output' ? 'Q' : 'I';
      const bit = tag.pnBitOffset !== undefined ? `.${tag.pnBitOffset}` : '';
      return `Node ${tag.profibusNodeAddress ?? 3} Slot ${tag.pnSlot ?? 1} [${dir}${tag.pnByteOffset ?? 0}${bit}]`;
    }
    if (tag.protocol === 'ethernet_ip' || tag.cipTagName || tag.cipClass !== undefined) {
      if (tag.cipTagName) return tag.cipTagName;
      if (tag.cipClass === 0x04) {
        return `Assem ${tag.cipInstance || 100} [B${tag.cipByteOffset || 0}.${tag.cipBitOffset || 0}]`;
      }
      if (tag.cipClass !== undefined) {
        return `0x${tag.cipClass.toString(16).toUpperCase()}:${tag.cipInstance || 1}:${tag.cipAttribute || 1}`;
      }
      return tag.address?.toString() || '';
    }
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
      return `${tag.registerType ? tag.registerType.replace('_', ' ') : ''} ${tag.address}`;
    }
    return '';
  };

  const filtered = allTags.filter(t =>
    t.tagName.toLowerCase().includes(query.toLowerCase()) ||
    t.protocol.toLowerCase().includes(query.toLowerCase()) ||
    getConnectionName(t.connectionId).toLowerCase().includes(query.toLowerCase()) ||
    getAddressPreview(t).toLowerCase().includes(query.toLowerCase())
  );

  const modalFilteredTags = allTags.filter(t => {
    if (selectedProtocolFilter !== 'all' && t.protocol !== selectedProtocolFilter) return false;
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      t.tagName.toLowerCase().includes(q) ||
      t.protocol.toLowerCase().includes(q) ||
      getConnectionName(t.connectionId).toLowerCase().includes(q) ||
      getAddressPreview(t).toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  const selectedTag = allTags.find(t => t.tagId === selectedTagId);

  return (
    <div ref={containerRef} className={`space-y-1 relative ${isOpen ? 'z-[60]' : 'z-20'}`}>
      <div className="flex items-center justify-between">
        {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setIsModalOpen(true);
          }}
          className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer transition-colors"
        >
          <i className="fas fa-folder-tree text-[9px]"></i>
          <span>Browse Tags ({allTags.length})</span>
        </button>
      </div>

      <div className="relative flex items-center space-x-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 text-left flex items-center justify-between transition-colors focus:outline-none ${
            compact
              ? 'bg-slate-950 border border-slate-700/80 text-white text-xs rounded-lg px-2.5 py-1.5 hover:border-violet-500 focus:border-violet-500'
              : 'bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 hover:border-violet-500 focus:border-violet-500'
          }`}
        >
          {selectedTag ? (
            <div className="flex items-center space-x-2 min-w-0">
              <span className="font-medium truncate text-emerald-300">{selectedTag.tagName}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${PROTOCOL_BADGES[selectedTag.protocol]?.color || ''}`}>
                {PROTOCOL_BADGES[selectedTag.protocol]?.label || selectedTag.protocol}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs">{placeholder}</span>
          )}
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-[10px] text-slate-400 shrink-0 ml-2`}></i>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setIsModalOpen(true);
          }}
          className={`px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-sm shrink-0 ${compact ? 'py-1' : ''}`}
          title="Browse Tag Registry"
        >
          <i className="fas fa-folder-tree text-xs"></i>
          <span className="hidden sm:inline">Browse</span>
        </button>

        {isOpen && (
          <div className="absolute z-[500] left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/50">
            <div className="p-2 border-b border-slate-800">
              <div className="flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-1.5">
                <i className="fas fa-search text-xs text-slate-400"></i>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none flex-1"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-slate-400 text-xs">
                    {allTags.length === 0
                      ? 'No driver tags configured yet. Add tags in Driver Tag Manager.'
                      : 'No tags match your search.'}
                  </p>
                </div>
              ) : (
                filtered.map(tag => (
                  <button
                    key={tag.tagId}
                    type="button"
                    onClick={() => { onChange(tag.tagId); setIsOpen(false); setQuery(''); }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0 ${selectedTagId === tag.tagId ? 'bg-violet-500/10' : ''}`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-xs text-white font-medium truncate">{tag.tagName}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${PROTOCOL_BADGES[tag.protocol]?.color || ''}`}>
                        {PROTOCOL_BADGES[tag.protocol]?.label || tag.protocol}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-mono">{getAddressPreview(tag)}</span>
                  </button>
                ))
              )}
            </div>

            {allTags.length === 0 && (
              <div className="p-2 border-t border-slate-800">
                <p className="text-[10px] text-center text-slate-500">Go to <span className="text-violet-400 font-semibold">Data Driver Settings → Driver Tag Manager</span> to add tags</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Tag Browser Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <i className="fas fa-microchip text-base"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>PLC & SCADA Driver Tag Browser</span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono font-normal">
                      {allTags.length} Driver Tags
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Select any active Modbus, Siemens S7, MELSEC, OPC UA, or IEC 61850 register.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Search & Protocol Filter Toolbar */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search by tag name, memory address, device node..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors"
                    autoFocus
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  )}
                </div>

                <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 space-x-1 shrink-0 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'all' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Protocols
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('modbus_tcp')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'modbus_tcp' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Modbus
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('ethernet_ip')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'ethernet_ip' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    EtherNet/IP
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('profinet')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'profinet' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PROFINET
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('profibus')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'profibus' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PROFIBUS
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('s7')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 's7' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Siemens S7
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('melsec')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'melsec' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    MELSEC
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('opcua')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'opcua' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OPC UA
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('iec61850')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'iec61850' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    IEC 61850
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProtocolFilter('ethernet_ip')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedProtocolFilter === 'ethernet_ip' ? 'bg-amber-500 text-slate-950 shadow-sm font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    EtherNet/IP
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/80 max-h-[50vh]">
              {modalFilteredTags.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <i className="fas fa-microchip text-4xl text-slate-600 mb-2"></i>
                  <p className="text-sm font-semibold">No driver tags found matching your query.</p>
                </div>
              ) : (
                modalFilteredTags.map((tag) => {
                  const isSelected = selectedTagId === tag.tagId;
                  return (
                    <div
                      key={tag.tagId}
                      onClick={() => {
                        onChange(tag.tagId);
                        setIsModalOpen(false);
                      }}
                      className={`py-3 px-4 rounded-xl flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected ? 'bg-purple-500/15 border border-purple-500/30' : 'hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start space-x-3 min-w-0 pr-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <i className="fas fa-microchip text-xs"></i>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                              {tag.tagName}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${PROTOCOL_BADGES[tag.protocol]?.color || ''}`}>
                              {PROTOCOL_BADGES[tag.protocol]?.label || tag.protocol}
                            </span>
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              {tag.dataType}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-purple-400/90 mt-0.5">
                            {getAddressPreview(tag)} • Connection: {getConnectionName(tag.connectionId)}
                          </div>
                          {tag.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{tag.description}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(tag.tagId);
                          setIsModalOpen(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          isSelected ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-800 group-hover:bg-purple-600 text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Bind Tag'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {modalFilteredTags.length} of {allTags.length} driver tags</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTagSelector;
