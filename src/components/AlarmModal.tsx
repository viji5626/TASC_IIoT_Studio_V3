import React, { useState } from 'react';
import { ActiveAlarm } from '../types';

interface AlarmModalProps {
  activeAlarms: ActiveAlarm[];
  isOpen: boolean;
  onClose: () => void;
  onAcknowledgeAll: () => void;
  onAcknowledgeAlarm: (alarmKey: string) => void;
  isVibrateEnabled?: boolean;
  onToggleVibrate?: () => void;
  latestAlarmTriggered?: ActiveAlarm | null;
  onOpenHistorian?: () => void;
}

const AlarmModal: React.FC<AlarmModalProps> = ({
  activeAlarms,
  isOpen,
  onClose,
  onAcknowledgeAll,
  onAcknowledgeAlarm,
  isVibrateEnabled = true,
  onToggleVibrate,
  latestAlarmTriggered,
  onOpenHistorian
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  if (!isOpen && activeAlarms.length === 0) return null;
  if (!isOpen) return null;

  const unackCount = activeAlarms.filter(a => !a.acknowledged).length;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`bg-[#0f141d] border-2 border-rose-500/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${
          isMaximized ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-6xl h-[88vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-rose-950/80 to-amber-950/90 px-5 py-3 border-b border-rose-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 animate-bounce">
              <i className="fas fa-triangle-exclamation text-lg"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                  Telemetry Live Alarm Center
                </h2>
                <span className="bg-rose-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full font-mono uppercase animate-pulse">
                  LIVE ({activeAlarms.length})
                </span>
              </div>
              <p className="text-[11px] text-rose-200/80 font-medium">
                {unackCount > 0 ? `${unackCount} Unacknowledged Alarm${unackCount > 1 ? 's' : ''}` : 'All active alarms acknowledged'}
              </p>
            </div>
          </div>

          {/* Quick Cross-Navigation & Window Controls */}
          <div className="flex items-center space-x-2">
            {onOpenHistorian && (
              <button
                onClick={onOpenHistorian}
                className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Switch to Alarm Historian Database Log"
              >
                <i className="fas fa-history text-xs text-indigo-400"></i>
                <span className="hidden sm:inline">Alarm Historian</span>
                <i className="fas fa-arrow-right text-[10px] text-indigo-400"></i>
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

        {/* Latest Alarm Banner if just triggered */}
        {latestAlarmTriggered && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 px-5 py-2.5 flex items-center justify-between space-x-3 shrink-0">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <i className="fas fa-circle-exclamation text-rose-400 text-sm shrink-0 animate-pulse"></i>
              <div className="truncate">
                <span className="text-xs font-bold text-rose-300">Latest Trigger: </span>
                <span className="text-xs text-white font-semibold">{latestAlarmTriggered.panelName}</span>
                <span className="text-[11px] text-rose-200/90 ml-1.5 font-mono">
                  ({latestAlarmTriggered.zone === 'TRIP' || latestAlarmTriggered.zone === 'FAULT' ? 'EQUIPMENT TRIP / FAULT' : `${latestAlarmTriggered.zone} Zone: ${latestAlarmTriggered.value} ${latestAlarmTriggered.unit || ''}`})
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">{latestAlarmTriggered.timestamp}</span>
          </div>
        )}

        {/* Toolbar & View Toggle */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-5 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Alarms List</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-mono text-amber-400">{unackCount} Pending Ack</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  viewMode === 'CARDS' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-th-large mr-1 text-[10px]"></i>
                Cards
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  viewMode === 'TABLE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-table-list mr-1 text-[10px]"></i>
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Alarm List Body */}
        <div className="flex-1 overflow-auto p-5">
          {activeAlarms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 text-2xl">
                <i className="fas fa-shield-check"></i>
              </div>
              <p className="text-sm font-semibold text-slate-300">No active parameter alarms or trips.</p>
              <p className="text-xs text-slate-500 max-w-md">
                All connected telemetry parameters and equipment components are currently operating within normal parameters.
              </p>
              {onOpenHistorian && (
                <button
                  onClick={onOpenHistorian}
                  className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                >
                  View Historical Logs
                </button>
              )}
            </div>
          ) : viewMode === 'CARDS' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAlarms.map((alarm) => (
                <div
                  key={alarm.alarmKey}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                    alarm.acknowledged 
                      ? 'bg-slate-900/40 border-slate-800/80 opacity-75' 
                      : 'bg-[#161b26] border-rose-500/50 shadow-lg ring-1 ring-rose-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm animate-pulse"
                        style={{ backgroundColor: alarm.color }}
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-white leading-snug">{alarm.panelName}</h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span 
                            className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border"
                            style={{ 
                              borderColor: alarm.color, 
                              color: alarm.color,
                              backgroundColor: `${alarm.color}15`
                            }}
                          >
                            {alarm.zone === 'TRIP' || alarm.zone === 'FAULT' ? '⚡ TRIP / FAULT' : `${alarm.zone} ZONE`}
                          </span>
                          {alarm.zone !== 'TRIP' && alarm.zone !== 'FAULT' && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              Limit: {alarm.threshold} {alarm.unit || ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black font-mono text-white">
                        {alarm.value} <span className="text-xs text-slate-400 font-normal">{alarm.unit || ''}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{alarm.timestamp}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-300 font-medium italic text-xs truncate max-w-[200px]" title={alarm.message}>
                      "{alarm.message}"
                    </span>

                    <button
                      onClick={() => onAcknowledgeAlarm(alarm.alarmKey)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        alarm.acknowledged
                          ? 'bg-slate-800 text-slate-400 hover:text-white'
                          : 'bg-rose-500 hover:bg-rose-400 text-black shadow-sm active:scale-95'
                      }`}
                    >
                      {alarm.acknowledged ? 'Acknowledged ✓' : 'Acknowledge'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/60 shadow-inner">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Status</th>
                    <th className="p-3">Equipment / Asset</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Value</th>
                    <th className="p-3">Trigger Time</th>
                    <th className="p-3">Alarm Message</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-sans">
                  {activeAlarms.map((alarm) => (
                    <tr key={alarm.alarmKey} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span 
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            alarm.acknowledged
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-500 text-black animate-pulse'
                          }`}
                        >
                          {alarm.acknowledged ? 'ACKNOWLEDGED' : 'UNACKNOWLEDGED'}
                        </span>
                      </td>
                      <td className="p-3 font-extrabold text-white whitespace-nowrap">{alarm.panelName}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                          style={{ borderColor: alarm.color, color: alarm.color, backgroundColor: `${alarm.color}15` }}
                        >
                          {alarm.zone === 'TRIP' || alarm.zone === 'FAULT' ? '⚡ TRIP / FAULT' : `${alarm.zone} ZONE`}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-right text-white whitespace-nowrap">
                        {alarm.value} <span className="text-[10px] text-slate-400 font-normal">{alarm.unit}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">{alarm.timestamp}</td>
                      <td className="p-3 text-slate-300 italic max-w-xs truncate" title={alarm.message}>"{alarm.message}"</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onAcknowledgeAlarm(alarm.alarmKey)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            alarm.acknowledged
                              ? 'bg-slate-800 text-slate-400 hover:text-white'
                              : 'bg-rose-500 hover:bg-rose-400 text-black'
                          }`}
                        >
                          {alarm.acknowledged ? 'Acked ✓' : 'Acknowledge'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="bg-[#121824] px-5 py-3 border-t border-slate-800 flex items-center justify-between shrink-0 gap-3">
          {onToggleVibrate && (
            <button
              onClick={onToggleVibrate}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isVibrateEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle Mobile Vibration Haptic on Alarm"
            >
              <i className={`fas ${isVibrateEnabled ? 'fa-mobile-retro animate-pulse text-amber-400' : 'fa-mobile-retro text-slate-500'}`}></i>
              <span className="hidden sm:inline">{isVibrateEnabled ? '5s Haptic Active' : 'Haptic Muted'}</span>
            </button>
          )}

          <div className="flex items-center space-x-2.5 ml-auto">
            {activeAlarms.some(a => !a.acknowledged) && (
              <button
                onClick={onAcknowledgeAll}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
              >
                <i className="fas fa-check-double"></i>
                <span>Acknowledge All</span>
              </button>
            )}

            {onOpenHistorian && (
              <button
                onClick={onOpenHistorian}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center space-x-1.5"
              >
                <i className="fas fa-history"></i>
                <span>Open Historian Log</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlarmModal;
