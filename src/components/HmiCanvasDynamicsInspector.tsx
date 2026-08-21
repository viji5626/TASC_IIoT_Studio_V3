import React, { useState, useMemo } from 'react';
import { Panel, AppState, DynamicBehaviorRule, DynamicPropertyType, DriverTag } from '../types';
import { ColorBoxPopover } from './ColorBoxPopover';
import { TagAutocompleteInput } from './TagAutocompleteInput';
import { TopicAutocompleteInput } from './TopicAutocompleteInput';
import { getSymbolParts } from '../utils/symbolAnatomyRegistry';
import { scanAppTopics } from '../utils/topicManager';

interface HmiCanvasDynamicsInspectorProps {
  appState: AppState;
  selectedPanels: Panel[];
  activeSubPartSelection: { panelId: string; partId: string } | null;
  onAddDynamicRule: (panelId: string, partId: string | null, ruleType: DynamicPropertyType) => void;
  onUpdateDynamicRule: (panelId: string, partId: string | null, ruleId: string, updates: Partial<DynamicBehaviorRule>) => void;
  onDeleteDynamicRule: (panelId: string, partId: string | null, ruleId: string) => void;
  onToggleDynamicRule: (panelId: string, partId: string | null, ruleId: string) => void;
  onClearSubPartSelection?: () => void;
}

const DYNAMIC_LIBRARY_ITEMS: Array<{
  type: DynamicPropertyType;
  label: string;
  desc: string;
  icon: string;
  color: string;
}> = [
  {
    type: 'visibility_blink',
    label: 'Visibility & Hide/Show',
    desc: 'Hide, Show, or Blink flashing strobe based on digital state or analog condition',
    icon: 'fa-eye-slash',
    color: 'text-rose-400'
  },
  {
    type: 'color_shift',
    label: 'Color Shift',
    desc: 'Change fill / stroke / text color on digital 0/1 or analog threshold',
    icon: 'fa-palette',
    color: 'text-amber-400'
  },
  {
    type: 'rotation',
    label: 'Rotation & Spin',
    desc: 'Run/Stop spin on digital state or analog angular deflection range',
    icon: 'fa-rotate',
    color: 'text-sky-400'
  },
  {
    type: 'level_fill',
    label: 'Level / Fluid Fill',
    desc: 'Dynamic liquid level animation for tanks, vessels, pipes',
    icon: 'fa-water',
    color: 'text-emerald-400'
  },
  {
    type: 'opacity_fade',
    label: 'Opacity & Alpha',
    desc: 'Fade transparency based on digital state or analog value',
    icon: 'fa-circle-half-stroke',
    color: 'text-purple-400'
  },
  {
    type: 'discrete_motion',
    label: 'Motion Path',
    desc: 'Translate part position along 2D coordinate vector',
    icon: 'fa-route',
    color: 'text-indigo-400'
  }
];

const JSONPATH_QUICK_CHIPS = [
  '$.value',
  '$.val',
  '$.data',
  '$.status',
  '$.temperature',
  '$.level',
  '$.state'
];

export const HmiCanvasDynamicsInspector: React.FC<HmiCanvasDynamicsInspectorProps> = ({
  appState,
  selectedPanels,
  activeSubPartSelection,
  onAddDynamicRule,
  onUpdateDynamicRule,
  onDeleteDynamicRule,
  onToggleDynamicRule,
  onClearSubPartSelection
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isTagBrowserOpen, setIsTagBrowserOpen] = useState(false);
  const [isTopicBrowserOpen, setIsTopicBrowserOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [topicSearchQuery, setTopicSearchQuery] = useState('');

  const targetPanel = selectedPanels[0];
  const isSubPart = !!activeSubPartSelection;

  // Resolve sub-part definition and current dynamics list
  const { targetName, targetCategory, dynamicsList } = useMemo(() => {
    if (!targetPanel) {
      return { targetName: '', targetCategory: '', dynamicsList: [] as DynamicBehaviorRule[] };
    }

    if (isSubPart && activeSubPartSelection) {
      const parts = getSymbolParts(targetPanel.symbolId);
      const partDef = parts.find(p => p.partId === activeSubPartSelection.partId);
      const subConfig = targetPanel.svgSubParts?.[activeSubPartSelection.partId];
      const rules = subConfig?.dynamics || [];
      return {
        targetName: partDef?.name || activeSubPartSelection.partId,
        targetCategory: partDef?.category || 'part',
        dynamicsList: rules
      };
    }

    return {
      targetName: targetPanel.panelName || targetPanel.type,
      targetCategory: targetPanel.type,
      dynamicsList: targetPanel.dynamics || []
    };
  }, [targetPanel, isSubPart, activeSubPartSelection]);

  // Selected Rule currently viewed in bottom 50%
  const activeRule = useMemo(() => {
    if (!dynamicsList.length) return null;
    if (selectedRuleId) {
      const found = dynamicsList.find(r => r.id === selectedRuleId);
      if (found) return found;
    }
    return dynamicsList[0] || null;
  }, [dynamicsList, selectedRuleId]);

  // Filtered driver tags for browse modal
  const filteredDriverTags = useMemo(() => {
    const tags = appState.driverTags || [];
    if (!tagSearchQuery.trim()) return tags;
    const q = tagSearchQuery.toLowerCase();
    return tags.filter(t => 
      t.tagId.toLowerCase().includes(q) ||
      (t.tagName && t.tagName.toLowerCase().includes(q)) ||
      (t.address !== undefined && String(t.address).toLowerCase().includes(q)) ||
      (t.protocol && t.protocol.toLowerCase().includes(q)) ||
      (t.s7Address && t.s7Address.toLowerCase().includes(q)) ||
      (t.melsecAddress && t.melsecAddress.toLowerCase().includes(q)) ||
      (t.nodeId && t.nodeId.toLowerCase().includes(q))
    );
  }, [appState.driverTags, tagSearchQuery]);

  // Scanned project MQTT topics for topic browser modal
  const scannedMqttTopics = useMemo(() => {
    const summary = scanAppTopics(appState);
    const set = new Set<string>();
    summary.topics.forEach(t => set.add(t.topic));
    appState.panels.forEach(p => {
      if (p.topic) set.add(p.topic);
    });
    const arr = Array.from(set);
    if (!topicSearchQuery.trim()) return arr;
    const q = topicSearchQuery.toLowerCase();
    return arr.filter(t => t.toLowerCase().includes(q));
  }, [appState, topicSearchQuery]);

  if (!targetPanel) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 space-y-3 select-none">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
          <i className="fas fa-wand-magic-sparkles text-xl"></i>
        </div>
        <div>
          <h4 className="font-bold text-slate-300 text-xs">No Element Selected</h4>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
            Select an element or SVG Sub-Part in the Explorer tree to configure real-time telemetry dynamics.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateRule = (type: DynamicPropertyType) => {
    const partId = isSubPart && activeSubPartSelection ? activeSubPartSelection.partId : null;
    onAddDynamicRule(targetPanel.panelId, partId, type);
    setIsAddMenuOpen(false);
  };

  const handleUpdateActiveRule = (updates: Partial<DynamicBehaviorRule>) => {
    if (!activeRule) return;
    const partId = isSubPart && activeSubPartSelection ? activeSubPartSelection.partId : null;
    onUpdateDynamicRule(targetPanel.panelId, partId, activeRule.id, updates);
  };

  const handleDeleteRule = (ruleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const partId = isSubPart && activeSubPartSelection ? activeSubPartSelection.partId : null;
    onDeleteDynamicRule(targetPanel.panelId, partId, ruleId);
    if (selectedRuleId === ruleId) setSelectedRuleId(null);
  };

  const handleToggleRule = (ruleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const partId = isSubPart && activeSubPartSelection ? activeSubPartSelection.partId : null;
    onToggleDynamicRule(targetPanel.panelId, partId, ruleId);
  };

  const currentTagDataType = activeRule?.tagDataType || (activeRule?.type === 'level_fill' ? 'analog' : 'digital');

  return (
    <div className="flex flex-col h-full text-slate-200 select-none text-xs overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP 50%: DYNAMICS STACK & LIBRARY SELECTOR                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="h-[46%] border-b border-slate-800/80 flex flex-col min-h-0 bg-slate-950/40">
        {/* Header Target Badge */}
        <div className="p-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <i className="fas fa-wand-magic-sparkles text-amber-400 text-xs"></i>
              <span className="font-extrabold text-white text-xs truncate">
                {targetName}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono mt-0.5">
              <span>Target: <strong className="text-sky-300">{isSubPart ? 'SVG Sub-Part' : 'Element'}</strong></span>
              <span>•</span>
              <span className="uppercase text-slate-500">{targetCategory}</span>
            </div>
          </div>

          {/* "+ Add Dynamic" Button with Dropdown Menu */}
          <div className="relative shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(prev => !prev)}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs transition-all shadow-md flex items-center space-x-1 cursor-pointer active:scale-95"
            >
              <i className="fas fa-plus text-[10px]"></i>
              <span>Add Dynamic</span>
            </button>

            {/* Library Menu Dropdown */}
            {isAddMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 w-64 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150 space-y-0.5"
              >
                <div className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Dynamic Behavior Library</span>
                  <i className="fas fa-bolt text-amber-400 text-[9px]"></i>
                </div>

                {DYNAMIC_LIBRARY_ITEMS.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleCreateRule(item.type)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center space-x-2 text-slate-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <i className={`fas ${item.icon} ${item.color} w-4 text-center text-xs shrink-0`}></i>
                    <div className="truncate">
                      <span className="font-bold block text-[11px]">{item.label}</span>
                      <span className="text-[8px] text-slate-400 block line-clamp-1">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Dynamics List (Scrollable Stack) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {dynamicsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-6 px-4 space-y-2">
              <i className="fas fa-layer-group text-2xl opacity-30 text-slate-400"></i>
              <p className="text-[11px] font-medium text-slate-400">No dynamic properties assigned</p>
              <p className="text-[9px] text-slate-500 max-w-[200px]">
                Click <strong className="text-amber-300">+ Add Dynamic</strong> to bind Hide/Show, 2-State digital colors, rotation, level fills, or motion.
              </p>
            </div>
          ) : (
            dynamicsList.map((rule, idx) => {
              const isSelected = activeRule?.id === rule.id;
              const meta = DYNAMIC_LIBRARY_ITEMS.find(m => m.type === rule.type);
              const isDigital = (rule.tagDataType || (rule.type === 'level_fill' ? 'analog' : 'digital')) === 'digital';

              return (
                <div
                  key={rule.id}
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-sm'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                  } ${!rule.enabled ? 'opacity-50' : ''}`}
                >
                  {/* Left Icon & Rule Summary */}
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 ${meta?.color || 'text-amber-400'}`}>
                      <i className={`fas ${meta?.icon || 'fa-bolt'} text-[10px]`}></i>
                    </div>

                    <div className="truncate">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-[11px] text-white truncate">
                          {rule.name || meta?.label || 'Dynamic Rule'}
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className={`text-[7px] font-bold uppercase px-1 py-0.2 rounded ${
                          isDigital ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}>
                          {isDigital ? 'DIGITAL (0/1)' : 'ANALOG'}
                        </span>
                      </div>

                      {/* Tag ID / Topic Badge */}
                      <div className="flex items-center space-x-1 text-[8px] font-mono text-slate-400 mt-0.5 truncate">
                        <span className={`px-1 py-0.2 rounded font-bold ${rule.dataSourceMode === 'driver' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-sky-950 text-sky-300 border border-sky-800'}`}>
                          {rule.dataSourceMode === 'driver' ? 'DRIVER' : 'MQTT'}
                        </span>
                        <span className="truncate text-slate-300 max-w-[100px]">
                          {rule.dataSourceMode === 'driver' ? (rule.driverTagId || 'No Tag') : (rule.topic || 'No Topic')}
                        </span>
                        {rule.dataSourceMode === 'mqtt' && rule.jsonPath && (
                          <span className="text-amber-400 truncate max-w-[60px]" title={rule.jsonPath}>
                            [{rule.jsonPath}]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Enable Toggle & Trash */}
                  <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleToggleRule(rule.id, e)}
                      className={`p-1 rounded text-[10px] transition-colors ${
                        rule.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                    >
                      <i className={`fas ${rule.enabled ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm`}></i>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteRule(rule.id, e)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title="Delete Dynamic Rule"
                    >
                      <i className="fas fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BOTTOM 50%: SELECTED DYNAMIC PROPERTY CONFIGURATION           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-slate-900/30">
        {!activeRule ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-6">
            <i className="fas fa-sliders text-xl opacity-30 mb-1"></i>
            <p className="text-[10px] text-slate-500">Select a dynamic rule above to configure its telemetry bindings and parameters.</p>
          </div>
        ) : (
          <>
            {/* Rule Header & Custom Name */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                  Configure Dynamic Property
                </span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.2 rounded border border-amber-500/30">
                  {activeRule.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Rule Name / Description:</label>
                <input
                  type="text"
                  value={activeRule.name || ''}
                  onChange={(e) => handleUpdateActiveRule({ name: e.target.value })}
                  placeholder="e.g. Valve Open/Closed Indicator"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-medium outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Telemetry Data Source Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                  <i className="fas fa-database text-emerald-400"></i>
                  <span>Telemetry Data Source</span>
                </div>

                {/* Data Source Mode Toggle */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleUpdateActiveRule({ dataSourceMode: 'driver' })}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${
                      activeRule.dataSourceMode === 'driver'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Driver Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateActiveRule({ dataSourceMode: 'mqtt' })}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${
                      activeRule.dataSourceMode === 'mqtt'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    MQTT Topic
                  </button>
                </div>
              </div>

              {/* Tag / Topic Autocomplete Input with Quick Browse Button */}
              {activeRule.dataSourceMode === 'driver' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400 font-mono">Driver Tag ID:</label>
                    <button
                      type="button"
                      onClick={() => setIsTagBrowserOpen(true)}
                      className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <i className="fas fa-list"></i>
                      <span>Browse Tag Registry ({appState.driverTags?.length || 0})</span>
                    </button>
                  </div>
                  <TagAutocompleteInput
                    name="driverTagId"
                    label=""
                    value={activeRule.driverTagId || ''}
                    onChange={(val) => handleUpdateActiveRule({ driverTagId: val })}
                    tagType="read"
                    appState={appState}
                    placeholder="e.g. MODBUS_HOLDING_40001, SIEMENS_DB1_DBD0"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-mono">MQTT Telemetry Topic:</label>
                      <button
                        type="button"
                        onClick={() => setIsTopicBrowserOpen(true)}
                        className="text-[9px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer"
                      >
                        <i className="fas fa-list"></i>
                        <span>Browse Topics</span>
                      </button>
                    </div>
                    <TopicAutocompleteInput
                      name="topic"
                      label=""
                      value={activeRule.topic || ''}
                      onChange={(val) => handleUpdateActiveRule({ topic: val })}
                      direction="subscribe"
                      appState={appState}
                      placeholder="e.g. factory/boiler/temperature"
                    />
                  </div>

                  {/* Individual JSONPath Query for MQTT Payload */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-amber-400 font-mono flex items-center space-x-1">
                        <i className="fas fa-code text-[9px]"></i>
                        <span>JSONPath Query (Read):</span>
                      </label>
                      <span className="text-[8px] text-slate-500">Optional for JSON payloads</span>
                    </div>
                    <input
                      type="text"
                      value={activeRule.jsonPath || ''}
                      onChange={(e) => handleUpdateActiveRule({ jsonPath: e.target.value })}
                      placeholder="e.g. $.temperature, $.status, $.v[0]"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 font-mono text-xs text-amber-300 outline-none focus:border-amber-500"
                    />
                    {/* Quick JSONPath Chip Tokens */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[8px] text-slate-500">Quick:</span>
                      {JSONPATH_QUICK_CHIPS.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleUpdateActiveRule({ jsonPath: chip })}
                          className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-300 transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tag Data Format Mode: 2-State Digital (0/1) vs Analog */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                  <i className="fas fa-toggle-on text-purple-400"></i>
                  <span>Tag Format & Trigger Behavior</span>
                </div>

                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleUpdateActiveRule({ tagDataType: 'digital' })}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${
                      currentTagDataType === 'digital'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Digital (0 / 1)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateActiveRule({ tagDataType: 'analog' })}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${
                      currentTagDataType === 'analog'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Analog / Range
                  </button>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────── */}
              {/* 1. DIGITAL 2-STATE CONFIGURATION (DEFAULT 0 AND 1)        */}
              {/* ───────────────────────────────────────────────────────── */}
              {currentTagDataType === 'digital' ? (
                <div className="space-y-3">
                  <p className="text-[9px] text-slate-400">
                    Define distinct visual actions for discrete digital values (State 1 default <strong className="text-slate-200">0</strong>, State 2 default <strong className="text-slate-200">1</strong>).
                  </p>

                  {/* State 1 Card (Default Value 0) */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span className="font-extrabold text-[10px] text-slate-300 uppercase">State 1 (OFF / State 0)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[9px] text-slate-400 font-mono">Tag Val:</span>
                        <input
                          type="text"
                          value={activeRule.state1Value !== undefined ? String(activeRule.state1Value) : '0'}
                          onChange={(e) => handleUpdateActiveRule({ state1Value: e.target.value })}
                          placeholder="0"
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.2 text-center text-xs font-mono text-white outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* State 1 Action for Visibility */}
                    {activeRule.type === 'visibility_blink' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">State 1 Visibility:</label>
                        <select
                          value={activeRule.state1Visibility || 'hide'}
                          onChange={(e) => handleUpdateActiveRule({ state1Visibility: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="hide">Hide Part (Invisible)</option>
                          <option value="show">Show Part (Visible)</option>
                          <option value="blink">Blink / Alarm Strobe</option>
                        </select>
                      </div>
                    )}

                    {/* State 1 Action for Color Shift */}
                    {activeRule.type === 'color_shift' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Fill:</span>
                          <ColorBoxPopover
                            label="State 1 Fill"
                            icon="fa-fill-drip"
                            iconColorClass="text-slate-400"
                            color={activeRule.state1Fill || '#334155'}
                            onChange={(c) => handleUpdateActiveRule({ state1Fill: c })}
                            defaultColor="#334155"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Stroke:</span>
                          <ColorBoxPopover
                            label="State 1 Stroke"
                            icon="fa-border-all"
                            iconColorClass="text-slate-400"
                            color={activeRule.state1Stroke || '#0f172a'}
                            onChange={(c) => handleUpdateActiveRule({ state1Stroke: c })}
                            defaultColor="#0f172a"
                          />
                        </div>
                      </div>
                    )}

                    {/* State 1 Action for Rotation */}
                    {activeRule.type === 'rotation' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Motor Spin:</span>
                          <select
                            value={activeRule.state1Rotate ? (activeRule.state1RotationDirection || 'cw') : 'stopped'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'stopped') {
                                handleUpdateActiveRule({ state1Rotate: false });
                              } else {
                                handleUpdateActiveRule({ state1Rotate: true, state1RotationDirection: val as any });
                              }
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white"
                          >
                            <option value="stopped">Stopped</option>
                            <option value="cw">Spin Clockwise (CW)</option>
                            <option value="ccw">Spin Counter-Clockwise (CCW)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* State 1 Action for Opacity */}
                    {activeRule.type === 'opacity_fade' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>State 1 Opacity:</span>
                          <span className="font-mono text-purple-300">{Math.round((activeRule.state1Opacity ?? 0) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={activeRule.state1Opacity ?? 0}
                          onChange={(e) => handleUpdateActiveRule({ state1Opacity: parseFloat(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer h-1 bg-slate-700 rounded appearance-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* State 2 Card (Default Value 1) */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="font-extrabold text-[10px] text-emerald-300 uppercase">State 2 (ON / State 1)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[9px] text-slate-400 font-mono">Tag Val:</span>
                        <input
                          type="text"
                          value={activeRule.state2Value !== undefined ? String(activeRule.state2Value) : '1'}
                          onChange={(e) => handleUpdateActiveRule({ state2Value: e.target.value })}
                          placeholder="1"
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.2 text-center text-xs font-mono text-emerald-300 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* State 2 Action for Visibility */}
                    {activeRule.type === 'visibility_blink' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">State 2 Visibility:</label>
                        <select
                          value={activeRule.state2Visibility || 'show'}
                          onChange={(e) => handleUpdateActiveRule({ state2Visibility: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="show">Show Part (Visible)</option>
                          <option value="hide">Hide Part (Invisible)</option>
                          <option value="blink">Blink / Alarm Strobe</option>
                        </select>
                      </div>
                    )}

                    {/* State 2 Action for Color Shift */}
                    {activeRule.type === 'color_shift' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Fill:</span>
                          <ColorBoxPopover
                            label="State 2 Fill"
                            icon="fa-fill-drip"
                            iconColorClass="text-emerald-400"
                            color={activeRule.state2Fill || '#10b981'}
                            onChange={(c) => handleUpdateActiveRule({ state2Fill: c })}
                            defaultColor="#10b981"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Stroke:</span>
                          <ColorBoxPopover
                            label="State 2 Stroke"
                            icon="fa-border-all"
                            iconColorClass="text-emerald-400"
                            color={activeRule.state2Stroke || '#059669'}
                            onChange={(c) => handleUpdateActiveRule({ state2Stroke: c })}
                            defaultColor="#059669"
                          />
                        </div>
                      </div>
                    )}

                    {/* State 2 Action for Rotation */}
                    {activeRule.type === 'rotation' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Motor Spin:</span>
                          <select
                            value={activeRule.state2Rotate !== false ? (activeRule.state2RotationDirection || 'cw') : 'stopped'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'stopped') {
                                handleUpdateActiveRule({ state2Rotate: false });
                              } else {
                                handleUpdateActiveRule({ state2Rotate: true, state2RotationDirection: val as any });
                              }
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white"
                          >
                            <option value="cw">Spin Clockwise (CW)</option>
                            <option value="ccw">Spin Counter-Clockwise (CCW)</option>
                            <option value="stopped">Stopped</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* State 2 Action for Opacity */}
                    {activeRule.type === 'opacity_fade' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>State 2 Opacity:</span>
                          <span className="font-mono text-emerald-300">{Math.round((activeRule.state2Opacity ?? 1) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={activeRule.state2Opacity ?? 1}
                          onChange={(e) => handleUpdateActiveRule({ state2Opacity: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-700 rounded appearance-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ───────────────────────────────────────────────────────── */
                /* 2. ANALOG CONDITION / THRESHOLD / RANGE CONFIGURATION    */
                /* ───────────────────────────────────────────────────────── */
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-medium">Condition Mode:</label>
                    <select
                      value={activeRule.conditionType || 'always'}
                      onChange={(e) => handleUpdateActiveRule({ conditionType: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="always">Continuous / Always Active</option>
                      <option value="threshold">Analog Threshold Compare (&gt;, &lt;, ==, !=)</option>
                      <option value="range">Analog Range Mapping (Min $\leftrightarrow$ Max)</option>
                    </select>
                  </div>

                  {/* Threshold inputs */}
                  {activeRule.conditionType === 'threshold' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium">Operator:</label>
                        <select
                          value={activeRule.operator || '>'}
                          onChange={(e) => handleUpdateActiveRule({ operator: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none"
                        >
                          <option value=">">&gt; Greater than</option>
                          <option value=">=">&gt;= Greater or Equal</option>
                          <option value="<">&lt; Less than</option>
                          <option value="<=">&lt;= Less or Equal</option>
                          <option value="==">== Equal to</option>
                          <option value="!=">!= Not Equal</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium">Compare Value:</label>
                        <input
                          type="text"
                          value={activeRule.conditionValue !== undefined ? String(activeRule.conditionValue) : '50'}
                          onChange={(e) => handleUpdateActiveRule({ conditionValue: e.target.value })}
                          placeholder="e.g. 80"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Range inputs */}
                  {activeRule.conditionType === 'range' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium">Tag Min Value:</label>
                        <input
                          type="number"
                          value={activeRule.minTagValue ?? 0}
                          onChange={(e) => handleUpdateActiveRule({ minTagValue: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium">Tag Max Value:</label>
                        <input
                          type="number"
                          value={activeRule.maxTagValue ?? 100}
                          onChange={(e) => handleUpdateActiveRule({ maxTagValue: parseFloat(e.target.value) || 100 })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Analog Visibility Actions */}
                  {activeRule.type === 'visibility_blink' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium">When Match:</label>
                          <select
                            value={activeRule.actionOnMatch || 'hide'}
                            onChange={(e) => handleUpdateActiveRule({ actionOnMatch: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                          >
                            <option value="hide">Hide Part (Invisible)</option>
                            <option value="show">Show Part (Visible)</option>
                            <option value="blink">Blink / Alarm Strobe</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium">When Not Match (Else):</label>
                          <select
                            value={activeRule.actionOnElse || 'show'}
                            onChange={(e) => handleUpdateActiveRule({ actionOnElse: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                          >
                            <option value="show">Show Part (Visible)</option>
                            <option value="hide">Hide Part (Invisible)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analog Color Shift Actions */}
                  {activeRule.type === 'color_shift' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300 font-medium">Target Fill Color:</span>
                        <ColorBoxPopover
                          label="Fill"
                          icon="fa-fill-drip"
                          iconColorClass="text-amber-400"
                          color={activeRule.targetFill || '#ef4444'}
                          onChange={(c) => handleUpdateActiveRule({ targetFill: c })}
                          defaultColor="#ef4444"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300 font-medium">Target Stroke Color:</span>
                        <ColorBoxPopover
                          label="Stroke"
                          icon="fa-border-all"
                          iconColorClass="text-rose-400"
                          color={activeRule.targetStroke || '#f87171'}
                          onChange={(c) => handleUpdateActiveRule({ targetStroke: c })}
                          defaultColor="#f87171"
                        />
                      </div>
                    </div>
                  )}

                  {/* Analog Rotation Actions */}
                  {activeRule.type === 'rotation' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">Rotation Mode:</label>
                        <select
                          value={activeRule.rotationMode || 'continuous_spin'}
                          onChange={(e) => handleUpdateActiveRule({ rotationMode: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="continuous_spin">Continuous Motor/Agitator Spin</option>
                          <option value="angle_deflection">Analog Angular Deflection (e.g. 0° - 90°)</option>
                        </select>
                      </div>

                      {activeRule.rotationMode === 'angle_deflection' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium">Min Angle (°):</label>
                            <input
                              type="number"
                              value={activeRule.minAngle ?? 0}
                              onChange={(e) => handleUpdateActiveRule({ minAngle: parseInt(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium">Max Angle (°):</label>
                            <input
                              type="number"
                              value={activeRule.maxAngle ?? 90}
                              onChange={(e) => handleUpdateActiveRule({ maxAngle: parseInt(e.target.value) || 90 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium">Direction:</label>
                            <select
                              value={activeRule.rotationDirection || 'cw'}
                              onChange={(e) => handleUpdateActiveRule({ rotationDirection: e.target.value as any })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none"
                            >
                              <option value="cw">Clockwise (CW)</option>
                              <option value="ccw">Counter-Clockwise (CCW)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-medium">Duration / Speed (s):</label>
                            <input
                              type="number"
                              step="0.2"
                              min="0.2"
                              max="10"
                              value={activeRule.rotationSpeed ?? 2}
                              onChange={(e) => handleUpdateActiveRule({ rotationSpeed: parseFloat(e.target.value) || 2 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analog Level Fill Actions */}
                  {activeRule.type === 'level_fill' && (
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300 font-medium">Liquid Fill Color:</span>
                        <ColorBoxPopover
                          label="Fill"
                          icon="fa-water"
                          iconColorClass="text-emerald-400"
                          color={activeRule.fillColor || '#10b981'}
                          onChange={(c) => handleUpdateActiveRule({ fillColor: c })}
                          defaultColor="#10b981"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">Fill Direction:</label>
                        <select
                          value={activeRule.fillDirection || 'bottom_to_top'}
                          onChange={(e) => handleUpdateActiveRule({ fillDirection: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                        >
                          <option value="bottom_to_top">Bottom to Top (Tank / Column Level)</option>
                          <option value="top_to_bottom">Top to Bottom</option>
                          <option value="left_to_right">Left to Right (Horizontal Vessel)</option>
                          <option value="right_to_left">Right to Left</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium">Fill Min Level (0%):</label>
                          <input
                            type="number"
                            value={activeRule.fillMin ?? 0}
                            onChange={(e) => handleUpdateActiveRule({ fillMin: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium">Fill Max Level (100%):</label>
                          <input
                            type="number"
                            value={activeRule.fillMax ?? 100}
                            onChange={(e) => handleUpdateActiveRule({ fillMax: parseFloat(e.target.value) || 100 })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Show / Hide Percentage Value Label Tick Selection */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-percent text-sky-400 text-xs"></i>
                          <span className="text-[11px] text-slate-300 font-medium">Display Value %:</span>
                        </div>
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeRule.showPercentage !== false}
                            onChange={(e) => handleUpdateActiveRule({ showPercentage: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400 focus:ring-offset-slate-950 accent-sky-500 cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">
                            {activeRule.showPercentage !== false ? 'Shown' : 'Hidden'}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Analog Opacity Actions */}
                  {activeRule.type === 'opacity_fade' && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Target Opacity:</span>
                        <span className="font-mono text-purple-300">{Math.round((activeRule.targetOpacity ?? 0.3) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={activeRule.targetOpacity ?? 0.3}
                        onChange={(e) => handleUpdateActiveRule({ targetOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DRIVER TAG BROWSER MODAL                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isTagBrowserOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsTagBrowserOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <i className="fas fa-microchip"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Driver Tag Registry Browser</h3>
                  <p className="text-[10px] text-slate-400">Select any registered PLC, Modbus, OPC-UA, or Serial tag</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsTagBrowserOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/30">
              <input
                type="text"
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                placeholder="Search tags by name, address, driver type..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Tag List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
              {filteredDriverTags.length === 0 ? (
                <div className="text-center py-8 text-slate-500 space-y-1">
                  <i className="fas fa-microchip text-2xl opacity-40"></i>
                  <p className="text-xs font-bold text-slate-400">No driver tags found</p>
                  <p className="text-[10px] text-slate-500">Go to Data Driver Settings to add Modbus, Siemens, or OPC-UA tags</p>
                </div>
              ) : (
                filteredDriverTags.map((t: DriverTag) => (
                  <div
                    key={t.tagId}
                    onClick={() => {
                      handleUpdateActiveRule({ driverTagId: t.tagId });
                      setIsTagBrowserOpen(false);
                    }}
                    className="p-2.5 bg-slate-950/70 border border-slate-800 hover:border-emerald-500/60 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white">{t.tagName || t.tagId}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                          {t.protocol || 'DRIVER'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-400 mt-0.5">
                        <span>Tag ID: <strong className="text-slate-300">{t.tagId}</strong></span>
                        {t.address !== undefined && <span>• Addr: {t.address}</span>}
                        {t.s7Address && <span>• S7: {t.s7Address}</span>}
                        {t.melsecAddress && <span>• MELSEC: {t.melsecAddress}</span>}
                        {t.nodeId && <span>• Node: {t.nodeId}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold rounded-lg text-[10px] transition-colors"
                    >
                      Select
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MQTT TOPIC BROWSER MODAL                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isTopicBrowserOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsTopicBrowserOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <i className="fas fa-rss"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">MQTT Topics Browser</h3>
                  <p className="text-[10px] text-slate-400">Select active project telemetry topic</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsTopicBrowserOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/30">
              <input
                type="text"
                value={topicSearchQuery}
                onChange={(e) => setTopicSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
              />
            </div>

            {/* Topics List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
              {scannedMqttTopics.length === 0 ? (
                <div className="text-center py-8 text-slate-500 space-y-1">
                  <i className="fas fa-rss text-2xl opacity-40"></i>
                  <p className="text-xs font-bold text-slate-400">No MQTT topics registered</p>
                </div>
              ) : (
                scannedMqttTopics.map((topic) => (
                  <div
                    key={topic}
                    onClick={() => {
                      handleUpdateActiveRule({ topic });
                      setIsTopicBrowserOpen(false);
                    }}
                    className="p-2.5 bg-slate-950/70 border border-slate-800 hover:border-sky-500/60 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="font-mono text-xs text-sky-300 truncate">{topic}</span>
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 font-bold rounded-lg text-[10px] transition-colors"
                    >
                      Select
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
