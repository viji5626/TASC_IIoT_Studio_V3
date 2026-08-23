import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MachineLineConfig,
  ShiftConfig,
  MachineState,
  DowntimeEvent,
  DowntimeCategory,
  DowntimeReasonCode
} from '../../types/production';
import {
  OeeCalculationEngine,
  CumulativeDeltaTracker,
  StateDebounceFilter
} from '../../services/OeeCalculationEngine';
import { OeePersistence } from '../../services/OeePersistence';
import { OeeDonutGauge } from './OeeDonutGauge';
import { MachineStateGantt } from './MachineStateGantt';
import { DowntimeParetoChart } from './DowntimeParetoChart';
import { DowntimeReasonModal } from './DowntimeReasonModal';
import { OeeLineConfigModal } from './OeeLineConfigModal';

interface OeeStudioViewProps {
  onBack: () => void;
  latestValues?: Record<string, any>;
  onNavigateTo2dDashboard?: (dashboardId: string) => void;
}

export const OeeStudioView: React.FC<OeeStudioViewProps> = ({
  onBack,
  latestValues = {},
  onNavigateTo2dDashboard
}) => {
  // State: Lines, Shifts, Reasons
  const [lines, setLines] = useState<MachineLineConfig[]>(() => OeePersistence.loadLines());
  const [shifts] = useState<ShiftConfig[]>(() => OeePersistence.loadShifts());
  const [reasonCodes] = useState<DowntimeReasonCode[]>(() => OeePersistence.loadReasons());

  const [activeLineId, setActiveLineId] = useState<string>(() => OeePersistence.getActiveLineId());
  const [activeShiftCode, setActiveShiftCode] = useState<'SHIFT_A' | 'SHIFT_B' | 'SHIFT_C'>('SHIFT_A');

  // Active Line State Tracking
  const [currentState, setCurrentState] = useState<MachineState>(MachineState.RUNNING);
  const [stateStartTime, setStateStartTime] = useState<number>(Date.now());
  const [events, setEvents] = useState<DowntimeEvent[]>(() => OeePersistence.loadEvents(activeLineId));

  // Modals State
  const [taggingEvent, setTaggingEvent] = useState<DowntimeEvent | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [editingLine, setEditingLine] = useState<MachineLineConfig | null>(null);

  // Available tag list from connected field drivers
  const availableTags = useMemo(() => Object.keys(latestValues), [latestValues]);

  // Counter Trackers
  const debounceFilter = useRef<StateDebounceFilter>(new StateDebounceFilter(3));

  // Find currently active line configuration
  const activeLine = useMemo(() => {
    return lines.find(l => l.id === activeLineId) || lines[0] || {
      id: 'line_default',
      name: 'Default Machine Line',
      code: 'LINE-01',
      department: 'Production',
      category: 'continuous',
      idealCycleTimeSec: 1.0,
      targetOeePct: 85.0,
      plannedShiftHours: 8,
      plannedDowntimeSec: 2700,
      microStopThresholdSec: 300,
      debounceDelaySec: 3,
      tags: {}
    };
  }, [lines, activeLineId]);

  // Handle active line switch
  const handleSelectLine = (id: string) => {
    setActiveLineId(id);
    OeePersistence.setActiveLineId(id);
    setEvents(OeePersistence.loadEvents(id));
  };

  const handleDeleteLine = (lineId: string) => {
    const updated = lines.filter(l => l.id !== lineId);
    if (updated.length === 0) {
      alert('You must have at least one production line.');
      return;
    }
    setLines(updated);
    OeePersistence.saveLines(updated);
    setActiveLineId(updated[0].id);
    OeePersistence.setActiveLineId(updated[0].id);
  };

  // Read Live Values from real field driver tags / MQTT bus
  const tags = activeLine.tags || {};
  const rawStatus = tags.statusTag && latestValues[tags.statusTag] !== undefined
    ? latestValues[tags.statusTag]?.val
    : (tags.statusTag ? 0 : 1);

  const rawTotal = tags.totalCountTag && latestValues[tags.totalCountTag] !== undefined
    ? Number(latestValues[tags.totalCountTag]?.val || 0)
    : 0;

  const rawReject = tags.rejectCountTag && latestValues[tags.rejectCountTag] !== undefined
    ? Number(latestValues[tags.rejectCountTag]?.val || 0)
    : 0;

  const liveSpeed = tags.speedTag && latestValues[tags.speedTag] !== undefined
    ? Number(latestValues[tags.speedTag]?.val || 0)
    : 0;

  // Process Counters
  const totalProduced = typeof rawTotal === 'number' && !isNaN(rawTotal) ? rawTotal : 0;
  const rejectProduced = typeof rawReject === 'number' && !isNaN(rawReject) ? rawReject : 0;

  // Evaluate raw target state
  const rawTargetState = rawStatus === 1 || rawStatus === true
    ? MachineState.RUNNING
    : MachineState.UNPLANNED_BREAKDOWN;

  // Debounce State Transition
  useEffect(() => {
    const nextState = debounceFilter.current.process(rawTargetState);
    if (nextState !== currentState) {
      // Complete previous state event if it was downtime
      if (currentState !== MachineState.RUNNING) {
        const now = Date.now();
        const durationSec = Math.max(1, Math.round((now - stateStartTime) / 1000));
        const newEvt: DowntimeEvent = {
          id: `evt_${Date.now()}_${activeLineId}`,
          lineId: activeLineId,
          state: currentState,
          startTime: stateStartTime,
          endTime: now,
          durationSec,
          category: currentState === MachineState.CHANGEOVER ? DowntimeCategory.CHANGEOVER_SETUP : DowntimeCategory.MECHANICAL,
          reasonText: currentState === MachineState.CHANGEOVER ? 'Tooling Changeover' : 'Unplanned Stoppage',
          shiftId: activeShiftCode,
          isPlanned: currentState === MachineState.PLANNED_MAINTENANCE || currentState === MachineState.CHANGEOVER
        };
        OeePersistence.saveEvent(newEvt);
        setEvents(prev => [...prev, newEvt]);
      }
      setCurrentState(nextState);
      setStateStartTime(Date.now());
    }
  }, [rawTargetState, currentState, stateStartTime, activeLineId, activeShiftCode]);

  // Compute Active Shift OEE Metrics
  const plannedShiftSec = activeLine.plannedShiftHours * 3600;
  const plannedDowntimeSec = activeLine.plannedDowntimeSec;

  const unplannedDowntimeSec = useMemo(() => {
    const historicalUnplanned = events
      .filter(e => !e.isPlanned)
      .reduce((sum, e) => sum + e.durationSec, 0);
    const activeUnplanned = currentState === MachineState.UNPLANNED_BREAKDOWN
      ? Math.round((Date.now() - stateStartTime) / 1000)
      : 0;
    return historicalUnplanned + activeUnplanned;
  }, [events, currentState, stateStartTime]);

  const microStopsSec = useMemo(() => {
    return events
      .filter(e => e.state === MachineState.IDLE_MICRO_STOP)
      .reduce((sum, e) => sum + e.durationSec, 0);
  }, [events]);

  const oeeMetrics = useMemo(() => {
    return OeeCalculationEngine.calculateOee(
      activeLine,
      plannedShiftSec,
      unplannedDowntimeSec,
      plannedDowntimeSec,
      microStopsSec,
      totalProduced,
      rejectProduced
    );
  }, [activeLine, plannedShiftSec, unplannedDowntimeSec, plannedDowntimeSec, microStopsSec, totalProduced, rejectProduced]);

  // Six Big Losses Breakdown & Pareto Data
  const sixBigLosses = useMemo(() => {
    return OeeCalculationEngine.calculateSixBigLosses(events, oeeMetrics, activeLine.idealCycleTimeSec);
  }, [events, oeeMetrics, activeLine.idealCycleTimeSec]);

  const paretoData = useMemo(() => {
    return OeeCalculationEngine.getParetoLosses(events);
  }, [events]);

  // State Badge Helpers
  const getStateBadge = () => {
    switch (currentState) {
      case MachineState.RUNNING:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            PRODUCING (RUNNING)
          </span>
        );
      case MachineState.IDLE_MICRO_STOP:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            IDLE / MICRO-STOP
          </span>
        );
      case MachineState.UNPLANNED_BREAKDOWN:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
            UNPLANNED BREAKDOWN
          </span>
        );
      case MachineState.CHANGEOVER:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            CHANGEOVER & SETUP
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            MAINTENANCE
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar select-none">
      {/* Top Header */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 sticky top-0 z-30 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <i className="fas fa-arrow-left text-[11px]"></i>
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <i className="fas fa-gauge text-sm"></i>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                OEE & Downtime Intelligence Studio
              </h1>
              <p className="text-[11px] text-slate-400">
                Real-Time Overall Equipment Effectiveness & TPM Six Big Losses
              </p>
            </div>
          </div>
        </div>

        {/* Center: Line Selector with + Add Line & Shift Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Line Picker */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1">
            <i className="fas fa-industry text-sky-400 text-xs"></i>
            <select
              value={activeLineId}
              onChange={e => handleSelectLine(e.target.value)}
              className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
            >
              {lines.map(l => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingLine(null);
              setIsConfigModalOpen(true);
            }}
            className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            title="Create Custom Machine Line"
          >
            <i className="fas fa-plus text-[10px]"></i>
            <span>Add Line</span>
          </button>

          {/* Shift Picker */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg p-0.5">
            {shifts.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveShiftCode(s.code)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeShiftCode === s.code
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.name.split(' ')[0]} {s.name.split(' ')[1]}
              </button>
            ))}
          </div>

          {/* Live Status Pill */}
          {getStateBadge()}
        </div>

        {/* Right: Line Settings */}
        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={() => {
              setEditingLine(activeLine);
              setIsConfigModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <i className="fas fa-cog text-[11px]"></i>
            <span>Line Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-4 max-w-[1600px] mx-auto w-full">
        {/* Real Field PLC & MQTT Tag Status Strip */}
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Active Field Tag Bindings:
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Status: <strong className="text-cyan-300">{tags.statusTag || 'Not Assigned'}</strong> | Total: <strong className="text-cyan-300">{tags.totalCountTag || 'Not Assigned'}</strong> | Rejects: <strong className="text-cyan-300">{tags.rejectCountTag || 'Not Assigned'}</strong> | Speed: <strong className="text-cyan-300">{tags.speedTag || 'Not Assigned'}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingLine(activeLine);
              setIsConfigModalOpen(true);
            }}
            className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <i className="fas fa-pen-to-square"></i> Modify Tag Map / Machine
          </button>
        </div>

        {/* Top KPI Grid: 4 Donut Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OeeDonutGauge
            value={oeeMetrics.oeePct}
            label="Overall OEE"
            subLabel="World-Class Benchmark"
            target={activeLine.targetOeePct}
            isPrimary={true}
            size={155}
          />
          <OeeDonutGauge
            value={oeeMetrics.availabilityPct}
            label="Availability (A)"
            subLabel={`${(oeeMetrics.operatingTimeSec / 3600).toFixed(1)}h / ${(oeeMetrics.plannedProductionTimeSec / 3600).toFixed(1)}h Planned`}
            target={90}
            size={140}
          />
          <OeeDonutGauge
            value={oeeMetrics.performancePct}
            label="Performance (P)"
            subLabel={`Run Rate: ${oeeMetrics.actualRunRatePpm} / ${oeeMetrics.targetRunRatePpm} Target PPM`}
            target={95}
            size={140}
          />
          <OeeDonutGauge
            value={oeeMetrics.qualityPct}
            label="Quality (Q)"
            subLabel={`${oeeMetrics.goodCount.toLocaleString()} Good / ${oeeMetrics.totalCount.toLocaleString()} Total`}
            target={99}
            size={140}
          />
        </div>

        {/* Real-time Production Counters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Total Produced</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {oeeMetrics.totalCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Units</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Good Yield</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {oeeMetrics.goodCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-500 font-mono font-semibold">
              {oeeMetrics.qualityPct.toFixed(1)}% Yield
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Rejects & Scrap</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
              {oeeMetrics.rejectCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-500 font-mono">
              {oeeMetrics.scrapRatePct.toFixed(2)}% Scrap Rate
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Live Run Rate</span>
            <span className="text-xl font-bold font-mono text-sky-400 mt-1 block">
              {liveSpeed || oeeMetrics.actualRunRatePpm}
            </span>
            <span className="text-[10px] text-sky-500 font-mono">Parts / Min</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Unplanned Downtime</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
              {Math.round(oeeMetrics.unplannedDowntimeSec / 60)} min
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {(oeeMetrics.unplannedDowntimeSec / 3600).toFixed(2)} Hours
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Planned Breaks</span>
            <span className="text-xl font-bold font-mono text-slate-300 mt-1 block">
              {Math.round(oeeMetrics.plannedDowntimeSec / 60)} min
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Clean & Breaks</span>
          </div>
        </div>

        {/* 24-Hour Machine State Gantt Timeline Ribbon */}
        <MachineStateGantt
          events={events}
          currentState={currentState}
          stateStartTime={stateStartTime}
          totalDurationHours={activeLine.plannedShiftHours}
          onTagEvent={evt => setTaggingEvent(evt)}
        />

        {/* Pareto 80/20 Downtime Loss Chart & Six Big Losses Breakdown */}
        <DowntimeParetoChart
          paretoData={paretoData}
          losses={sixBigLosses}
        />

        {/* Shift A vs Shift B vs Shift C Benchmark Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="fas fa-trophy text-amber-400"></i>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Shift Performance & Benchmarking Comparison
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Active Shift: <strong className="text-sky-400">{activeShiftCode.replace('_', ' ')}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Shift Name</th>
                  <th className="py-2.5 px-3">Hours</th>
                  <th className="py-2.5 px-3">OEE %</th>
                  <th className="py-2.5 px-3">Availability</th>
                  <th className="py-2.5 px-3">Performance</th>
                  <th className="py-2.5 px-3">Quality</th>
                  <th className="py-2.5 px-3">Total Produced</th>
                  <th className="py-2.5 px-3">Downtime</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {/* Shift A */}
                <tr className={activeShiftCode === 'SHIFT_A' ? 'bg-sky-950/30 text-white font-bold' : 'hover:bg-slate-800/40'}>
                  <td className="py-2.5 px-3 flex items-center gap-2 font-sans font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Shift A (Morning)
                  </td>
                  <td className="py-2.5 px-3">06:00 - 14:00</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{oeeMetrics.oeePct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3">{oeeMetrics.availabilityPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3">{oeeMetrics.performancePct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3">{oeeMetrics.qualityPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3">{oeeMetrics.totalCount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-rose-400">{Math.round(oeeMetrics.unplannedDowntimeSec / 60)} min</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">In Progress</span>
                  </td>
                </tr>

                {/* Shift B */}
                <tr className={activeShiftCode === 'SHIFT_B' ? 'bg-sky-950/30 text-white font-bold' : 'hover:bg-slate-800/40'}>
                  <td className="py-2.5 px-3 flex items-center gap-2 font-sans font-semibold">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span> Shift B (Afternoon)
                  </td>
                  <td className="py-2.5 px-3">14:00 - 22:00</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">81.4%</td>
                  <td className="py-2.5 px-3">89.2%</td>
                  <td className="py-2.5 px-3">92.0%</td>
                  <td className="py-2.5 px-3">99.1%</td>
                  <td className="py-2.5 px-3">4,120</td>
                  <td className="py-2.5 px-3 text-rose-400">42 min</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">Scheduled</span>
                  </td>
                </tr>

                {/* Shift C */}
                <tr className={activeShiftCode === 'SHIFT_C' ? 'bg-sky-950/30 text-white font-bold' : 'hover:bg-slate-800/40'}>
                  <td className="py-2.5 px-3 flex items-center gap-2 font-sans font-semibold">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span> Shift C (Night)
                  </td>
                  <td className="py-2.5 px-3">22:00 - 06:00</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">84.2%</td>
                  <td className="py-2.5 px-3">92.1%</td>
                  <td className="py-2.5 px-3">92.5%</td>
                  <td className="py-2.5 px-3">98.8%</td>
                  <td className="py-2.5 px-3">4,380</td>
                  <td className="py-2.5 px-3 text-rose-400">30 min</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">Scheduled</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Operator Downtime Tagging Modal */}
      <DowntimeReasonModal
        isOpen={!!taggingEvent}
        event={taggingEvent}
        reasonCodes={reasonCodes}
        onClose={() => setTaggingEvent(null)}
        onSave={updated => {
          OeePersistence.saveEvent(updated);
          setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
        }}
      />

      {/* Line Configuration Modal */}
      <OeeLineConfigModal
        isOpen={isConfigModalOpen}
        line={editingLine}
        availableTags={availableTags}
        onClose={() => {
          setIsConfigModalOpen(false);
          setEditingLine(null);
        }}
        onSave={saved => {
          const updatedLines = lines.some(l => l.id === saved.id)
            ? lines.map(l => l.id === saved.id ? saved : l)
            : [...lines, saved];
          setLines(updatedLines);
          OeePersistence.saveLines(updatedLines);
          setActiveLineId(saved.id);
        }}
        onDelete={handleDeleteLine}
      />
    </div>
  );
};
