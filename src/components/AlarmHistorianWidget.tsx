import React, { useState, useEffect } from 'react';
import { Panel, HistorianAlarmEntry } from '../types';
import { getAlarmHistory, calculateAlarmDuration, recordAlarmAckEvent } from '../utils/alarmHistorianEngine';

interface AlarmHistorianWidgetProps {
  panel: Panel;
  className?: string;
  isCompact?: boolean;
}

export const AlarmHistorianWidget: React.FC<AlarmHistorianWidgetProps> = ({
  panel,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'live' | 'historian'>(panel.alarmViewMode || 'live');
  const [entries, setEntries] = useState<HistorianAlarmEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync mode if changed from panel config
  useEffect(() => {
    if (panel.alarmViewMode) {
      setViewMode(panel.alarmViewMode);
    }
  }, [panel.alarmViewMode]);

  useEffect(() => {
    const fetchEntries = () => {
      const allHistory = getAlarmHistory(panel.dashboardId, 'ALL');
      const maxRows = panel.maxDisplayRows || 100;
      setEntries(allHistory.slice(0, maxRows));
    };

    fetchEntries();
    const interval = setInterval(fetchEntries, 1200);
    return () => clearInterval(interval);
  }, [panel.dashboardId, panel.maxDisplayRows]);

  // Calculate Active Unack, Active Ack, and Resolved counts
  const activeUnackCount = entries.filter(e => e.status === 'ACTIVE_UNACK').length;
  const activeAckCount = entries.filter(e => e.status === 'ACTIVE_ACK').length;
  const resolvedCount = entries.filter(e => e.status.includes('RESOLVED')).length;

  // Filter entries according to active viewMode (live vs historian)
  const filteredEntries = entries.filter(e => {
    if (viewMode === 'live') {
      return e.status === 'ACTIVE_UNACK' || e.status === 'ACTIVE_ACK';
    }
    return true; // historian mode shows all
  });

  // Pagination logic
  const pageSize = Math.max(1, panel.pageSize || 5);
  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + pageSize);

  const handleAck = (e: React.MouseEvent, alarmKey: string) => {
    e.stopPropagation();
    recordAlarmAckEvent(alarmKey);
    const updated = getAlarmHistory(panel.dashboardId, 'ALL');
    setEntries(updated);
  };

  return (
    <div className={`w-full h-full flex flex-col bg-[#080d1a]/95 text-slate-200 border border-slate-800 rounded-xl overflow-hidden shadow-2xl ${className}`}>
      
      {/* Header with Title, Mode Switcher & Summary Counters */}
      <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 shrink-0 select-none">
        <div className="flex items-center space-x-2 truncate">
          <i className="fas fa-bell text-rose-400 text-xs shrink-0 animate-pulse"></i>
          <span className="text-xs font-bold text-white truncate">{panel.panelName || 'Alarm Historian Log'}</span>
        </div>

        {/* Live vs Historian View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[9px] font-bold">
          <button
            type="button"
            onClick={() => { setViewMode('live'); setCurrentPage(1); }}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              viewMode === 'live'
                ? 'bg-rose-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Show Active Alarms Only (Active Unack & Active Ack)"
          >
            <i className="fas fa-tower-broadcast mr-1 text-[8px]"></i>
            LIVE
          </button>
          <button
            type="button"
            onClick={() => { setViewMode('historian'); setCurrentPage(1); }}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              viewMode === 'historian'
                ? 'bg-indigo-500 text-white font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Show Historical Alarm Event Log"
          >
            <i className="fas fa-clock-rotate-left mr-1 text-[8px]"></i>
            HISTORIAN
          </button>
        </div>
      </div>

      {/* Summary Metrics Pills (Active Unack, Active Ack, Resolved) */}
      <div className="bg-slate-950/80 px-3 py-1 border-b border-slate-800/80 flex items-center justify-between text-[9px] font-mono shrink-0">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {/* Active Unack */}
          <span className={`px-1.5 py-0.2 rounded border font-bold flex items-center space-x-1 ${
            activeUnackCount > 0
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
              : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Active Unack: <strong>{activeUnackCount}</strong></span>
          </span>

          {/* Active Ack */}
          <span className={`px-1.5 py-0.2 rounded border font-bold flex items-center space-x-1 ${
            activeAckCount > 0
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Active Ack: <strong>{activeAckCount}</strong></span>
          </span>

          {/* Resolved */}
          <span className="px-1.5 py-0.2 rounded border font-bold bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Resolved: <strong>{resolvedCount}</strong></span>
          </span>
        </div>

        <span className="text-slate-400 font-sans text-[9px] hidden sm:inline">
          Showing {filteredEntries.length} {viewMode === 'live' ? 'Live' : 'Total'} Events
        </span>
      </div>

      {/* Log Entries View Container with Window Scroll support */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {filteredEntries.length === 0 ? (
          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center text-slate-500 p-3 space-y-1">
            <i className="fas fa-shield-check text-emerald-400 text-2xl mb-1"></i>
            <span className="text-xs text-slate-300 font-bold">
              {viewMode === 'live' ? 'No Active Alarms (All Systems Normal)' : 'No Alarm Events Recorded'}
            </span>
            <span className="text-[10px] text-slate-500">
              {viewMode === 'live' ? 'Active Unacknowledged and Active Acknowledged alarms appear here.' : 'Historian log database is clean.'}
            </span>
          </div>
        ) : (
          paginatedEntries.map(entry => {
            const isUnack = entry.status === 'ACTIVE_UNACK';
            const isAck = entry.status === 'ACTIVE_ACK';
            const isResolvedAck = entry.status === 'RESOLVED_ACK';

            let statusBadge = (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border bg-rose-500/20 text-rose-300 border-rose-500/50 flex items-center space-x-1 shrink-0 animate-pulse">
                <i className="fas fa-triangle-exclamation text-[8px]"></i>
                <span>ACTIVE UNACK</span>
              </span>
            );

            if (isAck) {
              statusBadge = (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/50 flex items-center space-x-1 shrink-0">
                  <i className="fas fa-user-check text-[8px]"></i>
                  <span>ACTIVE ACK</span>
                </span>
              );
            } else if (isResolvedAck) {
              statusBadge = (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/50 flex items-center space-x-1 shrink-0">
                  <i className="fas fa-circle-check text-[8px]"></i>
                  <span>RESOLVED ACK</span>
                </span>
              );
            } else if (entry.status === 'RESOLVED_UNACK') {
              statusBadge = (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border bg-sky-500/20 text-sky-300 border-sky-500/50 flex items-center space-x-1 shrink-0">
                  <i className="fas fa-info-circle text-[8px]"></i>
                  <span>RESOLVED UNACK</span>
                </span>
              );
            }

            return (
              <div
                key={entry.id}
                className={`p-2 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2 transition-all hover:bg-slate-900/80 ${
                  isUnack
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/50'
                    : isAck
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-2 truncate flex-1 min-w-[160px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: entry.color || '#ef4444' }}
                  />
                  <div className="truncate">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                      <span className="font-bold text-white text-[11px] truncate">{entry.panelName}</span>
                      {statusBadge}
                    </div>
                    <p className="text-[10px] text-slate-300 truncate italic mt-0.5">"{entry.message}"</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 ml-auto font-mono text-[10px]">
                  {/* Inline Ack Action Button for ACTIVE_UNACK */}
                  {isUnack && (
                    <button
                      type="button"
                      onClick={(e) => handleAck(e, entry.alarmKey)}
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded text-[9px] uppercase tracking-wider shadow transition-transform active:scale-95 cursor-pointer"
                      title="Click to Acknowledge Alarm"
                    >
                      ACK
                    </button>
                  )}

                  <div className="text-right">
                    <div className="text-slate-300 font-semibold">
                      {new Date(entry.triggerTime).toLocaleTimeString()}
                    </div>
                    <div className="text-cyan-300 font-bold text-[9px]">
                      Dur: {calculateAlarmDuration(entry.triggerTime, entry.resolvedTime)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Optimized Paging System Footer */}
      {filteredEntries.length > 0 && (
        <div className="bg-slate-900/90 px-3 py-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] shrink-0 font-mono select-none">
          <div className="text-slate-400">
            Showing <strong className="text-slate-200">{startIndex + 1}</strong>-
            <strong className="text-slate-200">{Math.min(startIndex + pageSize, filteredEntries.length)}</strong> of{' '}
            <strong className="text-amber-400">{filteredEntries.length}</strong>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded font-bold transition-all cursor-pointer"
            >
              <i className="fas fa-chevron-left text-[9px] mr-1"></i>
              Prev
            </button>

            <span className="px-2 py-0.5 bg-slate-950 text-cyan-300 rounded border border-slate-800 font-bold">
              {validCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded font-bold transition-all cursor-pointer"
            >
              Next
              <i className="fas fa-chevron-right text-[9px] ml-1"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
