import React, { useState, useMemo, useEffect } from 'react';
import {
  AppState,
  AppView,
  HistorianTag,
  HistorianConfig,
  DriverTag,
  TagRegistryEntry
} from '../types';
import {
  estimateStorageFootprint,
  detectOEMBrowserWarning,
  getIsStoragePersisted,
  queryHistoricalRange,
  formatByteSize,
  clearHistorianDB,
  exportHistorianDataJson
} from '../utils/trendHistorianEngine';
import { scanAppTags } from '../utils/tagManager';
import LineGraph from './LineGraph';

import { useAppStore } from '../store/useAppStore';

interface HistorianTrendViewProps {
  appState?: AppState;
  onUpdateAppState?: (newState: AppState) => void;
  onBack?: () => void;
  onNavigate?: (view: AppView) => void;
  latestValues?: Record<string, { val: any; time: string; quality?: string }>;
}

const DEFAULT_COLORS = [
  '#38bdf8', '#818cf8', '#34d399', '#f59e0b',
  '#ec4899', '#f43f5e', '#a855f7', '#06b6d4'
];

export const HistorianTrendView: React.FC<HistorianTrendViewProps> = ({
  appState: appStateProp,
  onUpdateAppState: onUpdateAppStateProp,
  onBack: onBackProp,
  onNavigate: onNavigateProp,
  latestValues: latestValuesProp
}) => {
  const store = useAppStore();
  const appState = appStateProp ?? store.appState;
  const onUpdateAppState = onUpdateAppStateProp ?? store.setAppState;
  const onNavigate = onNavigateProp ?? store.setCurrentView;
  const onBack = onBackProp ?? (() => store.setCurrentView(AppView.DASHBOARD));
  const latestValues = latestValuesProp ?? store.latestValues;
  const [activeTab, setActiveTab] = useState<'tags' | 'settings' | 'visualizer'>('tags');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'mqtt' | 'driver'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  // Modals state
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [browseActiveTab, setBrowseActiveTab] = useState<'driver' | 'mqtt'>('driver');
  const [browseSearchQuery, setBrowseSearchQuery] = useState('');
  const [browseConnectionFilter, setBrowseConnectionFilter] = useState<string>('all');
  const [selectedBrowseTagKeys, setSelectedBrowseTagKeys] = useState<string[]>([]);

  // Create / Edit Tag Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Partial<HistorianTag> | null>(null);

  // CSV Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTargetTag, setExportTargetTag] = useState<HistorianTag | null>(null);
  const [exportRange, setExportRange] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h');
  const [isExporting, setIsExporting] = useState(false);

  // Visualizer Selected Tags
  const [visualizerTagIds, setVisualizerTagIds] = useState<string[]>([]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Safe Fallback Config
  const globalConfig: HistorianConfig = useMemo(() => {
    return appState.historianConfig || {
      enabled: true,
      logIntervalSeconds: 10,
      retentionValue: 30,
      retentionUnit: 'DAYS',
      logStorageCapMb: 1000,
      archiveAfterMonths: 1,
      archiveClusterDuration: '1_WEEK'
    };
  }, [appState.historianConfig]);

  const historianTags: HistorianTag[] = useMemo(() => {
    return appState.historianTags || [];
  }, [appState.historianTags]);

  const driverTags: DriverTag[] = useMemo(() => {
    return appState.driverTags || [];
  }, [appState.driverTags]);

  const driverConnections = useMemo(() => {
    return appState.driverConnections || [];
  }, [appState.driverConnections]);

  const mqttScanResult = useMemo(() => {
    return scanAppTags(appState);
  }, [appState]);

  // Sync Global Settings helper
  const updateGlobalConfig = (updates: Partial<HistorianConfig>) => {
    const updated = { ...globalConfig, ...updates };
    onUpdateAppState({
      ...appState,
      historianConfig: updated
    });
    showToast('Historian settings updated');
  };

  // Toggle single tag logging enabled/paused
  const handleToggleTagLogging = (tagId: string) => {
    const updatedTags = historianTags.map(t => {
      if (t.id === tagId) {
        const nextEnabled = !t.enabled;
        showToast(nextEnabled ? `Logging resumed for "${t.name}"` : `Logging paused for "${t.name}"`);
        return { ...t, enabled: nextEnabled, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    onUpdateAppState({
      ...appState,
      historianTags: updatedTags
    });
  };

  // Delete tag from Historian
  const handleDeleteHistorianTag = (tagId: string) => {
    const target = historianTags.find(t => t.id === tagId);
    if (!target) return;
    const updatedTags = historianTags.filter(t => t.id !== tagId);
    onUpdateAppState({
      ...appState,
      historianTags: updatedTags
    });
    showToast(`Removed "${target.name}" from Historian`);
  };

  // Filtered Historian Tags List
  const filteredTags = useMemo(() => {
    return historianTags.filter(t => {
      if (sourceFilter !== 'all' && t.sourceType !== sourceFilter) return false;
      if (statusFilter === 'active' && !t.enabled) return false;
      if (statusFilter === 'paused' && t.enabled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchTopic = (t.topic || '').toLowerCase().includes(q);
        const matchDriver = (t.driverTagId || '').toLowerCase().includes(q);
        if (!matchName && !matchTopic && !matchDriver) return false;
      }
      return true;
    });
  }, [historianTags, sourceFilter, statusFilter, searchQuery]);

  // Live Storage Footprint Calculation
  const storageEstimate = useMemo(() => {
    const activeCount = Math.max(1, historianTags.filter(t => t.enabled).length);
    const intervalSec = globalConfig.logIntervalSeconds || 10;
    const retentionVal = globalConfig.retentionValue || 30;
    const retentionUnit = globalConfig.retentionUnit || 'DAYS';
    const isPersisted = getIsStoragePersisted();
    const archiveAfterMonths = globalConfig.archiveAfterMonths || 1;
    const archiveClusterDuration = globalConfig.archiveClusterDuration || '1_WEEK';

    return estimateStorageFootprint(
      activeCount,
      intervalSec,
      retentionVal,
      retentionUnit,
      isPersisted,
      archiveAfterMonths,
      archiveClusterDuration
    );
  }, [historianTags, globalConfig]);

  const oemWarning = useMemo(() => detectOEMBrowserWarning(), []);

  // Save / Update Tag Form
  const handleSaveTagModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editingTag.name?.trim()) {
      alert('Please enter a valid Tag Name');
      return;
    }

    const isNew = !editingTag.id;
    const tagId = editingTag.id || `htag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const finalizedTag: HistorianTag = {
      id: tagId,
      name: editingTag.name.trim(),
      sourceType: editingTag.sourceType || 'mqtt',
      topic: editingTag.topic?.trim() || '',
      jsonPath: editingTag.jsonPath?.trim() || '',
      driverTagId: editingTag.driverTagId?.trim() || '',
      connectionId: editingTag.connectionId || '',
      dataType: editingTag.dataType || 'number',
      unit: editingTag.unit?.trim() || '',
      min: editingTag.min !== undefined ? Number(editingTag.min) : undefined,
      max: editingTag.max !== undefined ? Number(editingTag.max) : undefined,
      enabled: editingTag.enabled !== false,
      color: editingTag.color || DEFAULT_COLORS[historianTags.length % DEFAULT_COLORS.length],
      description: editingTag.description?.trim() || '',
      useCustomInterval: editingTag.useCustomInterval || false,
      customIntervalSeconds: editingTag.customIntervalSeconds ? Number(editingTag.customIntervalSeconds) : undefined,
      deadband: editingTag.deadband !== undefined ? Number(editingTag.deadband) : undefined,
      createdAt: editingTag.createdAt || now,
      updatedAt: now
    };

    let updatedTags: HistorianTag[];
    if (isNew) {
      updatedTags = [...historianTags, finalizedTag];
      showToast(`Added "${finalizedTag.name}" to Historian`);
    } else {
      updatedTags = historianTags.map(t => t.id === tagId ? finalizedTag : t);
      showToast(`Updated "${finalizedTag.name}"`);
    }

    onUpdateAppState({
      ...appState,
      historianTags: updatedTags
    });

    setIsEditModalOpen(false);
    setEditingTag(null);
  };

  // Add multiple selected tags from Browse Modal
  const handleApplyBrowseSelection = () => {
    if (selectedBrowseTagKeys.length === 0) return;

    const newTags: HistorianTag[] = [];
    const now = new Date().toISOString();

    selectedBrowseTagKeys.forEach((key, idx) => {
      // Check if already in list
      const alreadyExists = historianTags.some(t =>
        (t.driverTagId && t.driverTagId === key) ||
        (t.topic && t.topic === key) ||
        t.id === key
      );
      if (alreadyExists) return;

      const color = DEFAULT_COLORS[(historianTags.length + idx) % DEFAULT_COLORS.length];

      // Check if it's a Driver Tag
      const matchedDriverTag = driverTags.find(dt => dt.tagId === key || dt.tagName === key);
      if (matchedDriverTag) {
        newTags.push({
          id: `htag_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          name: matchedDriverTag.tagName || `Driver Tag ${matchedDriverTag.tagId}`,
          sourceType: 'driver',
          driverTagId: matchedDriverTag.tagId,
          connectionId: matchedDriverTag.connectionId,
          dataType: matchedDriverTag.dataType === 'boolean' ? 'boolean' : 'number',
          unit: matchedDriverTag.unit || '',
          min: matchedDriverTag.scaling?.engMin ?? 0,
          max: matchedDriverTag.scaling?.engMax ?? 100,
          enabled: true,
          color,
          createdAt: now,
          updatedAt: now
        });
        return;
      }

      // Check if it's an MQTT Tag
      const matchedMqttTag = mqttScanResult.tags.find(mt => mt.tagId === key || mt.tagName === key);
      if (matchedMqttTag) {
        newTags.push({
          id: `htag_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          name: matchedMqttTag.tagName || matchedMqttTag.parsingDefinition,
          sourceType: 'mqtt',
          topic: matchedMqttTag.parsingDefinition || '',
          jsonPath: matchedMqttTag.parsingDefinition.includes('$.') ? matchedMqttTag.parsingDefinition : '',
          enabled: true,
          color,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    if (newTags.length > 0) {
      onUpdateAppState({
        ...appState,
        historianTags: [...historianTags, ...newTags]
      });
      showToast(`Added ${newTags.length} tag(s) to Historian Logging`);
    }

    setIsBrowseModalOpen(false);
    setSelectedBrowseTagKeys([]);
  };

  // Direct CSV Export execution
  const handleExecuteCsvExport = async () => {
    if (!exportTargetTag) return;
    setIsExporting(true);

    try {
      const nowMs = Date.now();
      let startMs = nowMs - 24 * 3600 * 1000;
      if (exportRange === '1h') startMs = nowMs - 3600 * 1000;
      if (exportRange === '7d') startMs = nowMs - 7 * 86400 * 1000;
      if (exportRange === '30d') startMs = nowMs - 30 * 86400 * 1000;
      if (exportRange === 'all') startMs = nowMs - 5 * 365 * 86400 * 1000;

      const queryKey = exportTargetTag.id || exportTargetTag.topic || exportTargetTag.driverTagId || '';
      const rawPoints = await queryHistoricalRange(queryKey, startMs, nowMs);

      if (!rawPoints || rawPoints.length === 0) {
        alert(`No historical records found for "${exportTargetTag.name}" in this time frame.`);
        setIsExporting(false);
        return;
      }

      // Generate CSV text
      let csv = 'Timestamp_UTC,Timestamp_Local,Tag_ID,Tag_Name,Value,Unit\n';
      rawPoints.forEach(p => {
        const d = new Date(p.t);
        const iso = d.toISOString();
        const loc = d.toLocaleString().replace(',', '');
        csv += `${iso},${loc},"${exportTargetTag.id}","${exportTargetTag.name}",${p.v},"${exportTargetTag.unit || ''}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Historian_${exportTargetTag.name.replace(/[^a-zA-Z0-9_]/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${rawPoints.length} records to CSV`);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('CSV Export Error:', err);
      alert('Failed to export CSV: ' + err);
    } finally {
      setIsExporting(false);
    }
  };

  // Render Virtual Panel for Visualizer Preview Tab
  const visualizerPanel = useMemo(() => {
    const activeTags = historianTags.filter(t =>
      visualizerTagIds.length > 0 ? visualizerTagIds.includes(t.id) : true
    ).slice(0, 6);

    const pens = activeTags.map(t => ({
      id: t.id,
      name: t.name,
      topic: t.topic || t.driverTagId || t.id,
      driverTagId: t.driverTagId,
      jsonPath: t.jsonPath,
      color: t.color || '#38bdf8',
      thickness: 2,
      unit: t.unit,
      min: t.min,
      max: t.max,
      visible: true,
      loggingEnabled: t.enabled
    }));

    return {
      panelId: 'historian_visualizer_preview',
      dashboardId: 'historian_preview',
      connectionId: '',
      panelName: 'Historian Trend Visualizer',
      type: 'line_graph' as any,
      topic: pens[0]?.topic || '',
      pens: pens,
      enableHistorianLogging: true,
      logIntervalSeconds: globalConfig.logIntervalSeconds,
      showMonitoringTable: true,
      enableDualCursor: true,
      autoScaleY: true,
      graphType: 'line' as const
    };
  }, [historianTags, visualizerTagIds, globalConfig]);

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-100 select-none overflow-hidden relative">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-50 bg-sky-500 text-slate-950 px-4 py-1.5 rounded-full font-extrabold text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <i className="fas fa-check-circle"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-5 py-2 flex items-center justify-between shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back to SCADA Dashboard"
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-chart-line text-sky-400 text-base"></i>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">Historian Trend & Tag Manager</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                globalConfig.enabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
              }`}>
                {globalConfig.enabled ? '● Logging Engine Active' : '○ Engine Suspended'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Centralized Industrial Telemetry Logging, Multi-Tier Storage Retention & Tag Configuration
            </p>
          </div>
        </div>

        {/* View Tabs Switcher */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'tags'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-tags text-xs"></i>
            <span>Historian Tags</span>
            <span className="text-[10px] font-mono px-1 rounded bg-black/20">{historianTags.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-gear text-xs"></i>
            <span>Global Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visualizer')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'visualizer'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-chart-area text-xs"></i>
            <span>Trend Visualizer</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-horizontal-scrollbar">
        {/* OEM Warning Banner */}
        {oemWarning && (
          <div className="mb-4 p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fas fa-triangle-exclamation text-amber-400"></i>
              <span>{oemWarning}</span>
            </div>
            <span className="text-[10px] font-mono opacity-80">Browser Compatibility Guard</span>
          </div>
        )}

        {/* ─── TAB 1: HISTORIAN TAGS LIST ─── */}
        {activeTab === 'tags' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Top Stat Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Logged Tags</span>
                  <div className="text-lg font-black text-white font-mono">{historianTags.length}</div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <i className="fas fa-tags text-xs"></i>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Active Logging</span>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {historianTags.filter(t => t.enabled).length}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <i className="fas fa-circle-play text-xs animate-pulse"></i>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Storage Footprint</span>
                  <div className="text-lg font-black text-violet-400 font-mono">{storageEstimate.formattedSize}</div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                  <i className="fas fa-hard-drive text-xs"></i>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Sampling Rate</span>
                  <div className="text-lg font-black text-amber-400 font-mono">{globalConfig.logIntervalSeconds}s Global</div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <i className="fas fa-clock text-xs"></i>
                </div>
              </div>
            </div>

            {/* Controls / Filter Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <i className="fas fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by tag name, MQTT topic, or PLC address..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 placeholder:text-slate-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <i className="fas fa-xmark text-xs"></i>
                    </button>
                  )}
                </div>

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">All Sources</option>
                  <option value="mqtt">MQTT Only</option>
                  <option value="driver">Driver Only</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active (Logging)</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrowseTagKeys([]);
                    setBrowseSearchQuery('');
                    setIsBrowseModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 text-sky-300 hover:text-white border border-sky-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <i className="fas fa-folder-open text-xs text-sky-400"></i>
                  <span>Browse Existing Tags</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTag({
                      name: '',
                      sourceType: 'mqtt',
                      topic: '',
                      jsonPath: '',
                      unit: '',
                      min: 0,
                      max: 100,
                      enabled: true,
                      color: DEFAULT_COLORS[historianTags.length % DEFAULT_COLORS.length]
                    });
                    setIsEditModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>Create Historian Tag</span>
                </button>
              </div>
            </div>

            {/* Tag List Table / Cards */}
            {filteredTags.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/50 text-slate-500 mx-auto flex items-center justify-center text-xl">
                  <i className="fas fa-database"></i>
                </div>
                <h3 className="text-sm font-bold text-slate-200">No Historian Tags Configured</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click <strong>Browse Existing Tags</strong> to multi-select tags from your Driver Tag Manager (Modbus/OPC UA) and MQTT Tag Manager, or click <strong>Create Historian Tag</strong> to add one manually.
                </p>
                <button
                  type="button"
                  onClick={() => setIsBrowseModalOpen(true)}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-md inline-flex items-center space-x-2"
                >
                  <i className="fas fa-folder-open"></i>
                  <span>Browse & Add Tags</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-horizontal-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                        <th className="py-2.5 px-3 w-12 text-center">Status</th>
                        <th className="py-2.5 px-3">Tag Name</th>
                        <th className="py-2.5 px-3">Source & Target</th>
                        <th className="py-2.5 px-3">Live Value</th>
                        <th className="py-2.5 px-3">Sampling Mode</th>
                        <th className="py-2.5 px-3">Range & Unit</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredTags.map((tag) => {
                        const isDriver = tag.sourceType === 'driver';
                        const liveData = latestValues[tag.id] ||
                          (tag.topic ? latestValues[tag.topic] : undefined) ||
                          (tag.driverTagId ? latestValues[tag.driverTagId] : undefined);
                        const liveVal = liveData?.val !== undefined ? liveData.val : '---';

                        // Master Tag Link validation
                        let masterTagFound = true;
                        if (isDriver && tag.driverTagId) {
                          masterTagFound = driverTags.some(dt => dt.tagId === tag.driverTagId || dt.tagName === tag.driverTagId);
                        }

                        return (
                          <tr key={tag.id} className="hover:bg-slate-800/40 transition-colors">
                            {/* Status Play/Pause Toggle */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleTagLogging(tag.id)}
                                className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                  tag.enabled
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                                }`}
                                title={tag.enabled ? 'Logging Active (Click to Pause)' : 'Logging Paused (Click to Resume)'}
                              >
                                <i className={`fas ${tag.enabled ? 'fa-play' : 'fa-pause'}`}></i>
                              </button>
                            </td>

                            {/* Tag Name & Color swatch */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center space-x-2">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 border border-slate-700 shadow-sm"
                                  style={{ backgroundColor: tag.color || '#38bdf8' }}
                                />
                                <div>
                                  <div className="font-bold text-white flex items-center space-x-1.5">
                                    <span>{tag.name}</span>
                                    {!masterTagFound && (
                                      <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-mono" title="Master tag unlinked in Driver Tag Manager">
                                        ⚠️ Unlinked
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">ID: {tag.id}</div>
                                </div>
                              </div>
                            </td>

                            {/* Source & Target */}
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center space-x-1">
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase border ${
                                    isDriver
                                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                                      : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                  }`}>
                                    {isDriver ? '🔌 Driver' : '🏷️ MQTT'}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-300 truncate max-w-[200px]">
                                    {isDriver ? (tag.driverTagId || 'PLC Register') : (tag.topic || '---')}
                                  </span>
                                </div>
                                {tag.jsonPath && (
                                  <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[220px]">
                                    Path: {tag.jsonPath}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Live Value Pill */}
                            <td className="py-2.5 px-3">
                              <div className="inline-flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 font-mono">
                                <span className={`w-1.5 h-1.5 rounded-full ${tag.enabled && liveVal !== '---' ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                                <span className="font-bold text-sky-300">{liveVal}</span>
                                {tag.unit && <span className="text-[10px] text-slate-500">{tag.unit}</span>}
                              </div>
                            </td>

                            {/* Sampling Mode */}
                            <td className="py-2.5 px-3">
                              {tag.useCustomInterval ? (
                                <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md inline-block font-mono">
                                  ⚡ {tag.customIntervalSeconds}s Custom
                                  {tag.deadband !== undefined && tag.deadband > 0 && ` (±${tag.deadband}%)`}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md inline-block font-mono">
                                  Global ({globalConfig.logIntervalSeconds}s)
                                </div>
                              )}
                            </td>

                            {/* Range & Unit */}
                            <td className="py-2.5 px-3">
                              <span className="text-[11px] font-mono text-slate-400">
                                {tag.min !== undefined && tag.max !== undefined ? `${tag.min} .. ${tag.max}` : '---'}
                                {tag.unit ? ` (${tag.unit})` : ''}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {/* Direct Visualizer Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVisualizerTagIds([tag.id]);
                                    setActiveTab('visualizer');
                                  }}
                                  className="p-1.5 text-sky-400 hover:text-sky-300 rounded-lg hover:bg-sky-500/10 transition-colors cursor-pointer"
                                  title="View in Interactive Trend Visualizer"
                                >
                                  <i className="fas fa-chart-line text-xs"></i>
                                </button>

                                {/* CSV Export Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExportTargetTag(tag);
                                    setIsExportModalOpen(true);
                                  }}
                                  className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                  title="Export Tag History to CSV"
                                >
                                  <i className="fas fa-file-csv text-xs"></i>
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTag({ ...tag });
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-1.5 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                                  title="Edit Tag & Overrides"
                                >
                                  <i className="fas fa-pen text-xs"></i>
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHistorianTag(tag.id)}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Remove from Historian"
                                >
                                  <i className="fas fa-trash-can text-xs"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: GLOBAL LOGGING & RETENTION SETTINGS ─── */}
        {activeTab === 'settings' && (
          <div className="space-y-5 max-w-4xl mx-auto">
            {/* Master Engine Switch Card */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-power-off text-sky-400"></i>
                  <h3 className="text-sm font-bold text-white">Master Historian Engine Switch</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Controls continuous multi-tier telemetry logging to IndexedDB across all registered tags.
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateGlobalConfig({ enabled: !globalConfig.enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                  globalConfig.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    globalConfig.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sampling Frequency & Retention Window Settings */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-xs uppercase font-extrabold text-sky-400 tracking-wider flex items-center space-x-2">
                <i className="fas fa-stopwatch"></i>
                <span>Sampling Frequency & Retention Policy</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sampling Frequency */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">Global Log Sampling Rate</label>
                  <select
                    value={globalConfig.logIntervalSeconds}
                    onChange={(e) => updateGlobalConfig({ logIntervalSeconds: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer font-mono"
                  >
                    <option value="1">1 Second (High Frequency)</option>
                    <option value="2">2 Seconds</option>
                    <option value="5">5 Seconds</option>
                    <option value="10">10 Seconds (Recommended)</option>
                    <option value="30">30 Seconds</option>
                    <option value="60">60 Seconds (1 Minute)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 block">
                    Tags without custom overrides will be sampled at this rate.
                  </span>
                </div>

                {/* Retention Period */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">Data Retention Window</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={globalConfig.retentionValue}
                      onChange={(e) => updateGlobalConfig({ retentionValue: Math.max(1, Number(e.target.value)) })}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500 font-mono"
                    />
                    <select
                      value={globalConfig.retentionUnit}
                      onChange={(e) => updateGlobalConfig({ retentionUnit: e.target.value as any })}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer font-mono"
                    >
                      <option value="DAYS">Days</option>
                      <option value="WEEKS">Weeks</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years (PC Clustered)</option>
                    </select>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Telemetry beyond this age is automatically rolled up and pruned.
                  </span>
                </div>
              </div>

              {/* Hard Storage Quota Cap & Clustered Partition Archiving */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">Storage Quota Cap</label>
                  <select
                    value={globalConfig.logStorageCapMb}
                    onChange={(e) => updateGlobalConfig({ logStorageCapMb: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer font-mono"
                  >
                    <option value="200">200 MB (Mobile Safe)</option>
                    <option value="500">500 MB</option>
                    <option value="1000">1,000 MB (1 GB Standard)</option>
                    <option value="2000">2,000 MB (2 GB)</option>
                    <option value="5000">5,000 MB (5 GB Industrial PC)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">Archive Cluster Partition</label>
                  <select
                    value={globalConfig.archiveClusterDuration}
                    onChange={(e) => updateGlobalConfig({ archiveClusterDuration: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer font-mono"
                  >
                    <option value="1_DAY">1 Day per Archive File</option>
                    <option value="1_WEEK">1 Week per Archive File (Optimal)</option>
                    <option value="1_MONTH">1 Month per Archive File</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dynamic Storage Footprint Card */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-extrabold text-violet-400 tracking-wider flex items-center space-x-2">
                  <i className="fas fa-microchip"></i>
                  <span>Live Storage Footprint Estimator</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                  {storageEstimate.isPC ? '💻 Workstation Mode' : '📱 Mobile Safe Mode'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Estimated Size</span>
                  <span className="text-sm font-black text-sky-400 font-mono">{storageEstimate.formattedSize}</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Hot Raw Tier</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">{storageEstimate.uncompressedHotMb || 0} MB</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Compressed Archive</span>
                  <span className="text-sm font-black text-violet-400 font-mono">{storageEstimate.compressedArchiveMb || 0} MB</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Status Tier</span>
                  <span className={`text-xs font-bold font-mono uppercase ${
                    storageEstimate.tier === 'safe' ? 'text-emerald-400' : storageEstimate.tier === 'warn' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {storageEstimate.tier}
                  </span>
                </div>
              </div>
            </div>

            {/* Maintenance & Database Actions */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm">
              <h3 className="text-xs uppercase font-extrabold text-rose-400 tracking-wider flex items-center space-x-2">
                <i className="fas fa-triangle-exclamation"></i>
                <span>Database Maintenance & Storage Management</span>
              </h3>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const jsonStr = await exportHistorianDataJson();
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `TASC_Historian_Backup_${new Date().toISOString().substring(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast('Database exported successfully');
                    } catch (err) {
                      alert('Export failed: ' + err);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <i className="fas fa-download text-xs text-sky-400"></i>
                  <span>Export JSON Database Snapshot</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to completely clear the IndexedDB Historian database? All historical points will be deleted.')) {
                      await clearHistorianDB();
                      showToast('Historian database cleared');
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <i className="fas fa-trash-can text-xs text-rose-400"></i>
                  <span>Clear All Historical Data</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: LIVE & HISTORICAL TREND VISUALIZER ─── */}
        {activeTab === 'visualizer' && (
          <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col">
            {/* Tag Selection Multi-Pill Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-sm shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-bold">Charted Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {historianTags.map(tag => {
                    const isSelected = visualizerTagIds.length === 0 || visualizerTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (visualizerTagIds.includes(tag.id)) {
                            setVisualizerTagIds(prev => prev.filter(id => id !== tag.id));
                          } else {
                            setVisualizerTagIds(prev => [...prev, tag.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                          isSelected
                            ? 'bg-slate-950 text-white border-sky-500/60 shadow-sm'
                            : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#38bdf8' }} />
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {visualizerTagIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setVisualizerTagIds([])}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Reset (Show All)
                </button>
              )}
            </div>

            {/* Embedded Live Interactive Trend Chart */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 min-h-[480px] shadow-lg">
              <LineGraph
                panel={visualizerPanel}
                pens={visualizerPanel.pens}
                latestValues={latestValues}
                historyValues={store.historyValues}
                isClientMode={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: BROWSE EXISTING TAGS (DRIVER + MQTT TABS) ─── */}
      {isBrowseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in">
            {/* Modal Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <i className="fas fa-folder-open text-sky-400 text-sm"></i>
                <h3 className="text-sm font-bold text-white">Browse Existing Tags for Historian Logging</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBrowseModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <i className="fas fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Dual Tabs (Driver Tag Manager vs MQTT Tag Manager) */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-900/60">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setBrowseActiveTab('driver')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                    browseActiveTab === 'driver'
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/50 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <i className="fas fa-database text-xs text-violet-400"></i>
                  <span>Driver Tag Manager</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-black/30">{driverTags.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBrowseActiveTab('mqtt')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                    browseActiveTab === 'mqtt'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <i className="fas fa-tags text-xs text-sky-400"></i>
                  <span>MQTT Tag Manager</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-black/30">{mqttScanResult.tags.length}</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={browseSearchQuery}
                  onChange={(e) => setBrowseSearchQuery(e.target.value)}
                  placeholder="Filter tags..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-sky-500 placeholder:text-slate-600 w-40 sm:w-56"
                />

                {browseActiveTab === 'driver' && driverConnections.length > 0 && (
                  <select
                    value={browseConnectionFilter}
                    onChange={(e) => setBrowseConnectionFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2 py-1 text-xs outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="all">All Connections</option>
                    {driverConnections.map(dc => (
                      <option key={dc.connectionId} value={dc.connectionId}>{dc.connectionName}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-horizontal-scrollbar">
              {browseActiveTab === 'driver' ? (
                // Driver Tags Table
                driverTags.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 text-xs">
                    No tags configured in Driver Tag Manager. Add tags under Driver Tag Manager first.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedBrowseTagKeys.length === driverTags.length && driverTags.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBrowseTagKeys(driverTags.map(t => t.tagId));
                              } else {
                                setSelectedBrowseTagKeys([]);
                              }
                            }}
                            className="accent-sky-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-2 px-3">Tag Name</th>
                        <th className="py-2 px-3">Protocol & Connection</th>
                        <th className="py-2 px-3">Register / Address / Node ID</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {driverTags.filter(dt => {
                        if (browseConnectionFilter !== 'all' && dt.connectionId !== browseConnectionFilter) return false;
                        if (browseSearchQuery.trim()) {
                          const q = browseSearchQuery.toLowerCase();
                          return dt.tagName.toLowerCase().includes(q) || (dt.nodeId || '').toLowerCase().includes(q) || String(dt.address).includes(q);
                        }
                        return true;
                      }).map(tag => {
                        const isAlreadyInHistorian = historianTags.some(ht => ht.driverTagId === tag.tagId || ht.id === tag.tagId);
                        const isSelected = selectedBrowseTagKeys.includes(tag.tagId);

                        return (
                          <tr
                            key={tag.tagId}
                            onClick={() => {
                              if (isAlreadyInHistorian) return;
                              if (isSelected) {
                                setSelectedBrowseTagKeys(prev => prev.filter(k => k !== tag.tagId));
                              } else {
                                setSelectedBrowseTagKeys(prev => [...prev, tag.tagId]);
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              isAlreadyInHistorian
                                ? 'opacity-50 bg-slate-950/20 cursor-not-allowed'
                                : isSelected
                                ? 'bg-sky-500/10'
                                : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={isAlreadyInHistorian}
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-sky-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3 font-bold text-white">{tag.tagName}</td>
                            <td className="py-2 px-3 font-mono text-slate-300">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase mr-1.5">
                                {tag.protocol}
                              </span>
                              {tag.connectionId}
                            </td>
                            <td className="py-2 px-3 font-mono text-emerald-400">{tag.nodeId || tag.address || '---'}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{tag.unit || '---'}</td>
                            <td className="py-2 px-3">
                              {isAlreadyInHistorian ? (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                                  Already in Historian
                                </span>
                              ) : (
                                <span className="text-[9px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono">
                                  Available
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                // MQTT Tags Table
                mqttScanResult.tags.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 text-xs">
                    No MQTT tags detected or registered in MQTT Tag Manager.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedBrowseTagKeys.length === mqttScanResult.tags.length && mqttScanResult.tags.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBrowseTagKeys(mqttScanResult.tags.map(t => t.tagId));
                              } else {
                                setSelectedBrowseTagKeys([]);
                              }
                            }}
                            className="accent-sky-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-2 px-3">Tag Name</th>
                        <th className="py-2 px-3">MQTT Topic / JSONPath</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {mqttScanResult.tags.filter(mt => {
                        if (browseSearchQuery.trim()) {
                          const q = browseSearchQuery.toLowerCase();
                          return mt.tagName.toLowerCase().includes(q) || mt.parsingDefinition.toLowerCase().includes(q);
                        }
                        return true;
                      }).map(tag => {
                        const isAlreadyInHistorian = historianTags.some(ht => ht.topic === tag.parsingDefinition || ht.id === tag.tagId);
                        const isSelected = selectedBrowseTagKeys.includes(tag.tagId);

                        return (
                          <tr
                            key={tag.tagId}
                            onClick={() => {
                              if (isAlreadyInHistorian) return;
                              if (isSelected) {
                                setSelectedBrowseTagKeys(prev => prev.filter(k => k !== tag.tagId));
                              } else {
                                setSelectedBrowseTagKeys(prev => [...prev, tag.tagId]);
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              isAlreadyInHistorian
                                ? 'opacity-50 bg-slate-950/20 cursor-not-allowed'
                                : isSelected
                                ? 'bg-sky-500/10'
                                : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={isAlreadyInHistorian}
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-sky-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3 font-bold text-white">{tag.tagName}</td>
                            <td className="py-2 px-3 font-mono text-sky-300">{tag.parsingDefinition}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{tag.category || 'General'}</td>
                            <td className="py-2 px-3">
                              {isAlreadyInHistorian ? (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                                  Already in Historian
                                </span>
                              ) : (
                                <span className="text-[9px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-mono">
                                  Available
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-400 font-mono">
                {selectedBrowseTagKeys.length} Tag(s) Selected
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBrowseModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={selectedBrowseTagKeys.length === 0}
                  onClick={handleApplyBrowseSelection}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-xl text-xs font-extrabold cursor-pointer shadow-md"
                >
                  Add Selected Tags to Historian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT HISTORIAN TAG ─── */}
      {isEditModalOpen && editingTag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <form
            onSubmit={handleSaveTagModal}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in"
          >
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-white">
                {editingTag.id ? 'Edit Historian Tag' : 'Create New Historian Tag'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTag(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <i className="fas fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* Source Type Selector */}
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Data Source Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTag(prev => ({ ...prev, sourceType: 'mqtt' }))}
                    className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      editingTag.sourceType === 'mqtt'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🏷️ MQTT Broker Tag
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingTag(prev => ({ ...prev, sourceType: 'driver' }))}
                    className={`py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      editingTag.sourceType === 'driver'
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/50 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🔌 Driver Hardware Tag
                  </button>
                </div>
              </div>

              {/* Tag Name & Color */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="text-xs text-slate-300 font-bold block mb-1">Tag Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editingTag.name || ''}
                    onChange={(e) => setEditingTag(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Boiler Main Steam Pressure"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Color</label>
                  <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                    <input
                      type="color"
                      value={editingTag.color || '#38bdf8'}
                      onChange={(e) => setEditingTag(prev => ({ ...prev, color: e.target.value }))}
                      className="w-6 h-6 bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Source-specific inputs */}
              {editingTag.sourceType === 'driver' ? (
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-bold block">Linked Driver Tag / Address</label>
                  <select
                    value={editingTag.driverTagId || ''}
                    onChange={(e) => {
                      const matched = driverTags.find(dt => dt.tagId === e.target.value);
                      setEditingTag(prev => ({
                        ...prev,
                        driverTagId: e.target.value,
                        unit: prev?.unit || matched?.unit || '',
                        min: prev?.min ?? matched?.scaling?.engMin ?? 0,
                        max: prev?.max ?? matched?.scaling?.engMax ?? 100
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 font-mono cursor-pointer"
                  >
                    <option value="" disabled>Select Driver Tag...</option>
                    {driverTags.map(dt => (
                      <option key={dt.tagId} value={dt.tagId}>
                        {dt.tagName} ({dt.protocol} • {dt.nodeId || dt.address})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">MQTT Topic *</label>
                    <input
                      type="text"
                      required
                      value={editingTag.topic || ''}
                      onChange={(e) => setEditingTag(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g. factory/sensors/boiler1/pressure"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">JSONPath Query (Optional)</label>
                    <input
                      type="text"
                      value={editingTag.jsonPath || ''}
                      onChange={(e) => setEditingTag(prev => ({ ...prev, jsonPath: e.target.value }))}
                      placeholder="e.g. $.d.value or $.sensor[0]"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-emerald-300 outline-none focus:border-sky-500 font-mono placeholder:text-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* Unit & Range */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingTag.unit || ''}
                    onChange={(e) => setEditingTag(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g. bar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Min Value</label>
                  <input
                    type="number"
                    value={editingTag.min ?? 0}
                    onChange={(e) => setEditingTag(prev => ({ ...prev, min: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Max Value</label>
                  <input
                    type="number"
                    value={editingTag.max ?? 100}
                    onChange={(e) => setEditingTag(prev => ({ ...prev, max: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Collapsible Advanced Overrides */}
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2.5">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  ⚙️ Advanced Sampling & Deadband Overrides
                </span>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 cursor-pointer">
                    Custom Sampling Rate (Override Global {globalConfig.logIntervalSeconds}s)
                  </label>
                  <input
                    type="checkbox"
                    checked={editingTag.useCustomInterval || false}
                    onChange={(e) => setEditingTag(prev => ({ ...prev, useCustomInterval: e.target.checked }))}
                    className="accent-amber-500 cursor-pointer"
                  />
                </div>

                {editingTag.useCustomInterval && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Rate (Seconds)</label>
                      <input
                        type="number"
                        min="1"
                        max="3600"
                        value={editingTag.customIntervalSeconds ?? 1}
                        onChange={(e) => setEditingTag(prev => ({ ...prev, customIntervalSeconds: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Deadband (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={editingTag.deadband ?? 0}
                        onChange={(e) => setEditingTag(prev => ({ ...prev, deadband: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTag(null);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-extrabold cursor-pointer shadow-md"
              >
                Save Historian Tag
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: DIRECT CSV EXPORT ─── */}
      {isExportModalOpen && exportTargetTag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <i className="fas fa-file-csv text-emerald-400"></i>
                <h3 className="text-sm font-bold text-white">Export Tag History to CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fas fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Exporting Tag</span>
                <span className="text-xs font-bold text-sky-400">{exportTargetTag.name}</span>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Time Range</label>
                <select
                  value={exportRange}
                  onChange={(e) => setExportRange(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-sky-500 font-mono cursor-pointer"
                >
                  <option value="1h">Last 1 Hour</option>
                  <option value="24h">Last 24 Hours (Today)</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Historical Records</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExecuteCsvExport}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-extrabold cursor-pointer shadow-md inline-flex items-center space-x-1.5"
              >
                {isExporting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-download"></i>}
                <span>{isExporting ? 'Exporting...' : 'Download CSV File'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
