import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectTag: (tag: { tagId: string; tagName: string; unit?: string; protocol?: string }) => void;
  selectedTagId?: string;
  title?: string;
}

export const TagPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectTag,
  selectedTagId,
  title = 'Select Industrial SCADA Tag'
}) => {
  const store = useAppStore();
  const rawDriverTags = store.appState.driverTags || [];
  const connections = store.appState.driverConnections || [];
  const assetHierarchy = store.appState.assetHierarchy || [];
  const latestValues = store.latestValues || {};

  const [search, setSearch] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');

  const connectionMap = useMemo(() => {
    const map = new Map<string, any>();
    connections.forEach(c => map.set(c.connectionId, c));
    return map;
  }, [connections]);

  // Combine driver tags and asset hierarchy tags into a unified list
  const allAvailableTags = useMemo(() => {
    const list: Array<{
      tagId: string;
      tagName: string;
      description?: string;
      address?: string | number;
      unit?: string;
      protocol: string;
      connectionName?: string;
      connectionId?: string;
      isAsset?: boolean;
    }> = [];

    // 1. Driver Tags
    rawDriverTags.forEach(t => {
      const conn = connectionMap.get(t.connectionId);
      list.push({
        tagId: t.tagId,
        tagName: t.tagName || t.tagId,
        description: t.description,
        address: t.address,
        unit: t.unit,
        protocol: (t.protocol || conn?.protocol || 'Driver').toUpperCase(),
        connectionName: conn?.name || t.connectionId || 'Local Driver',
        connectionId: t.connectionId,
        isAsset: false
      });
    });

    // 2. Asset Hierarchy Tags (Recursive traversal)
    const extractFromNodes = (nodes: any[]) => {
      for (const node of nodes) {
        if (Array.isArray(node.tags)) {
          for (const at of node.tags) {
            const proto = at.sourceType === 'static' ? 'ASSET (STATIC)' :
                          at.sourceType === 'sql_query' ? 'SQL' :
                          at.sourceType === 'driver' ? (at.source?.protocol?.toUpperCase() || 'DRIVER') : 'ASSET';
            list.push({
              tagId: at.tagId,
              tagName: at.name || at.tagId,
              description: at.description || `Asset: ${node.name}`,
              address: at.source?.address || (at.staticConfig?.initialValue ? `Val: ${at.staticConfig.initialValue}` : 'Internal'),
              unit: at.unit,
              protocol: proto,
              connectionName: node.name || 'Asset Tree',
              isAsset: true
            });
          }
        }
        if (Array.isArray(node.children)) {
          extractFromNodes(node.children);
        }
      }
    };

    extractFromNodes(assetHierarchy);
    return list;
  }, [rawDriverTags, assetHierarchy, connectionMap]);

  const protocols = useMemo(() => {
    const set = new Set<string>();
    allAvailableTags.forEach(t => {
      set.add(t.protocol);
    });
    return Array.from(set).sort();
  }, [allAvailableTags]);

  const filteredTags = useMemo(() => {
    const s = search.toLowerCase().trim();
    return allAvailableTags.filter(tag => {
      if (selectedProtocol !== 'all' && tag.protocol !== selectedProtocol) {
        return false;
      }

      if (!s) return true;

      const idMatch = (tag.tagId || '').toLowerCase().includes(s);
      const nameMatch = (tag.tagName || '').toLowerCase().includes(s);
      const descMatch = (tag.description || '').toLowerCase().includes(s);
      const addrMatch = String(tag.address ?? '').toLowerCase().includes(s);
      const connMatch = (tag.connectionName || '').toLowerCase().includes(s);

      return idMatch || nameMatch || descMatch || addrMatch || connMatch;
    });
  }, [allAvailableTags, search, selectedProtocol]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <i className="fas fa-tags text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">Browse and select from {allAvailableTags.length} configured SCADA & asset tags</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Tag ID, Name, Address, or Connection..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              autoFocus
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedProtocol}
              onChange={e => setSelectedProtocol(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Protocols ({allAvailableTags.length})</option>
              {protocols.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tag List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-800/60">
          {filteredTags.length > 0 ? (
            filteredTags.map(tag => {
              const conn = connectionMap.get(tag.connectionId);
              const proto = (tag.protocol || conn?.protocol || 'Unknown').toUpperCase();
              const isSelected = selectedTagId === tag.tagId;
              const liveVal = latestValues[tag.tagId]?.val;

              return (
                <div
                  key={tag.tagId}
                  onClick={() => {
                    onSelectTag({
                      tagId: tag.tagId,
                      tagName: tag.tagName || tag.tagId,
                      unit: tag.unit,
                      protocol: proto
                    });
                    onClose();
                  }}
                  className={`pt-2 first:pt-0 p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-sky-500/15 border border-sky-500/50'
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-sky-500/40">
                      <i className={`fas ${tag.isAsset ? 'fa-cube text-emerald-400' : 'fa-microchip text-sky-400'} text-xs`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-100 truncate">{tag.tagName || tag.tagId}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-400 border border-slate-700/80">
                          {tag.tagId}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          tag.isAsset
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                            : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        }`}>
                          {proto}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2 truncate">
                        <span>{tag.isAsset ? `Asset: ${tag.connectionName}` : `Conn: ${tag.connectionName}`}</span>
                        <span>·</span>
                        <span>Addr: {tag.address || 'Auto'}</span>
                        {tag.unit && (
                          <>
                            <span>·</span>
                            <span className="text-amber-300 font-mono">Unit: {tag.unit}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 pl-3">
                    {liveVal !== undefined && (
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-sky-400">
                          {typeof liveVal === 'number' ? liveVal.toFixed(2) : String(liveVal)}
                        </div>
                        <div className="text-[10px] text-slate-500">Live</div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      Select
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <i className="fas fa-search text-2xl text-slate-600 mb-1 block" />
              <p className="text-xs">No tags found matching "{search}"</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredTags.length} of {allAvailableTags.length} tags</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
