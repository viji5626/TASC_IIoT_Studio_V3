import React, { useState, useEffect } from 'react';
import { HistorianAlarmEntry, HistorianStorageMetrics } from '../types';
import {
  getAlarmHistory,
  getStorageMetrics,
  clearAlarmHistory,
  calculateAlarmDuration,
  getHistorianConfig,
  saveHistorianConfig,
  estimateStorageForRows,
  HistorianConfig
} from '../utils/alarmHistorianEngine';
import { exportAlarmHistoryCSV, exportAlarmHistoryJSON } from '../utils/alarmExporter';

interface AlarmHistorianModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId?: string;
  onAcknowledgeAlarm?: (alarmKey: string) => void;
  onOpenLiveAlarms?: () => void;
}

export const AlarmHistorianModal: React.FC<AlarmHistorianModalProps> = ({
  isOpen,
  onClose,
  dashboardId,
  onAcknowledgeAlarm,
  onOpenLiveAlarms
}) => {
  const [tabFilter, setTabFilter] = useState<'ALL' | 'TRIP_FAULT' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyEntries, setHistoryEntries] = useState<HistorianAlarmEntry[]>([]);
  const [storageMetrics, setStorageMetrics] = useState<HistorianStorageMetrics>({
    usedBytes: 0,
    formattedSize: '0 B',
    totalRows: 0,
    maxRows: 1000,
    maxStorageMb: 10,
    percentUsed: 0,
    engineType: 'IndexedDB / LocalStorage Engine'
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const [currentConfig, setCurrentConfig] = useState<HistorianConfig>(getHistorianConfig());

  const refreshData = () => {
    const entries = getAlarmHistory(dashboardId, tabFilter, searchQuery);
    setHistoryEntries(entries);
    const metrics = getStorageMetrics(dashboardId);
    setStorageMetrics(metrics);
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentConfig(getHistorianConfig());
      refreshData();
      const interval = setInterval(refreshData, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, dashboardId, tabFilter, searchQuery]);

  const handleUpdateConfig = (newMaxRows: number, newMaxStorageMb: number) => {
    const updated = saveHistorianConfig({
      maxRows: newMaxRows,
      maxStorageMb: newMaxStorageMb
    });
    setCurrentConfig(updated);
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[450] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`bg-[#0f141d] border-2 border-indigo-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${
          isMaximized ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-6xl h-[88vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/90 px-5 py-3 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <i className="fas fa-history text-lg"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                  Industrial Alarm Historian Engine
                </h2>
                <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {storageMetrics.totalRows} / {storageMetrics.maxRows} ROWS (FIFO)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center space-x-2">
                <span>{storageMetrics.engineType}</span>
                <span>•</span>
                <span className="text-sky-300 font-mono font-bold">Allocated Storage Cap: {storageMetrics.maxStorageMb} MB</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenLiveAlarms && (
              <button
                onClick={onOpenLiveAlarms}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Switch to Live Alarms Window"
              >
                <i className="fas fa-bell text-xs text-rose-400 animate-pulse"></i>
                <span className="hidden sm:inline">Live Alarms</span>
                <i className="fas fa-arrow-right text-[10px] text-rose-400"></i>
              </button>
            )}

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-800"
              title={isMaximized ? "Restore window size" : "Maximize window"}
            >
              <i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer border border-slate-800"
              title="Close window"
            >
              <i className="fas fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* Live Storage Meter & Quick Controls */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-4 flex-1 min-w-[280px]">
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>LOCAL DEVICE STORAGE USED</span>
                <span className="text-indigo-400 font-mono">{storageMetrics.percentUsed}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-300 ${
                    storageMetrics.percentUsed > 85 ? 'bg-rose-500' : storageMetrics.percentUsed > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${storageMetrics.percentUsed}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              <span className="text-slate-500">Size: </span>
              <span className="text-slate-200 font-bold">{storageMetrics.formattedSize}</span>
              <span className="text-slate-500 ml-1.5">/ {storageMetrics.maxStorageMb} MB</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Configure Historian Row Capacity & Storage Limits"
            >
              <i className="fas fa-gear text-xs text-indigo-400"></i>
              <span>Config & Capacity</span>
            </button>

            <button
              onClick={() => exportAlarmHistoryCSV(historyEntries)}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Export alarm history to CSV file"
            >
              <i className="fas fa-file-csv text-sm"></i>
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportAlarmHistoryJSON(historyEntries)}
              className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Export alarm history to JSON format"
            >
              <i className="fas fa-file-code text-sm"></i>
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Clear alarm history buffer"
            >
              <i className="fas fa-trash-can text-xs"></i>
              <span>Clear History</span>
            </button>
          </div>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="bg-[#121824] px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'ALL', label: 'All Events', icon: 'fa-list-ul', color: 'text-indigo-400' },
                { id: 'TRIP_FAULT', label: 'Trips & Faults', icon: 'fa-triangle-exclamation', color: 'text-rose-400' },
                { id: 'ACTIVE', label: 'Active Alarms', icon: 'fa-bell', color: 'text-amber-400' },
                { id: 'RESOLVED', label: 'Cleared History', icon: 'fa-circle-check', color: 'text-emerald-400' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  tabFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <i className={`fas ${tab.icon} ${tab.color}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by equipment, topic, tag, message..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>
        </div>

        {/* Historian Events Log Table */}
        <div className="flex-1 overflow-auto p-4">
          {historyEntries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-2xl">
                <i className="fas fa-folder-open"></i>
              </div>
              <p className="text-sm font-semibold text-slate-400">No alarm history records matching current filter.</p>
              <p className="text-xs text-slate-500 max-w-md">
                Live equipment trips and parameter zone alarms will automatically log here into your local PC/Mobile storage FIFO buffer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/60 shadow-inner">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Status</th>
                    <th className="p-3">Equipment / Asset</th>
                    <th className="p-3">Topic / Read Tag</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Value</th>
                    <th className="p-3">Trigger Time</th>
                    <th className="p-3">Ack Time</th>
                    <th className="p-3">Resolved Time</th>
                    <th className="p-3 font-mono">Duration</th>
                    <th className="p-3">Alarm Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-sans">
                  {historyEntries.map(entry => {
                    const isActive = entry.status.includes('ACTIVE');

                    return (
                      <tr 
                        key={entry.id} 
                        className={`hover:bg-slate-900/60 transition-colors ${
                          isActive ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="p-3 whitespace-nowrap">
                          <span 
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-flex items-center space-x-1 ${
                              entry.status === 'ACTIVE_UNACK'
                                ? 'bg-rose-500 text-black animate-pulse'
                                : entry.status === 'ACTIVE_ACK'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : entry.status === 'RESOLVED_UNACK'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <span>{entry.status.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-white whitespace-nowrap">
                          {entry.panelName}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap max-w-[180px] truncate" title={entry.tagTopic}>
                          {entry.tagTopic}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                            style={{ 
                              borderColor: entry.color, 
                              color: entry.color,
                              backgroundColor: `${entry.color}15`
                            }}
                          >
                            {entry.category === 'TRIP' || entry.category === 'FAULT' ? '⚡ TRIP / FAULT' : `${entry.category} ZONE`}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-right text-white whitespace-nowrap">
                          {entry.triggerValue} <span className="text-[10px] text-slate-400 font-normal">{entry.unit}</span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                          {new Date(entry.triggerTime).toLocaleTimeString()}
                          <span className="text-[10px] text-slate-500 block">{new Date(entry.triggerTime).toLocaleDateString()}</span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {entry.ackTime ? (
                            <>
                              <span className="text-emerald-400">{new Date(entry.ackTime).toLocaleTimeString()}</span>
                              <span className="text-[10px] text-slate-500 block">{new Date(entry.ackTime).toLocaleDateString()}</span>
                            </>
                          ) : (
                            <span className="text-rose-400 font-bold">Unacknowledged</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {entry.resolvedTime ? (
                            <>
                              <span className="text-sky-300">{new Date(entry.resolvedTime).toLocaleTimeString()}</span>
                              <span className="text-[10px] text-slate-500 block">{new Date(entry.resolvedTime).toLocaleDateString()}</span>
                            </>
                          ) : (
                            <span className="text-amber-400 font-bold animate-pulse">Active Event</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs font-bold text-cyan-300 whitespace-nowrap">
                          {calculateAlarmDuration(entry.triggerTime, entry.resolvedTime)}
                        </td>
                        <td className="p-3 text-slate-300 italic max-w-xs truncate" title={entry.message}>
                          "{entry.message}"
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Historian Storage & Capacity Configuration Overlay Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121824] border border-indigo-500/50 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 text-indigo-400">
                <i className="fas fa-sliders text-xl"></i>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">Historian Storage Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Max Row Capacity Input with Automatic Memory Calculator */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  FIFO Buffer Max Record Limit (Rows):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={100000}
                    value={currentConfig.maxRows}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 0);
                      const est = estimateStorageForRows(val);
                      handleUpdateConfig(val, Math.max(currentConfig.maxStorageMb, est.recommendedMb));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono text-sm font-bold rounded-xl p-3 outline-none focus:border-indigo-500 shadow-inner"
                    placeholder="Enter row count (e.g. 1150)"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    ROWS
                  </span>
                </div>

                {/* Quick Row Count Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[500, 1000, 1150, 2500, 5000, 10000].map((presetRows) => (
                    <button
                      key={presetRows}
                      onClick={() => {
                        const est = estimateStorageForRows(presetRows);
                        handleUpdateConfig(presetRows, Math.max(currentConfig.maxStorageMb, est.recommendedMb));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        currentConfig.maxRows === presetRows
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {presetRows.toLocaleString()} Rows
                    </button>
                  ))}
                </div>
              </div>

              {/* Automatic Memory Calculation Box */}
              {(() => {
                const est = estimateStorageForRows(currentConfig.maxRows);
                const estMb = (est.estimatedBytes / (1024 * 1024)).toFixed(3);
                return (
                  <div className="p-3.5 bg-slate-950/90 rounded-xl border border-indigo-500/40 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                        <i className="fas fa-calculator text-indigo-400"></i>
                        <span>AUTOMATIC MEMORY ESTIMATE</span>
                      </span>
                      <span className="text-emerald-400 font-mono font-extrabold text-xs">
                        {est.formattedSize} (~{estMb} MB)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      At maximum capacity of <span className="text-amber-300 font-mono font-bold">{currentConfig.maxRows.toLocaleString()} rows</span>, your device storage will consume approximately <span className="text-emerald-300 font-mono font-bold">{est.formattedSize}</span> in IndexedDB / LocalStorage.
                    </p>
                  </div>
                );
              })()}

              {/* Max Local Storage Allocated Cap Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Local Device Memory Allocation Limit (MB):
                </label>
                <select
                  value={currentConfig.maxStorageMb}
                  onChange={(e) => handleUpdateConfig(currentConfig.maxRows, Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl p-3 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={1}>1 MB (Mobile Lite)</option>
                  <option value={5}>5 MB (Standard Browser)</option>
                  <option value={10}>10 MB (Recommended Default)</option>
                  <option value={50}>50 MB (High Volume Station)</option>
                  <option value={100}>100 MB (Maximum Local Quota)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Limits the maximum IndexedDB / LocalStorage byte allocation on PC or mobile browsers.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                Save & Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#161b26] border border-rose-500/50 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <i className="fas fa-triangle-exclamation text-2xl"></i>
              <h3 className="text-base font-bold text-white">Clear Historian Buffer?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to purge all local alarm records from device memory? This action cannot be undone.
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAlarmHistory(dashboardId);
                  setShowClearConfirm(false);
                  refreshData();
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Purge History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
