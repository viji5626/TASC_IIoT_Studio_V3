import React, { useState } from 'react';
import { MachineState, DowntimeEvent, DowntimeCategory } from '../../types/production';

interface MachineStateGanttProps {
  events: DowntimeEvent[];
  currentState: MachineState;
  stateStartTime: number;
  totalDurationHours?: number;
  onTagEvent?: (event: DowntimeEvent) => void;
}

export const MachineStateGantt: React.FC<MachineStateGanttProps> = ({
  events,
  currentState,
  stateStartTime,
  totalDurationHours = 8,
  onTagEvent
}) => {
  const [hoveredEvent, setHoveredEvent] = useState<DowntimeEvent | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const getStateColor = (state: MachineState): string => {
    switch (state) {
      case MachineState.RUNNING:
        return 'bg-emerald-500 hover:bg-emerald-400';
      case MachineState.IDLE_MICRO_STOP:
        return 'bg-amber-400 hover:bg-amber-300';
      case MachineState.UNPLANNED_BREAKDOWN:
        return 'bg-rose-500 hover:bg-rose-400 animate-pulse';
      case MachineState.PLANNED_MAINTENANCE:
        return 'bg-sky-500 hover:bg-sky-400';
      case MachineState.CHANGEOVER:
        return 'bg-purple-500 hover:bg-purple-400';
      case MachineState.COMM_FAULT:
        return 'bg-slate-500 hover:bg-slate-400';
      default:
        return 'bg-slate-600';
    }
  };

  const getStateLabel = (state: MachineState): string => {
    switch (state) {
      case MachineState.RUNNING: return 'Running';
      case MachineState.IDLE_MICRO_STOP: return 'Micro-Stop';
      case MachineState.UNPLANNED_BREAKDOWN: return 'Breakdown';
      case MachineState.PLANNED_MAINTENANCE: return 'Maintenance';
      case MachineState.CHANGEOVER: return 'Changeover';
      case MachineState.COMM_FAULT: return 'Comm Fault';
    }
  };

  const totalWindowMs = totalDurationHours * 3600 * 1000;
  const now = Date.now();
  const windowStart = now - totalWindowMs;

  // Compile full timeline segments including current active state
  const activeSegmentDurationSec = Math.max(1, Math.round((now - stateStartTime) / 1000));
  const activeEvent: DowntimeEvent = {
    id: 'active_current',
    lineId: 'active',
    state: currentState,
    startTime: stateStartTime,
    durationSec: activeSegmentDurationSec,
    category: currentState === MachineState.UNPLANNED_BREAKDOWN ? DowntimeCategory.MECHANICAL : DowntimeCategory.UNASSIGNED,
    reasonText: currentState === MachineState.RUNNING ? 'Normal Production' : 'Active In-Progress Stoppage',
    shiftId: 'SHIFT_A',
    isPlanned: currentState === MachineState.PLANNED_MAINTENANCE || currentState === MachineState.CHANGEOVER
  };

  const allSegments = [...events.filter(e => e.startTime >= windowStart), activeEvent];
  const totalSec = allSegments.reduce((sum, seg) => sum + seg.durationSec, 0) || 1;

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  };

  const formatTime = (epochMs: number) => {
    return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-gantt text-sky-400"></i>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Machine State Timeline (Past {totalDurationHours} Hours)
          </h3>
        </div>

        {/* State Badges Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Running
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Micro-Stop (&lt;5m)
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> Breakdown (&gt;5m)
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span> Changeover
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/30 text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span> Maintenance
          </span>
        </div>
      </div>

      {/* Gantt Ribbon Container */}
      <div 
        className="w-full h-8 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 relative cursor-pointer"
        onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        {allSegments.map((seg, idx) => {
          const widthPct = Math.max(0.5, (seg.durationSec / totalSec) * 100);
          const colorClass = getStateColor(seg.state);

          return (
            <div
              key={seg.id || idx}
              style={{ width: `${widthPct}%` }}
              className={`h-full transition-all border-r border-slate-950/40 relative ${colorClass}`}
              onMouseEnter={() => setHoveredEvent(seg)}
              onMouseLeave={() => setHoveredEvent(null)}
              onClick={() => onTagEvent && onTagEvent(seg)}
            />
          );
        })}
      </div>

      {/* Time Scale Marks */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1.5">
        <span>{formatTime(windowStart)}</span>
        <span>-4h</span>
        <span>-2h</span>
        <span className="text-sky-400 font-bold">Now ({formatTime(now)})</span>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredEvent && (
        <div 
          className="fixed z-50 bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 shadow-2xl pointer-events-none text-xs space-y-1 max-w-xs"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
            <span className="font-bold text-sky-300">{getStateLabel(hoveredEvent.state)}</span>
            <span className="font-mono text-[10px] text-slate-400">{formatDuration(hoveredEvent.durationSec)}</span>
          </div>
          <p className="text-slate-200">{hoveredEvent.reasonText || 'No reason specified'}</p>
          <div className="text-[10px] text-slate-400 font-mono">
            <span>Started: {formatTime(hoveredEvent.startTime)}</span>
          </div>
          {hoveredEvent.state !== MachineState.RUNNING && (
            <div className="text-[10px] text-amber-300 italic pt-0.5">
              Click to tag / edit downtime reason
            </div>
          )}
        </div>
      )}
    </div>
  );
};
