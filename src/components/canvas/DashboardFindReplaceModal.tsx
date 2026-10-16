import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, Panel, PanelType } from '../../types';

export type SearchFieldCategory = 'all' | 'text' | 'tag';

export interface FindResultItem {
  id: string; // Unique result key
  dashboardId: string;
  dashboardName: string;
  panelId: string;
  panelName: string;
  panelType: string;
  category: 'text' | 'tag';
  fieldName: string; // Human readable field name (e.g. 'Driver Tag ID', 'MQTT Topic', 'Panel Label', 'Engineering Unit')
  fieldKey: string;  // Internal key for replacement
  ruleIndex?: number; // If inside dynamics array
  optionIndex?: number; // If inside options/optionItems array
  fullValue: string;
  matchStart: number;
  matchLength: number;
}

export interface DashboardFindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  activeDashboardId?: string;
  selectedPanelIds: string[];
  onSelectDashboard: (dashId: string) => void;
  onSelectPanel: (panelId: string) => void;
  onUpdateAppState: (newState: AppState) => void;
  onHighlightPanel: (panelId: string) => void;
  onToast: (message: string) => void;
  initialMode?: 'find' | 'replace';
}

export const DashboardFindReplaceModal: React.FC<DashboardFindReplaceModalProps> = ({
  isOpen,
  onClose,
  appState,
  activeDashboardId,
  selectedPanelIds,
  onSelectDashboard,
  onSelectPanel,
  onUpdateAppState,
  onHighlightPanel,
  onToast,
  initialMode = 'find'
}) => {
  const [activeTab, setActiveTab] = useState<'find' | 'replace'>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [fieldCategory, setFieldCategory] = useState<SearchFieldCategory>('all');
  const [matchOnlySelection, setMatchOnlySelection] = useState(selectedPanelIds.length > 0);
  const [scopeAllDashboards, setScopeAllDashboards] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [matchExact, setMatchExact] = useState(false);

  // Result state
  const [results, setResults] = useState<FindResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1);
  const [resultsFilter, setResultsFilter] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update selection-based toggle if selected panels change when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedPanelIds.length > 0) {
        setMatchOnlySelection(true);
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, selectedPanelIds.length]);

  useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [initialMode]);

  // Dashboards lookup map
  const dashboardMap = useMemo(() => {
    const map = new Map<string, string>();
    (appState.dashboards || []).forEach(d => {
      map.set(d.dashboardId, d.dashboardName || 'Unnamed Screen');
    });
    return map;
  }, [appState.dashboards]);

  // Execute scan across panels
  const executeScan = (query: string): FindResultItem[] => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const effectivePanels = appState.panels || [];
    const activeDashId = activeDashboardId || appState.dashboards?.[0]?.dashboardId || '';

    // Filter panels by scope
    const scopedPanels = effectivePanels.filter(p => {
      // If Match Only Selection Based is checked
      if (matchOnlySelection) {
        return selectedPanelIds.includes(p.panelId);
      }
      // If All Dashboards is unchecked, limit to current dashboard
      if (!scopeAllDashboards) {
        return p.dashboardId === activeDashId;
      }
      return true;
    });

    const foundItems: FindResultItem[] = [];

    const checkAndPushMatch = (
      panel: Panel,
      category: 'text' | 'tag',
      fieldName: string,
      fieldKey: string,
      val: any,
      ruleIndex?: number,
      optionIndex?: number
    ) => {
      if (val === undefined || val === null) return;
      const strVal = String(val);
      if (!strVal) return;

      const targetVal = matchCase ? strVal : strVal.toLowerCase();
      const compareQuery = matchCase ? cleanQuery : cleanQuery.toLowerCase();

      if (matchExact) {
        if (targetVal === compareQuery) {
          foundItems.push({
            id: `${panel.panelId}_${fieldKey}_${ruleIndex ?? ''}_${optionIndex ?? ''}_0`,
            dashboardId: panel.dashboardId || activeDashId,
            dashboardName: dashboardMap.get(panel.dashboardId) || 'Active Screen',
            panelId: panel.panelId,
            panelName: panel.panelName || panel.type || 'Panel',
            panelType: panel.type || 'PANEL',
            category,
            fieldName,
            fieldKey,
            ruleIndex,
            optionIndex,
            fullValue: strVal,
            matchStart: 0,
            matchLength: strVal.length
          });
        }
      } else {
        let startIndex = 0;
        let matchIdx: number;
        while ((matchIdx = targetVal.indexOf(compareQuery, startIndex)) !== -1) {
          foundItems.push({
            id: `${panel.panelId}_${fieldKey}_${ruleIndex ?? ''}_${optionIndex ?? ''}_${matchIdx}`,
            dashboardId: panel.dashboardId || activeDashId,
            dashboardName: dashboardMap.get(panel.dashboardId) || 'Active Screen',
            panelId: panel.panelId,
            panelName: panel.panelName || panel.type || 'Panel',
            panelType: panel.type || 'PANEL',
            category,
            fieldName,
            fieldKey,
            ruleIndex,
            optionIndex,
            fullValue: strVal,
            matchStart: matchIdx,
            matchLength: cleanQuery.length
          });
          startIndex = matchIdx + Math.max(1, cleanQuery.length);
        }
      }
    };

    scopedPanels.forEach(panel => {
      // 1. TEXT FIELDS
      if (fieldCategory === 'all' || fieldCategory === 'text') {
        checkAndPushMatch(panel, 'text', 'Panel Name', 'panelName', panel.panelName);
        checkAndPushMatch(panel, 'text', 'Static Text', 'staticText', panel.staticText);
        checkAndPushMatch(panel, 'text', 'Button Text', 'buttonText', panel.buttonText);
        checkAndPushMatch(panel, 'text', 'Digital On Text', 'payloadOnText', panel.payloadOnText);
        checkAndPushMatch(panel, 'text', 'Digital Off Text', 'payloadOffText', panel.payloadOffText);
        checkAndPushMatch(panel, 'text', 'Engineering Unit', 'unit', panel.unit);
        checkAndPushMatch(panel, 'text', 'Prefix', 'prefix', (panel as any).prefix);
        checkAndPushMatch(panel, 'text', 'Suffix', 'suffix', (panel as any).suffix);
        checkAndPushMatch(panel, 'text', 'Trip Warning Message', 'tripMessage', panel.tripMessage);
        checkAndPushMatch(panel, 'text', 'Low Alarm Message', 'lowAlarmMsg', panel.lowAlarmMsg);
        checkAndPushMatch(panel, 'text', 'Mid Alarm Message', 'midAlarmMsg', panel.midAlarmMsg);
        checkAndPushMatch(panel, 'text', 'High Alarm Message', 'highAlarmMsg', panel.highAlarmMsg);

        // Options (Combo Box, Radio buttons, Multi-state)
        if (Array.isArray(panel.options)) {
          panel.options.forEach((optStr, optIdx) => {
            checkAndPushMatch(panel, 'text', `Option #${optIdx + 1}`, 'options', optStr, undefined, optIdx);
          });
        }
        if (Array.isArray(panel.optionItems)) {
          panel.optionItems.forEach((optItem, optIdx) => {
            checkAndPushMatch(panel, 'text', `Option Item #${optIdx + 1} (Label)`, 'optionItems', optItem.label, undefined, optIdx);
          });
        }

        // Dynamics labels
        if (Array.isArray(panel.dynamics)) {
          panel.dynamics.forEach((dyn, dynIdx) => {
            if (dyn.state1Label) {
              checkAndPushMatch(panel, 'text', `Dynamic (${dyn.name || dynIdx + 1}) State 1 Label`, 'dynamics.state1Label', dyn.state1Label, dynIdx);
            }
            if (dyn.state2Label) {
              checkAndPushMatch(panel, 'text', `Dynamic (${dyn.name || dynIdx + 1}) State 2 Label`, 'dynamics.state2Label', dyn.state2Label, dynIdx);
            }
          });
        }
      }

      // 2. TAG FIELDS
      if (fieldCategory === 'all' || fieldCategory === 'tag') {
        checkAndPushMatch(panel, 'tag', 'MQTT Topic', 'topic', panel.topic);
        checkAndPushMatch(panel, 'tag', 'Publish/Write Topic', 'publishTopic', panel.publishTopic);
        checkAndPushMatch(panel, 'tag', 'PLC Driver Tag ID', 'driverTagId', panel.driverTagId);
        checkAndPushMatch(panel, 'tag', 'PLC Driver Write Tag ID', 'driverWriteTagId', panel.driverWriteTagId);
        checkAndPushMatch(panel, 'tag', 'JSONPath Query', 'jsonPath', panel.jsonPath);
        checkAndPushMatch(panel, 'tag', 'Trip Watchdog Topic', 'tripTopic', panel.tripTopic);
        checkAndPushMatch(panel, 'tag', 'Trip JSONPath', 'tripJsonPath', panel.tripJsonPath);
        checkAndPushMatch(panel, 'tag', 'Motion Dynamics Topic', 'motionTopic', panel.motionTopic);
        checkAndPushMatch(panel, 'tag', 'Motion Driver Tag ID', 'motionDriverTagId', panel.motionDriverTagId);
        checkAndPushMatch(panel, 'tag', 'Rotation Dynamics Topic', 'rotationTopic', panel.rotationTopic);
        checkAndPushMatch(panel, 'tag', 'Rotation Driver Tag ID', 'rotationDriverTagId', panel.rotationDriverTagId);

        // Dynamics Tag references
        if (Array.isArray(panel.dynamics)) {
          panel.dynamics.forEach((dyn, dynIdx) => {
            const dynName = dyn.name || `Rule #${dynIdx + 1}`;
            if (dyn.driverTagId) {
              checkAndPushMatch(panel, 'tag', `Dynamic (${dynName}) Driver Tag`, 'dynamics.driverTagId', dyn.driverTagId, dynIdx);
            }
            if (dyn.topic) {
              checkAndPushMatch(panel, 'tag', `Dynamic (${dynName}) Topic`, 'dynamics.topic', dyn.topic, dynIdx);
            }
            if (dyn.jsonPath) {
              checkAndPushMatch(panel, 'tag', `Dynamic (${dynName}) JSONPath`, 'dynamics.jsonPath', dyn.jsonPath, dynIdx);
            }
          });
        }
      }
    });

    return foundItems;
  };

  // Handle Find All
  const handleFindAll = () => {
    if (!searchQuery.trim()) {
      onToast('Please enter text or tag to find');
      return;
    }
    const scanned = executeScan(searchQuery);
    setResults(scanned);
    setHasSearched(true);
    if (scanned.length > 0) {
      setSelectedResultIndex(0);
      handleRedirectToResult(scanned[0], 0);
      onToast(`Found ${scanned.length} occurrence(s) across ${new Set(scanned.map(r => r.panelId)).size} element(s)`);
    } else {
      setSelectedResultIndex(-1);
      onToast('No matching text or tags found in specified scope');
    }
  };

  // Redirect on clicking row in List View of Finds
  const handleRedirectToResult = (result: FindResultItem, index: number) => {
    setSelectedResultIndex(index);

    // 1. Switch active dashboard if match is in another screen
    if (result.dashboardId && result.dashboardId !== activeDashboardId) {
      onSelectDashboard(result.dashboardId);
    }

    // 2. Select the target panel on canvas
    onSelectPanel(result.panelId);

    // 3. Highlight panel with pulsating ring & center in canvas view
    setTimeout(() => {
      onHighlightPanel(result.panelId);
      const element = document.getElementById(`hmi-panel-${result.panelId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 50);
  };

  // Find Next
  const handleFindNext = () => {
    if (results.length === 0) {
      handleFindAll();
      return;
    }
    const nextIdx = (selectedResultIndex + 1) % results.length;
    handleRedirectToResult(results[nextIdx], nextIdx);
  };

  // Find Previous
  const handleFindPrev = () => {
    if (results.length === 0) {
      handleFindAll();
      return;
    }
    const prevIdx = (selectedResultIndex - 1 + results.length) % results.length;
    handleRedirectToResult(results[prevIdx], prevIdx);
  };

  // Apply replacement to a single string value
  const applyReplacement = (original: string, findTerm: string, replaceTerm: string): string => {
    if (matchExact) {
      if (matchCase ? original === findTerm : original.toLowerCase() === findTerm.toLowerCase()) {
        return replaceTerm;
      }
      return original;
    }
    if (matchCase) {
      return original.split(findTerm).join(replaceTerm);
    } else {
      const regex = new RegExp(findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return original.replace(regex, replaceTerm);
    }
  };

  // Replace Single
  const handleReplaceSingle = () => {
    if (selectedResultIndex < 0 || selectedResultIndex >= results.length) {
      handleFindNext();
      return;
    }
    const target = results[selectedResultIndex];
    if (!target) return;

    const findTerm = searchQuery.trim();
    const replaceTerm = replaceQuery;

    const updatedPanels = (appState.panels || []).map(p => {
      if (p.panelId !== target.panelId) return p;
      const clone = { ...p };

      if (target.fieldKey.startsWith('dynamics.') && target.ruleIndex !== undefined) {
        const subKey = target.fieldKey.replace('dynamics.', '');
        if (Array.isArray(clone.dynamics) && clone.dynamics[target.ruleIndex]) {
          const rules = [...clone.dynamics];
          const r = { ...rules[target.ruleIndex] };
          (r as any)[subKey] = applyReplacement(String((r as any)[subKey] || ''), findTerm, replaceTerm);
          rules[target.ruleIndex] = r;
          clone.dynamics = rules;
        }
      } else if (target.fieldKey === 'options' && target.optionIndex !== undefined) {
        if (Array.isArray(clone.options) && clone.options[target.optionIndex] !== undefined) {
          const opts = [...clone.options];
          opts[target.optionIndex] = applyReplacement(opts[target.optionIndex], findTerm, replaceTerm);
          clone.options = opts;
        }
      } else if (target.fieldKey === 'optionItems' && target.optionIndex !== undefined) {
        if (Array.isArray(clone.optionItems) && clone.optionItems[target.optionIndex]) {
          const items = clone.optionItems.map((item, idx) => {
            if (idx === target.optionIndex) {
              return { ...item, label: applyReplacement(item.label, findTerm, replaceTerm) };
            }
            return item;
          });
          clone.optionItems = items;
        }
      } else {
        (clone as any)[target.fieldKey] = applyReplacement(String((clone as any)[target.fieldKey] || ''), findTerm, replaceTerm);
      }

      return clone;
    });

    const updatedDashboards = (appState.dashboards || []).map(d => ({
      ...d,
      panels: updatedPanels.filter(p => p.dashboardId === d.dashboardId)
    }));

    onUpdateAppState({
      ...appState,
      panels: updatedPanels,
      dashboards: updatedDashboards
    });

    onToast(`Replaced in ${target.panelName} (${target.fieldName})`);

    // Re-scan with updated state
    setTimeout(() => {
      const rescanned = executeScan(searchQuery);
      setResults(rescanned);
      if (rescanned.length > 0) {
        const nextIdx = Math.min(selectedResultIndex, rescanned.length - 1);
        handleRedirectToResult(rescanned[nextIdx], nextIdx);
      } else {
        setSelectedResultIndex(-1);
      }
    }, 50);
  };

  // Replace All
  const handleReplaceAll = () => {
    if (!searchQuery.trim()) {
      onToast('Please enter search query first');
      return;
    }
    const currentMatches = executeScan(searchQuery);
    if (currentMatches.length === 0) {
      onToast('No matches found to replace');
      return;
    }

    const findTerm = searchQuery.trim();
    const replaceTerm = replaceQuery;
    const targetPanelIds = new Set(currentMatches.map(m => m.panelId));

    const updatedPanels = (appState.panels || []).map(p => {
      if (!targetPanelIds.has(p.panelId)) return p;
      let clone = { ...p };

      // Apply to all matched fields for this panel
      const panelMatches = currentMatches.filter(m => m.panelId === p.panelId);
      panelMatches.forEach(target => {
        if (target.fieldKey.startsWith('dynamics.') && target.ruleIndex !== undefined) {
          const subKey = target.fieldKey.replace('dynamics.', '');
          if (Array.isArray(clone.dynamics) && clone.dynamics[target.ruleIndex]) {
            const rules = [...clone.dynamics];
            const r = { ...rules[target.ruleIndex] };
            (r as any)[subKey] = applyReplacement(String((r as any)[subKey] || ''), findTerm, replaceTerm);
            rules[target.ruleIndex] = r;
            clone.dynamics = rules;
          }
        } else if (target.fieldKey === 'options' && target.optionIndex !== undefined) {
          if (Array.isArray(clone.options) && clone.options[target.optionIndex] !== undefined) {
            const opts = [...clone.options];
            opts[target.optionIndex] = applyReplacement(opts[target.optionIndex], findTerm, replaceTerm);
            clone.options = opts;
          }
        } else if (target.fieldKey === 'optionItems' && target.optionIndex !== undefined) {
          if (Array.isArray(clone.optionItems) && clone.optionItems[target.optionIndex]) {
            const items = clone.optionItems.map((item, idx) => {
              if (idx === target.optionIndex) {
                return { ...item, label: applyReplacement(item.label, findTerm, replaceTerm) };
              }
              return item;
            });
            clone.optionItems = items;
          }
        } else {
          (clone as any)[target.fieldKey] = applyReplacement(String((clone as any)[target.fieldKey] || ''), findTerm, replaceTerm);
        }
      });

      return clone;
    });

    const updatedDashboards = (appState.dashboards || []).map(d => ({
      ...d,
      panels: updatedPanels.filter(p => p.dashboardId === d.dashboardId)
    }));

    onUpdateAppState({
      ...appState,
      panels: updatedPanels,
      dashboards: updatedDashboards
    });

    onToast(`Successfully replaced ${currentMatches.length} occurrence(s) across ${targetPanelIds.size} element(s)!`);

    // Reset results
    setResults([]);
    setSelectedResultIndex(-1);
    setHasSearched(false);
  };

  // Highlight search term helper in snippets
  const renderHighlightedSnippet = (fullValue: string, matchStart: number, matchLength: number) => {
    const before = fullValue.slice(0, matchStart);
    const match = fullValue.slice(matchStart, matchStart + matchLength);
    const after = fullValue.slice(matchStart + matchLength);

    return (
      <span className="font-mono text-xs break-all">
        <span className="text-slate-400">{before}</span>
        <mark className="bg-amber-400 text-slate-950 font-bold px-1 py-0.5 rounded shadow-sm inline-block">
          {match}
        </mark>
        <span className="text-slate-400">{after}</span>
      </span>
    );
  };

  // Filtered results
  const displayedResults = useMemo(() => {
    if (!resultsFilter.trim()) return results;
    const q = resultsFilter.toLowerCase();
    return results.filter(r =>
      r.panelName.toLowerCase().includes(q) ||
      r.fieldName.toLowerCase().includes(q) ||
      r.dashboardName.toLowerCase().includes(q) ||
      r.fullValue.toLowerCase().includes(q)
    );
  }, [results, resultsFilter]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all select-none ${
        isMinimized
          ? 'bottom-4 right-4 w-72 shadow-2xl'
          : 'top-14 right-4 sm:right-6 w-[95vw] sm:w-[540px] md:w-[620px] max-h-[88vh] shadow-2xl flex flex-col'
      }`}
    >
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <i className="fas fa-magnifying-glass text-xs"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Dashboard Find & Replace
                </h3>
                {matchOnlySelection && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                    <i className="fas fa-object-group text-[8px]"></i>
                    <span>Selection Only ({selectedPanelIds.length})</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Search & replace across screen text labels, topics, and driver tags</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
              title={isMinimized ? "Expand Dialog" : "Minimize Dialog"}
            >
              <i className={`fas ${isMinimized ? 'fa-window-maximize' : 'fa-window-minimize'}`}></i>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-rose-500/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
              title="Close (Esc)"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex flex-col flex-1 overflow-hidden p-3.5 space-y-3">
            
            {/* Mode Tabs (Find vs Replace) */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('find')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'find'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <i className="fas fa-search text-[10px]"></i>
                  <span>Find</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('replace')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'replace'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <i className="fas fa-arrow-right-arrow-left text-[10px]"></i>
                  <span>Replace</span>
                </button>
              </div>

              {/* Target Type Filter (All / Text / Tag) */}
              <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFieldCategory('all')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    fieldCategory === 'all'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFieldCategory('text')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    fieldCategory === 'text'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Search only text labels, button labels, units, and static text"
                >
                  Text Only
                </button>
                <button
                  type="button"
                  onClick={() => setFieldCategory('tag')}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    fieldCategory === 'tag'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Search only PLC Driver Tags, MQTT Topics, Write Topics, and Dynamic Tags"
                >
                  Tags Only
                </button>
              </div>
            </div>

            {/* Input Fields Container */}
            <div className="space-y-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              {/* Find Input */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 w-24 shrink-0 flex items-center space-x-1">
                  <i className="fas fa-magnifying-glass text-[10px] text-amber-400"></i>
                  <span>Find What:</span>
                </span>
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFindAll();
                      }
                    }}
                    placeholder="Search text, unit, topic, or driver tag..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono placeholder:text-slate-500 transition-colors shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Replace Input (Only in Replace mode) */}
              {activeTab === 'replace' && (
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
                  <span className="text-xs font-bold text-slate-400 w-24 shrink-0 flex items-center space-x-1">
                    <i className="fas fa-arrow-right-arrow-left text-[10px] text-emerald-400"></i>
                    <span>Replace With:</span>
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={replaceQuery}
                      onChange={(e) => setReplaceQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleReplaceSingle();
                        }
                      }}
                      placeholder="Replacement text or tag..."
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 outline-none font-mono placeholder:text-slate-500 transition-colors shadow-inner"
                    />
                    {replaceQuery && (
                      <button
                        type="button"
                        onClick={() => setReplaceQuery('')}
                        className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Scope & Match Options */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              
              {/* MATCH ONLY SELECTION BASED Toggle */}
              <label
                className={`flex items-center space-x-2 px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                  matchOnlySelection
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
                title="When active, search and replace will only operate within elements currently selected on the canvas"
              >
                <input
                  type="checkbox"
                  checked={matchOnlySelection}
                  onChange={(e) => setMatchOnlySelection(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span className="flex items-center space-x-1">
                  <i className="fas fa-object-group text-[10px]"></i>
                  <span>Match Only Selected Elements</span>
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${selectedPanelIds.length > 0 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    {selectedPanelIds.length}
                  </span>
                </span>
              </label>

              {/* Other Options */}
              <div className="flex items-center space-x-3 text-slate-300 font-medium">
                {!matchOnlySelection && (
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-300" title="Search across all screens in project">
                    <input
                      type="checkbox"
                      checked={scopeAllDashboards}
                      onChange={(e) => setScopeAllDashboards(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span>All Screens</span>
                  </label>
                )}

                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-300" title="Case-sensitive match">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Match Case</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-300" title="Match entire string exactly">
                  <input
                    type="checkbox"
                    checked={matchExact}
                    onChange={(e) => setMatchExact(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Exact Match</span>
                </label>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleFindAll}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <i className="fas fa-list-check text-xs"></i>
                  <span>Find All</span>
                </button>

                <button
                  type="button"
                  onClick={handleFindPrev}
                  disabled={results.length === 0}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition-all flex items-center space-x-1 cursor-pointer border border-slate-700"
                  title="Previous Match (Shift+F3)"
                >
                  <i className="fas fa-chevron-up text-[10px]"></i>
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  onClick={handleFindNext}
                  disabled={results.length === 0}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition-all flex items-center space-x-1 cursor-pointer border border-slate-700"
                  title="Next Match (F3 or Enter)"
                >
                  <span>Next</span>
                  <i className="fas fa-chevron-down text-[10px]"></i>
                </button>
              </div>

              {activeTab === 'replace' && (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleReplaceSingle}
                    disabled={results.length === 0 || selectedResultIndex < 0}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-600/80 text-emerald-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition-all flex items-center space-x-1 cursor-pointer border border-emerald-500/40"
                    title="Replace current highlighted match"
                  >
                    <i className="fas fa-check text-[10px]"></i>
                    <span>Replace</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReplaceAll}
                    disabled={results.length === 0}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer active:scale-95"
                    title="Replace all matching occurrences across scope"
                  >
                    <i className="fas fa-repeat text-xs"></i>
                    <span>Replace All</span>
                  </button>
                </div>
              )}
            </div>

            {/* List View of Finds (Results Table) */}
            {hasSearched && (
              <div className="flex-1 flex flex-col min-h-[180px] max-h-[340px] bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                {/* Results Header */}
                <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center space-x-2 font-bold text-slate-300">
                    <span className="text-amber-400 font-mono">
                      {results.length} Match{results.length === 1 ? '' : 'es'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">
                      {new Set(results.map(r => r.panelId)).size} Element(s)
                    </span>
                    {selectedResultIndex >= 0 && results.length > 0 && (
                      <span className="text-[10px] text-sky-400 font-mono bg-sky-500/20 px-1.5 py-0.2 rounded border border-sky-500/30">
                        Match {selectedResultIndex + 1} of {results.length}
                      </span>
                    )}
                  </div>

                  {results.length > 5 && (
                    <div className="relative">
                      <input
                        type="text"
                        value={resultsFilter}
                        onChange={(e) => setResultsFilter(e.target.value)}
                        placeholder="Filter results..."
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-white outline-none w-32 focus:w-40 transition-all font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Results Scrollable List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                  {displayedResults.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs space-y-1">
                      <i className="fas fa-inbox text-lg opacity-40"></i>
                      <p>No results found for this query in the selected scope.</p>
                      {matchOnlySelection && selectedPanelIds.length === 0 && (
                        <p className="text-[11px] text-amber-400/80">
                          (Tip: No elements are currently selected on canvas. Uncheck "Match Only Selected Elements" to search dashboard)
                        </p>
                      )}
                    </div>
                  ) : (
                    displayedResults.map((result, idx) => {
                      const isSelected = selectedResultIndex === idx;

                      return (
                        <div
                          key={result.id}
                          onClick={() => handleRedirectToResult(result, idx)}
                          className={`p-2 transition-all cursor-pointer flex items-start justify-between gap-2.5 group ${
                            isSelected
                              ? 'bg-sky-500/15 border-l-4 border-l-amber-400 shadow-sm'
                              : 'hover:bg-slate-800/60'
                          }`}
                          title="Click to redirect and focus on canvas"
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              {/* Row Index */}
                              <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>

                              {/* Dashboard / Screen Name Badge */}
                              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800 flex items-center space-x-1">
                                <i className="fas fa-desktop text-[8px] text-sky-400"></i>
                                <span className="truncate max-w-[100px]">{result.dashboardName}</span>
                              </span>

                              {/* Panel Name & Type */}
                              <span className="text-xs font-bold text-white truncate max-w-[150px]">
                                {result.panelName}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                                {result.panelType}
                              </span>

                              {/* Field Name Pill */}
                              <span
                                className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border flex items-center space-x-1 ${
                                  result.category === 'tag'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                <i className={`fas ${result.category === 'tag' ? 'fa-tag' : 'fa-font'} text-[8px]`}></i>
                                <span>{result.fieldName}</span>
                              </span>
                            </div>

                            {/* Value Snippet with Highlight */}
                            <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80">
                              {renderHighlightedSnippet(result.fullValue, result.matchStart, result.matchLength)}
                            </div>
                          </div>

                          {/* Quick Jump Arrow */}
                          <div className="flex items-center pt-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRedirectToResult(result, idx);
                              }}
                              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                                  : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
                              }`}
                              title="Redirect and highlight widget on canvas"
                            >
                              <i className="fas fa-location-crosshairs"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Status Footer Helper */}
            <div className="px-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <div className="flex items-center space-x-2">
                <span>Shortcuts:</span>
                <span className="bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-slate-400">Ctrl+F Find</span>
                <span className="bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-slate-400">Ctrl+H Replace</span>
                <span className="bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-slate-400">Enter / F3 Next</span>
              </div>
              <span>Click any row to jump to widget</span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
