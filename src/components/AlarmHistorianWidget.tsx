import React, { useState, useEffect } from 'react';
import { Panel, HistorianAlarmEntry } from '../types';
import { getAlarmHistory, calculateAlarmDuration } from '../utils/alarmHistorianEngine';

interface AlarmHistorianWidgetProps {
  panel: Panel;
  className?: string;
  isCompact?: boolean;
}

export const AlarmHistorianWidget: React.FC<AlarmHistorianWidgetProps> = ({
  panel,
  className = ''
}) => {
  const [entries, setEntries] = useState<HistorianAlarmEntry[]>([]);

  useEffect(() => {
    const fetchEntries = () => {
      const history = getAlarmHistory(panel.dashboardId, 'ALL');
      const limit = panel.maxDisplayRows || 10;
      setEntries(history.slice(0, limit));
    };

    fetchEntries();
    const interval = setInterval(fetchEntries, 1500);
    return () => clearInterval(interval);
  }, [panel.dashboardId, panel.maxDisplayRows]);

  return (
    <div className={`w-full h-full flex flex-col bg-[#0b0f17]/90 text-slate-200 border rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <i className="fas fa-history text-indigo-400 text-xs shrink-0"></i>
          <span className="text-xs font-bold text-white truncate">{panel.panelName || 'Alarm Historian Log'}</span>
        </div>
        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30 shrink-0">
          LIVE LOG ({entries.length})
        </span>
      </div>

      {/* Log Entries View */}
      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-2 space-y-1">
            <i className="fas fa-shield-check text-emerald-400 text-xl"></i>
            <span className="text-[11px] text-slate-400 font-semibold">No Alarms Recorded</span>
          </div>
        ) : (
          entries.map(entry => {
            const isActive = entry.status.includes('ACTIVE');

            return (
              <div
                key={entry.id}
                className={`p-2 rounded-lg border text-xs flex items-center justify-between space-x-2 transition-colors ${
                  isActive
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="truncate">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white text-[11px] truncate">{entry.panelName}</span>
                      <span
                        className="text-[9px] font-extrabold uppercase px-1 py-0.1 rounded border shrink-0"
                        style={{ color: entry.color, borderColor: `${entry.color}40`, backgroundColor: `${entry.color}15` }}
                      >
                        {entry.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate italic">"{entry.message}"</p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-[10px]">
                  <div className="text-slate-300 font-semibold">
                    {new Date(entry.triggerTime).toLocaleTimeString()}
                  </div>
                  <div className="text-cyan-300 font-bold">
                    {calculateAlarmDuration(entry.triggerTime, entry.resolvedTime)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
