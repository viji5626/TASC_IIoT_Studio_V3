import React, { useState } from 'react';
import { ActiveAlarm } from '../types';
import { triggerAckHaptic, triggerClickHaptic } from '../utils/hapticFeedback';

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

export const AlarmModal: React.FC<AlarmModalProps> = ({
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
                  onClick={() => {
                    triggerClickHaptic();
                    onToggleAutoPopup();
                  }}
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
                  onClick={() => {
                    triggerClickHaptic();
                    onToggleSound();
                  }}
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
                  onClick={() => {
                    if (!isVibrateEnabled) {
                      triggerAckHaptic(); // Provide instant test vibration feedback
                    } else {
                      triggerClickHaptic();
                    }
                    onToggleVibrate();
                  }}
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
                onClick={() => {
                  triggerClickHaptic();
                  onOpenHistorian();
                }}
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
              className="p-1 sm:p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
              title={isMaximized ? "Restore Window" : "Maximize Window"}
            >
              <i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
            </button>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
              title="Close Center"
            >
              <i className="fas fa-xmark text-sm"></i>
            </button>
          </div>
        </div>

        {/* View Toggle Toolbar */}
        <div className="bg-slate-950/80 px-3 sm:px-5 py-1.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[10px] sm:text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-slate-300">Active Alarms</span>
            <span>•</span>
            <span className="text-amber-400 font-mono font-bold">{unackCount} Pending</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <i className="fas fa-table-cells-large mr-1 text-[9px]"></i>
              Cards
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <i className="fas fa-table-list mr-1 text-[9px]"></i>
              Table
            </button>
          </div>
        </div>

        {/* Alarm List Content */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5">
          {activeAlarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-xl">
                <i className="fas fa-circle-check"></i>
              </div>
              <div className="text-sm font-bold text-slate-400">No active parameter alarms or trips.</div>
              <div className="text-xs text-slate-600 max-w-sm">All telemetry parameters operating within normal bounds.</div>
              {onOpenHistorian && (
                <button
                  onClick={onOpenHistorian}
                  className="mt-2 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  View Historical Logs
                </button>
              )}
            </div>
          ) : viewMode === 'CARDS' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeAlarms.map((alarm) => {
                const isTrip = alarm.alarmType === 'TRIP';
                const isUnack = !alarm.acknowledged;

                return (
                  <div
                    key={alarm.alarmKey}
                    className={`rounded-xl p-3 border transition-all relative overflow-hidden flex flex-col justify-between space-y-2 shadow-lg ${
                      isTrip
                        ? isUnack
                          ? 'bg-gradient-to-br from-rose-950/90 via-slate-900 to-slate-950 border-rose-500 shadow-rose-950/50 ring-1 ring-rose-500/60 animate-pulse'
                          : 'bg-slate-900/90 border-rose-900/60 opacity-80'
                        : isUnack
                        ? 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-amber-500 shadow-amber-950/40'
                        : 'bg-slate-900/90 border-amber-900/60 opacity-80'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-start space-x-2 overflow-hidden">
                        <div
                          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                            isTrip
                              ? 'bg-rose-500 text-black shadow-md shadow-rose-500/50'
                              : 'bg-amber-500 text-black shadow-md shadow-amber-500/50'
                          }`}
                        >
                          <i className={`fas ${isTrip ? 'fa-skull-crossbones' : 'fa-triangle-exclamation'}`}></i>
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-black text-white truncate">{alarm.panelTitle}</h4>
                          <span className="text-[10px] font-mono text-slate-400 truncate block">
                            {alarm.topic || alarm.driverTagId || 'Parameter Tag'}
                          </span>
                        </div>
                      </div>

                      {/* Alarm Type Chip */}
                      <span
                        className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          isTrip
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {alarm.alarmType}
                      </span>
                    </div>

                    {/* Alarm Description & Threshold Details */}
                    <div className="bg-black/40 rounded-lg p-2 border border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Current Value:</span>
                        <span className="font-mono font-black text-rose-400 text-xs">
                          {alarm.currentValue}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span>Threshold Limit:</span>
                        <span className="font-mono text-slate-300">
                          {alarm.limitThreshold !== undefined ? alarm.limitThreshold : 'Digital Trip'}
                        </span>
                      </div>
                      <div className="text-[10px] font-medium text-slate-300 pt-0.5 border-t border-slate-800/60 truncate">
                        {alarm.message}
                      </div>
                    </div>

                    {/* Card Footer: Timestamp & Action */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                      <div className="text-slate-400 font-mono flex items-center space-x-1">
                        <i className="fas fa-clock text-[9px] text-slate-500"></i>
                        <span>{new Date(alarm.triggeredAt).toLocaleTimeString()}</span>
                      </div>

                      {isUnack ? (
                        <button
                          onClick={() => {
                            triggerAckHaptic();
                            onAcknowledgeAlarm(alarm.alarmKey);
                          }}
                          className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-black font-black uppercase rounded-lg shadow transition-all active:scale-95 cursor-pointer flex items-center space-x-1 text-[10px]"
                        >
                          <i className="fas fa-check text-[9px]"></i>
                          <span>ACKNOWLEDGE</span>
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded font-mono text-[9px] font-bold">
                          ✓ ACKNOWLEDGED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5">Panel / Source</th>
                    <th className="p-2.5">Tag / Topic</th>
                    <th className="p-2.5">Value</th>
                    <th className="p-2.5">Limit</th>
                    <th className="p-2.5">Triggered Time</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activeAlarms.map((alarm) => (
                    <tr key={alarm.alarmKey} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono font-black text-[9px] uppercase border ${
                            alarm.alarmType === 'TRIP'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {alarm.alarmType}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-white">{alarm.panelTitle}</td>
                      <td className="p-2.5 font-mono text-slate-400">{alarm.topic || alarm.driverTagId || 'Tag'}</td>
                      <td className="p-2.5 font-mono font-bold text-rose-400">{alarm.currentValue}</td>
                      <td className="p-2.5 font-mono text-slate-400">{alarm.limitThreshold ?? 'Trip'}</td>
                      <td className="p-2.5 font-mono text-slate-400">{new Date(alarm.triggeredAt).toLocaleTimeString()}</td>
                      <td className="p-2.5 text-right">
                        {!alarm.acknowledged ? (
                          <button
                            onClick={() => {
                              triggerAckHaptic();
                              onAcknowledgeAlarm(alarm.alarmKey);
                            }}
                            className="px-2 py-0.5 bg-rose-500 hover:bg-rose-400 text-black font-black uppercase rounded text-[9px] transition-all active:scale-95 cursor-pointer"
                          >
                            ACK
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-mono text-[9px] font-bold">✓ ACKED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Controls (Cleaned without duplicate bottom haptic button) */}
        <div className="bg-[#121824] px-3 sm:px-5 py-1.5 sm:py-2 border-t border-slate-800 flex items-center justify-between shrink-0 gap-1.5 text-[10px] sm:text-xs">
          <div className="text-[10px] text-slate-500 font-mono">
            {activeAlarms.length > 0
              ? `${activeAlarms.length} active alarm${activeAlarms.length > 1 ? 's' : ''} monitored`
              : 'All systems normal'}
          </div>

          <div className="flex items-center space-x-1.5 ml-auto">
            {activeAlarms.some(a => !a.acknowledged) && (
              <button
                onClick={() => {
                  triggerAckHaptic();
                  onAcknowledgeAll();
                }}
                className="px-2.5 sm:px-4 py-1 sm:py-1.5 bg-rose-500 hover:bg-rose-400 text-black font-black uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1 text-[10px] sm:text-xs"
              >
                <i className="fas fa-check-double text-[10px]"></i>
                <span>ACKNOWLEDGE ALL</span>
              </button>
            )}

            {onOpenHistorian && (
              <button
                onClick={() => {
                  triggerClickHaptic();
                  onOpenHistorian();
                }}
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
