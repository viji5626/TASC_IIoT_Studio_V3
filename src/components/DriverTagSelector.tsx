import React, { useState } from 'react';
import { AppState, DriverTag, DriverProtocol } from '../types';

const PROTOCOL_BADGES: Record<DriverProtocol, { label: string; color: string }> = {
  opcua:      { label: 'OPC UA',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  opcda:      { label: 'OPC DA',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  modbus_tcp: { label: 'Modbus',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  modbus_rtu: { label: 'Modbus',   color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  iec61850:   { label: 'IEC 61850',color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  s7:         { label: 'Siemens S7',color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
  melsec:     { label: 'MELSEC',   color: 'bg-rose-500/15 text-rose-300 border-rose-500/25' },
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

  const selectedTag = allTags.find(t => t.tagId === selectedTagId);

  return (
    <div ref={containerRef} className={`space-y-1 relative ${isOpen ? 'z-[60]' : 'z-20'}`}>
      {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left flex items-center justify-between transition-colors focus:outline-none ${
            compact
              ? 'bg-slate-950 border border-slate-700/80 text-white text-xs rounded-lg px-2.5 py-1.5 hover:border-violet-500 focus:border-violet-500'
              : 'bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2.5 hover:border-violet-500 focus:border-violet-500'
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
    </div>
  );
};

export default DriverTagSelector;
