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
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
  isAutoPopupEnabled?: boolean;
  onToggleAutoPopup?: () => void;
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
  isSoundEnabled = true,
  onToggleSound,
  isAutoPopupEnabled = true,
  onToggleAutoPopup,
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
        <div className="bg-gradient-to-r from-slate-950 via-rose-950/80 to-amber-950/90 px-3 sm:px-5 py-1.5 sm:py-2.5 border-b border-rose-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 animate-bounce shrink-0">
              <i className="fas fa-triangle-exclamation text-xs sm:text-sm"></i>
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <h2 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase truncate">
                  Telemetry Live Alarm Center
                </h2>
                <span className="bg-rose-500 text-black text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.2 rounded-full font-mono uppercase animate-pulse shrink-0">
                  LIVE ({activeAlarms.length})
                </span>
              </div>
              <p className="text-[9px] sm:text-[11px] text-rose-200/80 font-medium truncate">
                {unackCount > 0 ? `${unackCount} Unacknowledged Alarm${unackCount > 1 ? 's' : ''}` : 'All active alarms acknowledged'}
              </p>
            </div>
          </div>

          {/* Quick Control Toggles & Window Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Alarm Controls: Popup, Sound, Haptic Toggles */}
            <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 text-[10px]">
              {onToggleAutoPopup && (
                <button
                  type="button"
                  onClick={onToggleAutoPopup}
                  className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded flex items-center space-x-1 font-bold transition-all cursor-pointer ${
                    isAutoPopupEnabled
                      ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Toggle Auto Pop-up on New Alarm Trigger"
                >
                  <i className={`fas ${isAutoPopupEnabled ? 'fa-window-restore text-indigo-400' : 'fa-window-maximize text-slate-500'} text-[10px]`}></i>
                  <span className="hidden sm:inline">{isAutoPopupEnabled ? 'Popup ON' : 'Popup OFF'}</span>
                </button>
              )}

              {onToggleSound && (
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded flex items-center space-x-1 font-bold transition-all cursor-pointer ${
                    isSoundEnabled
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Toggle Industrial Alarm Sound Siren"
                >
                  <i className={`fas ${isSoundEnabled ? 'fa-volume-high text-emerald-400 animate-pulse' : 'fa-volume-xmark text-slate-500'} text-[10px]`}></i>
                  <span className="hidden sm:inline">{isSoundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
                </button>
              )}

              {onToggleVibrate && (
                <button
                  type="button"
                  onClick={onToggleVibrate}
                  className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded flex items-center space-x-1 font-bold transition-all cursor-pointer ${
                    isVibrateEnabled
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Toggle 5-Second Mobile Haptic Vibration"
                >
                  <i className={`fas ${isVibrateEnabled ? 'fa-mobile-retro text-amber-400 animate-pulse' : 'fa-mobile-retro text-slate-500'} text-[10px]`}></i>
                  <span className="hidden sm:inline">{isVibrateEnabled ? '5s Haptic ON' : 'Haptic OFF'}</span>
                </button>
              )}
            </div>

            {onOpenHistorian && (
              <button
                onClick={onOpenHistorian}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-sm active:scale-95"
                title="Switch to Alarm Historian Database Log"
              >
                <i className="fas fa-history text-[10px] text-indigo-400"></i>
                <span className="hidden md:inline">Alarm Historian</span>
                <i className="fas fa-arrow-right text-[9px] text-indigo-400"></i>
              </button>
            )}

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-800"
              title={isMaximized ? "Restore window size" : "Maximize window"}
            >
              <i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer border border-slate-800"
              title="Close window"
            >
              <i className="fas fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* Latest Alarm Banner if just triggered */}
        {latestAlarmTriggered && (
          <div className="bg-rose-500/10 border-b border-rose-500/30 px-3 sm:px-5 py-1 sm:py-1.5 flex items-center justify-between space-x-2 shrink-0 text-[10px] sm:text-xs">
            <div className="flex items-center space-x-2 overflow-hidden">
              <i className="fas fa-circle-exclamation text-rose-400 text-xs shrink-0 animate-pulse"></i>
              <div className="truncate">
                <span className="font-bold text-rose-300">Latest: </span>
                <span className="text-white font-semibold">{latestAlarmTriggered.panelName}</span>
                <span className="text-[10px] text-rose-200/90 ml-1 font-mono">
                  ({latestAlarmTriggered.zone === 'TRIP' || latestAlarmTriggered.zone === 'FAULT' ? 'TRIP' : `${latestAlarmTriggered.zone}: ${latestAlarmTriggered.value}${latestAlarmTriggered.unit || ''}`})
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono text-slate-400 shrink-0">{latestAlarmTriggered.timestamp}</span>
          </div>
        )}

        {/* Toolbar & View Toggle */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-3 sm:px-5 py-1 sm:py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Active Alarms</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-amber-400 font-bold">{unackCount} Pending</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold transition-all ${
                  viewMode === 'CARDS' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-th-large mr-1 text-[9px]"></i>
                Cards
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold transition-all ${
                  viewMode === 'TABLE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-table-list mr-1 text-[9px]"></i>
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Alarm List Body */}
        <div className="flex-1 overflow-auto p-2 sm:p-4">
          {activeAlarms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 text-xl">
                <i className="fas fa-shield-check"></i>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-300">No active parameter alarms or trips.</p>
              <p className="text-[11px] text-slate-500 max-w-md">
                All telemetry parameters operating within normal bounds.
              </p>
              {onOpenHistorian && (
                <button
                  onClick={onOpenHistorian}
                  className="mt-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg transition-all"
                >
                  View Historical Logs
                </button>
              )}
            </div>
          ) : viewMode === 'CARDS' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              {activeAlarms.map((alarm) => (
                <div
                  key={alarm.alarmKey}
                  className={`p-2.5 sm:p-3.5 rounded-lg border transition-all flex flex-col justify-between space-y-1.5 sm:space-y-2.5 ${
                    alarm.acknowledged 
                      ? 'bg-slate-900/40 border-slate-800/80 opacity-75' 
                      : 'bg-[#161b26] border-rose-500/50 shadow-lg ring-1 ring-rose-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm animate-pulse"
                        style={{ backgroundColor: alarm.color }}
                      />
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white leading-tight">{alarm.panelName}</h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span 
                            className="text-[9px] font-extrabold uppercase px-1 py-0.1 rounded border"
                            style={{ 
                              borderColor: alarm.color, 
                              color: alarm.color,
                              backgroundColor: `${alarm.color}15`
                            }}
                          >
                            {alarm.zone === 'TRIP' || alarm.zone === 'FAULT' ? '⚡ TRIP / FAULT' : `${alarm.zone} ZONE`}
                          </span>
                          {alarm.zone !== 'TRIP' && alarm.zone !== 'FAULT' && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Limit: {alarm.threshold} {alarm.unit || ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black font-mono text-white">
                        {alarm.value} <span className="text-[10px] text-slate-400 font-normal">{alarm.unit || ''}</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">{alarm.timestamp}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-300 font-medium italic truncate max-w-[170px] sm:max-w-[200px]" title={alarm.message}>
                      "{alarm.message}"
                    </span>

                    <button
                      onClick={() => onAcknowledgeAlarm(alarm.alarmKey)}
                      className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        alarm.acknowledged
                          ? 'bg-slate-800 text-slate-400 hover:text-white'
                          : 'bg-rose-500 hover:bg-rose-400 text-black shadow-sm active:scale-95'
                      }`}
                    >
                      {alarm.acknowledged ? 'Acked ✓' : 'ACKNOWLEDGE'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/60 shadow-inner">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-2">Status</th>
                    <th className="p-2">Equipment</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Value</th>
                    <th className="p-2">Time</th>
                    <th className="p-2">Message</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-sans">
                  {activeAlarms.map((alarm) => (
                    <tr key={alarm.alarmKey} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-2 whitespace-nowrap">
                        <span 
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                            alarm.acknowledged
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-500 text-black animate-pulse'
                          }`}
                        >
                          {alarm.acknowledged ? 'ACKED' : 'UNACKED'}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-white whitespace-nowrap text-xs">{alarm.panelName}</td>
                      <td className="p-2 whitespace-nowrap">
                        <span 
                          className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border"
                          style={{ borderColor: alarm.color, color: alarm.color, backgroundColor: `${alarm.color}15` }}
                        >
                          {alarm.zone === 'TRIP' || alarm.zone === 'FAULT' ? 'TRIP' : `${alarm.zone}`}
                        </span>
                      </td>
                      <td className="p-2 font-mono font-bold text-right text-white whitespace-nowrap text-xs">
                        {alarm.value} <span className="text-[9px] text-slate-400 font-normal">{alarm.unit}</span>
                      </td>
                      <td className="p-2 font-mono text-[10px] text-slate-300 whitespace-nowrap">{alarm.timestamp}</td>
                      <td className="p-2 text-slate-300 italic max-w-xs truncate text-[11px]" title={alarm.message}>"{alarm.message}"</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => onAcknowledgeAlarm(alarm.alarmKey)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            alarm.acknowledged
                              ? 'bg-slate-800 text-slate-400 hover:text-white'
                              : 'bg-rose-500 hover:bg-rose-400 text-black'
                          }`}
                        >
                          {alarm.acknowledged ? 'Acked ✓' : 'Ack'}
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
        <div className="bg-[#121824] px-3 sm:px-5 py-1.5 sm:py-2 border-t border-slate-800 flex flex-wrap items-center justify-between shrink-0 gap-1.5 text-[10px] sm:text-xs">
          {onToggleVibrate && (
            <button
              onClick={onToggleVibrate}
              className={`flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                isVibrateEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle Mobile Vibration Haptic on Alarm"
            >
              <i className={`fas ${isVibrateEnabled ? 'fa-mobile-retro animate-pulse text-amber-400' : 'fa-mobile-retro text-slate-500'}`}></i>
              <span>{isVibrateEnabled ? '5s Haptic Active' : 'Haptic Muted'}</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 ml-auto">
            {activeAlarms.some(a => !a.acknowledged) && (
              <button
                onClick={onAcknowledgeAll}
                className="px-2.5 sm:px-4 py-1 sm:py-1.5 bg-rose-500 hover:bg-rose-400 text-black font-black uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1 text-[10px] sm:text-xs"
              >
                <i className="fas fa-check-double text-[10px]"></i>
                <span>ACKNOWLEDGE ALL</span>
              </button>
            )}

            {onOpenHistorian && (
              <button
                onClick={onOpenHistorian}
                className="px-2.5 sm:px-4 py-1 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md flex items-center space-x-1 text-[10px] sm:text-xs"
              >
                <i className="fas fa-history text-[10px]"></i>
                <span className="hidden sm:inline">OPEN HISTORIAN LOG</span>
                <span className="inline sm:hidden">HISTORIAN</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-1 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-[10px] sm:text-xs"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlarmModal;
