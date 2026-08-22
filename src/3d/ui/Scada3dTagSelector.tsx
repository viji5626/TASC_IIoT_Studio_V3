import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, DriverTag, DriverProtocol } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { scanAppTopics } from '../../utils/topicManager';
import { scanAppTags } from '../../utils/tagManager';

const PROTOCOL_BADGES: Record<DriverProtocol, { label: string; color: string }> = {
  opcua:      { label: 'OPC UA',     color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  opcda:      { label: 'OPC DA',     color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  modbus_tcp: { label: 'Modbus TCP', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  modbus_rtu: { label: 'Modbus RTU', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  iec61850:   { label: 'IEC 61850',  color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  s7:         { label: 'Siemens S7', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  melsec:     { label: 'MELSEC',     color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  ethernet_ip:{ label: 'EtherNet/IP',color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  profinet:   { label: 'PROFINET',   color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  profibus:   { label: 'PROFIBUS',   color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  rs485:      { label: 'RS-485',     color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  rs232:      { label: 'RS-232',     color: 'bg-amber-600/20 text-amber-300 border-amber-600/30' },
  usb_serial: { label: 'USB Serial', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  tcp_custom: { label: 'TCP Custom', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  custom:     { label: 'Custom',     color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
};

export interface Scada3dTagSelectorProps {
  dataSourceMode: 'mqtt' | 'driver';
  value: string;
  onChange: (value: string, meta?: { jsonPath?: string; dataType?: string; name?: string }) => void;
  jsonPath?: string;
  onJsonPathChange?: (jsonPath: string) => void;
  placeholder?: string;
  label?: string;
  appState?: AppState;
  compact?: boolean;
}

export const Scada3dTagSelector: React.FC<Scada3dTagSelectorProps> = ({
  dataSourceMode,
  value,
  onChange,
  jsonPath,
  onJsonPathChange,
  placeholder,
  label,
  appState: propAppState,
  compact = false
}) => {
  // Access global appState from AppContext if available
  let contextAppState: AppState | undefined;
  try {
    const ctx = useAppContext();
    contextAppState = ctx.appState;
  } catch {
    // Fallback if rendered outside AppContextProvider
  }

  const appState = propAppState || contextAppState;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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

  // Extract Driver Tags
  const driverTags = useMemo<DriverTag[]>(() => {
    return appState?.driverTags || [];
  }, [appState]);

  const driverConnections = useMemo(() => {
    return appState?.driverConnections || [];
  }, [appState]);

  const getConnectionName = (connId: string) => {
    const conn = driverConnections.find(c => c.connectionId === connId);
    return conn ? conn.connectionName : connId;
  };

  const getDriverAddressPreview = (tag: DriverTag): string => {
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
      return `${tag.registerType ? tag.registerType.replace(/_/g, ' ') : ''} ${tag.address}`;
    }
    return '';
  };

  // Extract MQTT Topics & Tags
  const { mqttTopics, mqttTags } = useMemo(() => {
    if (!appState) return { mqttTopics: [], mqttTags: [] };

    try {
      const topicSummary = scanAppTopics(appState);
      const tagSummary = scanAppTags(appState);

      const topics = topicSummary.topics.map(t => ({
        topic: t.topic,
        rawTopic: t.topic,
        widgetsCount: t.widgetsCount || 0,
        direction: t.direction,
        dashboardName: t.occurrences[0]?.dashboardName || 'Dashboard'
      }));

      const tags = (tagSummary.tags || []).map(t => ({
        tagId: t.tagId,
        tagName: t.tagName,
        parsingDefinition: t.parsingDefinition,
        tagType: t.tagType,
        sourceType: t.sourceType,
        widgetsCount: t.widgetsCount
      }));

      return { mqttTopics: topics, mqttTags: tags };
    } catch {
      return { mqttTopics: [], mqttTags: [] };
    }
  }, [appState]);

  // Check if current typed value matches any known Driver Tag or Topic
  const matchedDriverTag = useMemo(() => {
    if (dataSourceMode !== 'driver' || !value.trim()) return null;
    return driverTags.find(
      t => t.tagId.toLowerCase() === value.trim().toLowerCase() ||
           t.tagName.toLowerCase() === value.trim().toLowerCase()
    ) || null;
  }, [dataSourceMode, value, driverTags]);

  const matchedMqttTopic = useMemo(() => {
    if (dataSourceMode !== 'mqtt' || !value.trim()) return null;
    return mqttTopics.find(
      t => t.topic.toLowerCase() === value.trim().toLowerCase() ||
           t.rawTopic.toLowerCase() === value.trim().toLowerCase()
    ) || null;
  }, [dataSourceMode, value, mqttTopics]);

  // Filter Driver Tags for dropdown
  const filteredDriverTags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return driverTags;
    return driverTags.filter(t =>
      t.tagName.toLowerCase().includes(q) ||
      t.tagId.toLowerCase().includes(q) ||
      t.protocol.toLowerCase().includes(q) ||
      t.dataType.toLowerCase().includes(q) ||
      getConnectionName(t.connectionId).toLowerCase().includes(q) ||
      getDriverAddressPreview(t).toLowerCase().includes(q)
    );
  }, [driverTags, searchQuery, driverConnections]);

  // Filter MQTT Topics & Tags for dropdown
  const filteredMqttTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mqttTopics;
    return mqttTopics.filter(t =>
      t.topic.toLowerCase().includes(q) ||
      t.dashboardName.toLowerCase().includes(q)
    );
  }, [mqttTopics, searchQuery]);

  const filteredMqttTags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mqttTags;
    return mqttTags.filter(t =>
      t.tagName.toLowerCase().includes(q) ||
      t.parsingDefinition.toLowerCase().includes(q)
    );
  }, [mqttTags, searchQuery]);

  const handleSelectDriverTag = (tag: DriverTag) => {
    onChange(tag.tagId, {
      dataType: tag.dataType,
      name: tag.tagName
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectMqttTopic = (topicStr: string) => {
    onChange(topicStr);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectMqttTag = (tag: { tagName: string; parsingDefinition: string }) => {
    // If the tag has a parsing definition (e.g. $.speed or speed), set jsonPath as well
    if (onJsonPathChange && tag.parsingDefinition) {
      onJsonPathChange(tag.parsingDefinition);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const defaultPlaceholder = dataSourceMode === 'driver' 
    ? (placeholder || 'Type or select Driver Tag ID (e.g. TAG_DG_STATUS)') 
    : (placeholder || 'Type or select MQTT Topic (e.g. plant/generator/status)');

  const totalItemsCount = dataSourceMode === 'driver' ? driverTags.length : (mqttTopics.length + mqttTags.length);

  return (
    <div ref={containerRef} className="relative space-y-1">
      {/* Label and Detected Badge Header */}
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <i className={`fas ${dataSourceMode === 'driver' ? 'fa-microchip text-violet-400' : 'fa-satellite-dish text-sky-400'} text-[9px]`}></i>
            <span>{label}</span>
          </label>
        )}

        {/* Auto-detect Status Pill */}
        {value.trim().length > 0 && (
          dataSourceMode === 'driver' ? (
            matchedDriverTag ? (
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <i className="fas fa-check-circle text-[8px]"></i>
                <span>PLC: {matchedDriverTag.tagName}</span>
              </span>
            ) : (
              <span className="text-[9px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                <i className="fas fa-pen text-[8px]"></i>
                <span>Manual Tag</span>
              </span>
            )
          ) : (
            matchedMqttTopic ? (
              <span className="text-[9px] bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/30 flex items-center gap-1">
                <i className="fas fa-check-circle text-[8px]"></i>
                <span>Topic ({matchedMqttTopic.widgetsCount}w)</span>
              </span>
            ) : (
              <span className="text-[9px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                <i className="fas fa-pen text-[8px]"></i>
                <span>Custom</span>
              </span>
            )
          )
        )}
      </div>

      {/* Input Group with Dropdown Trigger */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={defaultPlaceholder}
          className={`w-full bg-slate-900 text-slate-200 rounded-lg border outline-none font-mono transition-colors ${
            isOpen ? 'border-sky-500 ring-1 ring-sky-500/30' : 'border-slate-700 hover:border-slate-600 focus:border-sky-500'
          } ${compact ? 'px-2 py-1 text-xs pr-14' : 'px-2.5 py-1.5 text-xs pr-16'}`}
        />

        {/* Action Controls on the Right */}
        <div className="absolute right-1 flex items-center gap-0.5">
          {value.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-slate-500 hover:text-slate-300 p-1 text-[10px] transition-colors"
              title="Clear tag"
            >
              <i className="fas fa-xmark"></i>
            </button>
          )}

          {/* Browse / Dropdown Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              setSearchQuery('');
            }}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold transition-all border ${
              isOpen
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700'
            }`}
            title={`Browse & select ${dataSourceMode === 'driver' ? 'Driver Tags' : 'MQTT Topics & Tags'}`}
          >
            <i className={`fas ${dataSourceMode === 'driver' ? 'fa-microchip' : 'fa-list-ul'} text-[8px]`}></i>
            <span className="text-[9px]">{totalItemsCount}</span>
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-[8px]`}></i>
          </button>
        </div>
      </div>

      {/* Floating Browsable Popover */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/70 animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '260px' }}
        >
          {/* Search Box */}
          <div className="p-2 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <i className="fas fa-search text-xs text-slate-400"></i>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={dataSourceMode === 'driver' ? 'Search PLC tags, protocols, addresses...' : 'Search MQTT topics, tags, paths...'}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none flex-1 font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  <i className="fas fa-xmark"></i>
                </button>
              )}
            </div>
          </div>

          {/* List Area */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 divide-y divide-slate-800/40">
            {dataSourceMode === 'driver' ? (
              // DRIVER TAGS LIST
              filteredDriverTags.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-slate-400 text-xs mb-1 font-medium">
                    {driverTags.length === 0 ? 'No driver tags registered yet.' : 'No driver tags match your search.'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    You can type any tag ID directly, or configure connections in <span className="text-violet-400 font-semibold">Driver Tag Manager</span>.
                  </p>
                </div>
              ) : (
                filteredDriverTags.map(tag => {
                  const isSelected = value === tag.tagId || value === tag.tagName;
                  const badge = PROTOCOL_BADGES[tag.protocol] || { label: tag.protocol, color: 'bg-slate-700 text-slate-300' };
                  const addr = getDriverAddressPreview(tag);
                  const connName = getConnectionName(tag.connectionId);

                  return (
                    <button
                      key={tag.tagId}
                      type="button"
                      onClick={() => handleSelectDriverTag(tag)}
                      className={`w-full text-left p-2 rounded-lg flex items-start justify-between gap-2 transition-colors ${
                        isSelected ? 'bg-violet-600/20 border border-violet-500/40' : 'hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-xs text-white font-bold truncate">{tag.tagName}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {tag.dataType}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-mono text-violet-300 truncate">{tag.tagId}</span>
                          {addr && <span className="font-mono text-slate-500 truncate">• {addr}</span>}
                        </div>

                        {connName && (
                          <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                            <i className="fas fa-network-wired text-[8px] mr-1"></i>{connName}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                          <i className="fas fa-check"></i>
                        </div>
                      )}
                    </button>
                  );
                })
              )
            ) : (
              // MQTT TOPICS & TAGS LIST
              <>
                {/* Auto-Detected Topics */}
                {filteredMqttTopics.length > 0 && (
                  <div className="p-1">
                    <div className="px-2 py-1 text-[9px] font-bold uppercase text-sky-400 tracking-wider flex items-center justify-between">
                      <span>Detected Topics ({filteredMqttTopics.length})</span>
                      <i className="fas fa-satellite-dish text-[8px]"></i>
                    </div>

                    {filteredMqttTopics.map(t => {
                      const isSelected = value === t.topic || value === t.rawTopic;
                      return (
                        <button
                          key={t.topic}
                          type="button"
                          onClick={() => handleSelectMqttTopic(t.topic)}
                          className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition-colors ${
                            isSelected ? 'bg-sky-600/20 border border-sky-500/40' : 'hover:bg-slate-800/80 border border-transparent'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono text-sky-300 font-bold truncate">
                              {t.topic}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{t.dashboardName}</span>
                              <span>• {t.widgetsCount} widgets</span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[9px] shrink-0">
                              <i className="fas fa-check"></i>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Auto-Detected JSON Path Tags */}
                {filteredMqttTags.length > 0 && (
                  <div className="p-1 border-t border-slate-800">
                    <div className="px-2 py-1 text-[9px] font-bold uppercase text-emerald-400 tracking-wider flex items-center justify-between">
                      <span>Payload / JSON Tags ({filteredMqttTags.length})</span>
                      <i className="fas fa-code text-[8px]"></i>
                    </div>

                    {filteredMqttTags.map(tag => (
                      <button
                        key={tag.tagId || tag.parsingDefinition}
                        type="button"
                        onClick={() => handleSelectMqttTag(tag)}
                        className="w-full text-left p-1.5 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-emerald-300 truncate block">
                            {tag.tagName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            {tag.parsingDefinition}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                          {tag.tagType}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredMqttTopics.length === 0 && filteredMqttTags.length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-slate-400 text-xs mb-1 font-medium">No MQTT topics or tags found matching search.</p>
                    <p className="text-[10px] text-slate-500">
                      You can type any topic string manually in the input above.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="p-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 px-2.5">
            <span>💡 Select from list or type custom tag</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
