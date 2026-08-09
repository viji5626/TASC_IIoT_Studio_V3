import React, { useState, useMemo } from 'react';
import { AppState, ProductEdition } from '../types';
import {
  scanAppTopics,
  validateMqttTopic,
  previewTopicRename,
  executeTopicRename,
  previewBulkFindReplace,
  executeBulkFindReplace,
  TopicRegistryEntry,
  TopicDirection,
  AffectedWidgetPreview,
} from '../utils/topicManager';

interface TopicManagerViewProps {
  onBack: () => void;
  appState: AppState;
  onUpdateAppState: (newState: AppState) => void;
  userRole?: string;
  productEdition?: ProductEdition;
}

export const TopicManagerView: React.FC<TopicManagerViewProps> = ({
  onBack,
  appState,
  onUpdateAppState,
  userRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'publish' | 'subscribe' | 'both' | 'warnings'>('all');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Modals state
  const [editingTopicEntry, setEditingTopicEntry] = useState<TopicRegistryEntry | null>(null);
  const [newTopicValue, setNewTopicValue] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  // Bulk Find & Replace state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFindStr, setBulkFindStr] = useState('');
  const [bulkReplaceStr, setBulkReplaceStr] = useState('');

  // Success Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isReadOnly = userRole === 'client';

  // Scan app state
  const scanSummary = useMemo(() => scanAppTopics(appState), [appState]);

  // Filtered topics list
  const filteredTopics = useMemo(() => {
    return scanSummary.topics.filter(entry => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        entry.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.occurrences.some(
          o =>
            (o.panelName && o.panelName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            o.dashboardName.toLowerCase().includes(searchTerm.toLowerCase())
        );

      if (!matchesSearch) return false;

      // Direction / Warnings filter
      if (directionFilter === 'warnings') {
        return scanSummary.conflictingOrWarningTopics.some(w => w.topic === entry.topic);
      }
      if (directionFilter === 'all') return true;
      return entry.direction === directionFilter;
    });
  }, [scanSummary, searchTerm, directionFilter]);

  const toggleExpandTopic = (topic: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Single Topic Rename handlers ---
  const handleOpenRenameModal = (entry: TopicRegistryEntry) => {
    if (isReadOnly) return;
    setEditingTopicEntry(entry);
    setNewTopicValue(entry.topic);
    setIsRenameModalOpen(true);
  };

  const renameValidation = useMemo(() => {
    if (!editingTopicEntry) return { valid: false };
    return validateMqttTopic(newTopicValue, editingTopicEntry.direction === 'publish');
  }, [editingTopicEntry, newTopicValue]);

  const renamePreviews: AffectedWidgetPreview[] = useMemo(() => {
    if (!editingTopicEntry || !newTopicValue) return [];
    return previewTopicRename(appState, editingTopicEntry.topic, newTopicValue);
  }, [appState, editingTopicEntry, newTopicValue]);

  const handleExecuteRename = () => {
    if (!editingTopicEntry || !renameValidation.valid) return;
    const { newState, affectedWidgetsCount } = executeTopicRename(
      appState,
      editingTopicEntry.topic,
      newTopicValue
    );
    onUpdateAppState(newState);
    setIsRenameModalOpen(false);
    setEditingTopicEntry(null);
    showToast(`Updated topic '${editingTopicEntry.topic}' across ${affectedWidgetsCount} reference(s).`);
  };

  // --- Bulk Find & Replace handlers ---
  const bulkPreviews: AffectedWidgetPreview[] = useMemo(() => {
    if (!bulkFindStr) return [];
    return previewBulkFindReplace(appState, bulkFindStr, bulkReplaceStr);
  }, [appState, bulkFindStr, bulkReplaceStr]);

  const handleExecuteBulkReplace = () => {
    if (!bulkFindStr) return;
    const { newState, affectedWidgetsCount } = executeBulkFindReplace(
      appState,
      bulkFindStr,
      bulkReplaceStr
    );
    onUpdateAppState(newState);
    setIsBulkModalOpen(false);
    setBulkFindStr('');
    setBulkReplaceStr('');
    showToast(`Bulk updated ${affectedWidgetsCount} widget reference(s) successfully.`);
  };

  // --- Export Topic Registry JSON ---
  const handleExportTopicMap = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      appSummary: {
        totalWidgets: scanSummary.totalWidgets,
        totalUniqueTopics: scanSummary.totalUniqueTopics,
        totalReferences: scanSummary.totalTopicReferences,
      },
      dashboardPrefixes: scanSummary.dashboardPrefixes,
      topics: scanSummary.topics.map(t => ({
        topic: t.topic,
        direction: t.direction,
        usageCount: t.usageCount,
        widgetsCount: t.widgetsCount,
        linkedWidgets: t.occurrences.map(o => ({
          widgetName: o.panelName,
          widgetType: o.panelType,
          dashboardName: o.dashboardName,
          field: o.field,
          effectiveTopic: o.effectiveTopic,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasc_mqtt_topics_registry_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported MQTT Topic Registry JSON');
  };

  return (
    <div className="flex-grow flex flex-col bg-[#0a0a0a] overflow-y-auto text-slate-100 min-h-screen">
      {/* Header Bar */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0 sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-base"></i>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-sitemap text-sky-400 text-base"></i>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                MQTT Topic Manager & Bulk Editor
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Centralized topic registry, bulk find & replace, and multi-widget mapping
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isReadOnly && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="py-2 px-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Bulk replace prefixes, paths, or device IDs"
            >
              <i className="fas fa-arrow-right-arrow-left text-xs"></i>
              <span className="hidden sm:inline">Bulk Replace / Prefix Swap</span>
            </button>
          )}

          <button
            onClick={handleExportTopicMap}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Export Topic Mapping JSON"
          >
            <i className="fas fa-download text-xs text-sky-400"></i>
            <span className="hidden md:inline">Export Map</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in shadow-xl">
            <i className="fas fa-circle-check text-emerald-400 text-sm"></i>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dashboard Prefixes Notice */}
        {scanSummary.dashboardPrefixes.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-base shrink-0">
                <i className="fas fa-layer-group"></i>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Dashboard Topic Prefixes</h3>
                <p className="text-xs text-slate-400">
                  {scanSummary.dashboardPrefixes.map(p => `${p.dashboardName}: '${p.prefix}'`).join(' • ')}
                </p>
              </div>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => {
                  setBulkFindStr(scanSummary.dashboardPrefixes[0]?.prefix || '');
                  setIsBulkModalOpen(true);
                }}
                className="py-1.5 px-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer"
              >
                <i className="fas fa-pen-to-square mr-1"></i>
                Edit Prefix
              </button>
            )}
          </div>
        )}

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Widgets</div>
            <div className="text-2xl font-black text-white">{scanSummary.totalWidgets}</div>
            <div className="text-[10px] text-slate-500">Across all dashboards</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Unique Topics</div>
            <div className="text-2xl font-black text-sky-400">{scanSummary.totalUniqueTopics}</div>
            <div className="text-[10px] text-slate-500">{scanSummary.totalTopicReferences} total references</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Publish (Write)</div>
            <div className="text-2xl font-black text-amber-400">{scanSummary.publishCount}</div>
            <div className="text-[10px] text-slate-500">Control actions</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Subscribe (Read)</div>
            <div className="text-2xl font-black text-indigo-400">{scanSummary.subscribeCount}</div>
            <div className="text-[10px] text-slate-500">Telemetry topics</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 col-span-2 md:col-span-1">
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Both (Read & Write)</div>
            <div className="text-2xl font-black text-emerald-400">{scanSummary.bothCount}</div>
            <div className="text-[10px] text-slate-500">Bidirectional widgets</div>
          </div>
        </div>

        {/* Conflict / Warning Alert Banner */}
        {scanSummary.conflictingOrWarningTopics.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <i className="fas fa-triangle-exclamation text-amber-400 text-sm"></i>
                <span>Topic Validation Warnings ({scanSummary.conflictingOrWarningTopics.length})</span>
              </div>
              <button
                onClick={() => setDirectionFilter('warnings')}
                className="text-xs font-extrabold text-amber-300 hover:underline"
              >
                View Warning Topics
              </button>
            </div>
            <div className="space-y-1 text-xs text-amber-200/90">
              {scanSummary.conflictingOrWarningTopics.slice(0, 3).map((w, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="font-mono text-amber-400 font-bold shrink-0">{w.topic}:</span>
                  <span>{w.warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar: Search & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <i className="fas fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search topics or widget names..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                <i className="fas fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto text-xs shrink-0">
            <button
              onClick={() => setDirectionFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                directionFilter === 'all'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              All ({scanSummary.totalUniqueTopics})
            </button>
            <button
              onClick={() => setDirectionFilter('publish')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                directionFilter === 'publish'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Publish ({scanSummary.publishCount})
            </button>
            <button
              onClick={() => setDirectionFilter('subscribe')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                directionFilter === 'subscribe'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Subscribe ({scanSummary.subscribeCount})
            </button>
            <button
              onClick={() => setDirectionFilter('both')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                directionFilter === 'both'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Both ({scanSummary.bothCount})
            </button>
            {scanSummary.conflictingOrWarningTopics.length > 0 && (
              <button
                onClick={() => setDirectionFilter('warnings')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  directionFilter === 'warnings'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                Warnings ({scanSummary.conflictingOrWarningTopics.length})
              </button>
            )}
          </div>
        </div>

        {/* Topics List */}
        <div className="space-y-3">
          {filteredTopics.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 text-xl mx-auto">
                <i className="fas fa-folder-open"></i>
              </div>
              <p className="text-sm font-semibold text-slate-400">No MQTT topics match your search criteria.</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-sky-400 hover:underline font-bold"
                >
                  Clear search term
                </button>
              )}
            </div>
          ) : (
            filteredTopics.map(entry => {
              const isExpanded = expandedTopics.has(entry.topic);
              const warningObj = scanSummary.conflictingOrWarningTopics.find(w => w.topic === entry.topic);

              return (
                <div
                  key={entry.topic}
                  className={`bg-slate-900/90 border rounded-2xl transition-all overflow-hidden ${
                    warningObj
                      ? 'border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Topic Card Header */}
                  <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-grow">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400 font-mono text-xs shrink-0">
                        <i className="fas fa-hashtag"></i>
                      </div>

                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-mono text-sm font-bold text-white tracking-tight break-all">
                            {entry.topic}
                          </span>

                          {/* Direction Badge */}
                          {entry.direction === 'both' && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                              Publish & Subscribe
                            </span>
                          )}
                          {entry.direction === 'publish' && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                              Publish Only
                            </span>
                          )}
                          {entry.direction === 'subscribe' && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                              Subscribe Only
                            </span>
                          )}

                          {entry.isPrefix && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-md">
                              Dashboard Prefix
                            </span>
                          )}
                        </div>

                        {/* Usage Sub-details */}
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                          <span>
                            Used in <strong className="text-white font-bold">{entry.widgetsCount}</strong> widget(s)
                          </span>
                          <span>•</span>
                          <span>
                            Across <strong className="text-white font-bold">{entry.dashboardsCount}</strong> dashboard(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(entry.topic);
                          showToast(`Copied topic '${entry.topic}' to clipboard`);
                        }}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all text-xs cursor-pointer"
                        title="Copy Topic Name"
                      >
                        <i className="fas fa-copy"></i>
                      </button>

                      {!isReadOnly && (
                        <button
                          onClick={() => handleOpenRenameModal(entry)}
                          className="py-1.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                        >
                          <i className="fas fa-pen-to-square text-xs"></i>
                          <span>Edit / Rename</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpandTopic(entry.topic)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide' : 'Widgets'}</span>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Warning Message if any */}
                  {warningObj && (
                    <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center space-x-2 text-xs text-amber-300">
                      <i className="fas fa-triangle-exclamation text-amber-400 shrink-0"></i>
                      <span>{warningObj.warning}</span>
                    </div>
                  )}

                  {/* Expanded Linked Widgets Drawer */}
                  {isExpanded && (
                    <div className="bg-slate-950/80 border-t border-slate-800 p-4 space-y-2 animate-in fade-in duration-150">
                      <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                        Linked Widgets & Settings ({entry.occurrences.length})
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {entry.occurrences.map((occ, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-white flex items-center space-x-1.5">
                                <i className="fas fa-cube text-sky-400 text-[10px]"></i>
                                <span>{occ.panelName || 'Dashboard Prefix'}</span>
                                {occ.panelType && (
                                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                                    ({occ.panelType})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Dashboard: <strong className="text-slate-300">{occ.dashboardName}</strong>
                              </div>
                              {occ.effectiveTopic !== occ.rawTopic && (
                                <div className="text-[10px] font-mono text-emerald-400">
                                  Full Effective Topic: {occ.effectiveTopic}
                                </div>
                              )}
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                occ.field === 'publishTopic'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : occ.field === 'topic'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-purple-500/20 text-purple-300'
                              }`}
                            >
                              {occ.field === 'publishTopic'
                                ? 'Pub Topic'
                                : occ.field === 'topic'
                                ? 'Sub / Main'
                                : 'Prefix'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* --- MODAL 1: Single Topic Rename Modal --- */}
      {isRenameModalOpen && editingTopicEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <i className="fas fa-pen-to-square"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Rename MQTT Topic</h3>
                  <p className="text-xs text-slate-400">Updates topic across all {editingTopicEntry.widgetsCount} linked widget(s)</p>
                </div>
              </div>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Current Topic</label>
                <div className="font-mono text-xs bg-slate-950 text-slate-400 p-2.5 rounded-xl border border-slate-800 break-all">
                  {editingTopicEntry.topic}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-sky-400 uppercase tracking-wider">New Topic Name</label>
                <input
                  type="text"
                  value={newTopicValue}
                  onChange={e => setNewTopicValue(e.target.value)}
                  placeholder="e.g. factory/line2/sensor1"
                  className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition-all"
                />
                {!renameValidation.valid && (
                  <p className="text-xs text-rose-400 font-semibold">{renameValidation.error}</p>
                )}
              </div>

              {/* Live Preview of Affected Widgets */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Affected Widgets Preview ({renamePreviews.length})</span>
                  <span className="text-[10px] text-emerald-400">Auto-propagated</span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {renamePreviews.map((p, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-200">{p.panelName}</div>
                        <div className="text-[10px] text-slate-500">{p.dashboardName} • {p.field}</div>
                      </div>
                      <div className="text-[11px] font-mono text-sky-400 font-bold">{p.newTopic}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRename}
                disabled={!renameValidation.valid || newTopicValue === editingTopicEntry.topic}
                className="py-2.5 px-5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Apply Topic Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Bulk Find & Replace / Prefix Swap --- */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <i className="fas fa-arrow-right-arrow-left"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bulk Find & Replace / Prefix Swap</h3>
                  <p className="text-xs text-slate-400">Swap topic paths, device IDs, or base prefixes globally</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Find Substring / Prefix</label>
                  <input
                    type="text"
                    value={bulkFindStr}
                    onChange={e => setBulkFindStr(e.target.value)}
                    placeholder="e.g. factory/line1 or /siteA"
                    className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Replace With</label>
                  <input
                    type="text"
                    value={bulkReplaceStr}
                    onChange={e => setBulkReplaceStr(e.target.value)}
                    placeholder="e.g. factory/line2 or /siteB"
                    className="w-full font-mono text-xs bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Bulk Preview List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                  <span>Matched Topics Preview ({bulkPreviews.length})</span>
                  {bulkFindStr && (
                    <span className="text-sky-400 font-mono text-[11px] font-bold">
                      {bulkPreviews.length} item(s) will be updated
                    </span>
                  )}
                </div>

                {bulkFindStr ? (
                  bulkPreviews.length === 0 ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
                      No topics found matching pattern '{bulkFindStr}'.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {bulkPreviews.map((p, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-300 font-bold">
                            <span>{p.panelName} ({p.dashboardName})</span>
                            <span className="text-[10px] text-slate-500 uppercase">{p.field}</span>
                          </div>
                          <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
                            <span className="line-through text-rose-400/80">{p.oldTopic}</span>
                            <i className="fas fa-arrow-right text-[10px] text-slate-600"></i>
                            <span className="text-emerald-400 font-bold">{p.newTopic}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
                    Type a substring or topic prefix above to preview affected widgets.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkReplace}
                disabled={!bulkFindStr || bulkPreviews.length === 0}
                className="py-2.5 px-5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Execute Bulk Replacement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicManagerView;
