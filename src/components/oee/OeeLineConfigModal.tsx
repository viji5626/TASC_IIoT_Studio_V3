import React, { useState } from 'react';
import { MachineLineConfig } from '../../types/production';

interface OeeLineConfigModalProps {
  isOpen: boolean;
  line: MachineLineConfig | null;
  availableTags?: string[];
  onClose: () => void;
  onSave: (line: MachineLineConfig) => void;
  onDelete?: (lineId: string) => void;
}

export const OeeLineConfigModal: React.FC<OeeLineConfigModalProps> = ({
  isOpen,
  line,
  availableTags = [],
  onClose,
  onSave,
  onDelete
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(line?.name || '');
  const [code, setCode] = useState(line?.code || '');
  const [department, setDepartment] = useState(line?.department || 'Packaging & Assembly');
  const [category, setCategory] = useState<'discrete' | 'continuous' | 'batch'>(line?.category || 'continuous');
  const [idealCycleTimeSec, setIdealCycleTimeSec] = useState(line?.idealCycleTimeSec || 0.5);
  const [targetOeePct, setTargetOeePct] = useState(line?.targetOeePct || 85.0);
  const [plannedDowntimeMinutes, setPlannedDowntimeMinutes] = useState(Math.round((line?.plannedDowntimeSec || 2700) / 60));

  // Tag Mappings
  const [statusTag, setStatusTag] = useState(line?.tags.statusTag || '');
  const [speedTag, setSpeedTag] = useState(line?.tags.speedTag || '');
  const [totalCountTag, setTotalCountTag] = useState(line?.tags.totalCountTag || '');
  const [rejectCountTag, setRejectCountTag] = useState(line?.tags.rejectCountTag || '');
  const [faultCodeTag, setFaultCodeTag] = useState(line?.tags.faultCodeTag || '');

  const handleSave = () => {
    const updated: MachineLineConfig = {
      id: line?.id || `line_${Date.now()}`,
      name: name.trim() || 'Custom Machine Line',
      code: code.trim() || 'CUSTOM-LINE-01',
      department,
      category,
      idealCycleTimeSec: Number(idealCycleTimeSec) || 1.0,
      targetOeePct: Number(targetOeePct) || 85.0,
      plannedShiftHours: 8,
      plannedDowntimeSec: Number(plannedDowntimeMinutes) * 60,
      microStopThresholdSec: 300,
      debounceDelaySec: 3,
      tags: {
        statusTag: statusTag.trim() || undefined,
        speedTag: speedTag.trim() || undefined,
        totalCountTag: totalCountTag.trim() || undefined,
        rejectCountTag: rejectCountTag.trim() || undefined,
        faultCodeTag: faultCodeTag.trim() || undefined
      }
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (!line || !onDelete) return;
    if (window.confirm(`Are you sure you want to delete the line "${line.name}"?`)) {
      onDelete(line.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <i className="fas fa-industry text-sm"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {line ? `Configure Machine: ${line.name}` : 'Create New Custom Machine Line'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Setup machine name, ideal cycle speed, and bind live PLC / MQTT raw tags
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs text-slate-300 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* General Line Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-200 mb-1">Machine / Line Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Injection Molding Line #4"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-200 mb-1">Asset Tag / Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. INJ-MOLD-04"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-200 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Molding & Assembly"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-200 mb-1">Process Type</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="continuous">Continuous (Bottling, Filling, Extrusion)</option>
                <option value="discrete">Discrete (CNC, Stamping, Assembly)</option>
                <option value="batch">Batch (Reactors, Blending, Cooking)</option>
              </select>
            </div>
          </div>

          {/* Operational Benchmarks */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-sky-400 text-[11px] uppercase tracking-wider">
              Speed & Shift Benchmarks
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Ideal Cycle Time (s)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={idealCycleTimeSec}
                  onChange={e => setIdealCycleTimeSec(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Rated secs per unit</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Target OEE %</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={targetOeePct}
                  onChange={e => setTargetOeePct(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Target benchmark</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-0.5">Planned Breaks (min)</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  value={plannedDowntimeMinutes}
                  onChange={e => setPlannedDowntimeMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono"
                />
                <span className="text-[9px] text-slate-500">Per 8hr shift</span>
              </div>
            </div>
          </div>

          {/* PLC & MQTT Live Tag Bindings */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">
                Raw Field Tag Bindings
              </h4>
              <span className="text-[10px] text-slate-500">Siemens S7, Modbus TCP, AB, MQTT</span>
            </div>

            <datalist id="oee-available-tags">
              {availableTags.map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Machine Running Bit (Status Tag)
              </label>
              <input
                type="text"
                list="oee-available-tags"
                value={statusTag}
                onChange={e => setStatusTag(e.target.value)}
                placeholder="e.g. DB1.DBX0.0 or Modbus Coil 00001 or PLC_Line_Running"
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-300 font-mono text-xs"
              />
              <span className="text-[10px] text-slate-500">1 = Running / Producing, 0 = Stopped</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Total Counter Tag (Cumulative)
                </label>
                <input
                  type="text"
                  list="oee-available-tags"
                  value={totalCountTag}
                  onChange={e => setTotalCountTag(e.target.value)}
                  placeholder="e.g. DB1.DBD4 or Reg 40010"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Rejects / Scrap Counter Tag
                </label>
                <input
                  type="text"
                  list="oee-available-tags"
                  value={rejectCountTag}
                  onChange={e => setRejectCountTag(e.target.value)}
                  placeholder="e.g. DB1.DBD8 or Reg 40012"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-300 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Live Speed (PPM or CPM)
                </label>
                <input
                  type="text"
                  list="oee-available-tags"
                  value={speedTag}
                  onChange={e => setSpeedTag(e.target.value)}
                  placeholder="e.g. DB1.DBD12 or Reg 40014"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Fault / Error Code Tag
                </label>
                <input
                  type="text"
                  list="oee-available-tags"
                  value={faultCodeTag}
                  onChange={e => setFaultCodeTag(e.target.value)}
                  placeholder="e.g. DB1.DBW16 or Reg 40016"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-cyan-300 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          {line && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <i className="fas fa-trash"></i> Delete Line
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-md transition-all"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
