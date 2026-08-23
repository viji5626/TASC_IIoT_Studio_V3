import React, { useState } from 'react';
import { BatchProcessParameter } from '../../types/traceability';

interface BatchParameterHistorianProps {
  parameters: BatchProcessParameter[];
}

export const BatchParameterHistorian: React.FC<BatchParameterHistorianProps> = ({
  parameters
}) => {
  const [selectedParamId, setSelectedParamId] = useState<string>(parameters[0]?.id || '');
  const activeParam = parameters.find(p => p.id === selectedParamId) || parameters[0];

  if (!activeParam) return null;

  // Compute SVG coordinates for the telemetry points
  const history = activeParam.telemetryHistory || [];
  const svgWidth = 800;
  const svgHeight = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };

  const minVal = Math.min(activeParam.minLimit * 0.96, ...history.map(h => h.value));
  const maxVal = Math.max(activeParam.maxLimit * 1.04, ...history.map(h => h.value));
  const valRange = maxVal - minVal || 1;

  const getX = (index: number) => {
    if (history.length <= 1) return padding.left;
    return padding.left + (index / (history.length - 1)) * (svgWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    const norm = (val - minVal) / valRange;
    return svgHeight - padding.bottom - norm * (svgHeight - padding.top - padding.bottom);
  };

  const pointsString = history
    .map((h, i) => `${getX(i)},${getY(h.value)}`)
    .join(' ');

  const uslY = getY(activeParam.maxLimit);
  const lslY = getY(activeParam.minLimit);
  const setpointY = getY(activeParam.setpoint);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      {/* Header & Parameter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-line text-cyan-400"></i>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Critical Process Parameters (CPP) Historian Profile
          </h3>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {parameters.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedParamId(p.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                p.id === activeParam.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.name.split(' ')[0]} ({p.unit})
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block font-medium">Current Live Value</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {activeParam.currentValue} {activeParam.unit}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block font-medium">Recipe Target</span>
          <span className="text-base font-bold font-mono text-white">
            {activeParam.setpoint} {activeParam.unit}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block font-medium">Spec Limits (LSL / USL)</span>
          <span className="text-xs font-bold font-mono text-amber-300 mt-1 block">
            {activeParam.minLimit} - {activeParam.maxLimit} {activeParam.unit}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block font-medium">Batch Range (Min / Max)</span>
          <span className="text-xs font-bold font-mono text-slate-200 mt-1 block">
            {activeParam.minValue} - {activeParam.maxValue} {activeParam.unit}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-400 block font-medium">Out-of-Spec Violations</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {activeParam.oosViolationCount} OOS (100% In-Spec)
          </span>
        </div>
      </div>

      {/* SVG Multi-Layer Chart */}
      <div className="bg-slate-950/90 rounded-xl p-3 border border-slate-800/90 relative overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48">
          <defs>
            <linearGradient id="paramAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding.left} y1={padding.top} x2={svgWidth - padding.right} y2={padding.top} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padding.left} y1={svgHeight / 2} x2={svgWidth - padding.right} y2={svgHeight / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padding.left} y1={svgHeight - padding.bottom} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="#334155" />

          {/* Upper Spec Limit (USL) */}
          <line x1={padding.left} y1={uslY} x2={svgWidth - padding.right} y2={uslY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={svgWidth - padding.right + 4} y={uslY + 4} fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">
            USL {activeParam.maxLimit}
          </text>

          {/* Lower Spec Limit (LSL) */}
          <line x1={padding.left} y1={lslY} x2={svgWidth - padding.right} y2={lslY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={svgWidth - padding.right + 4} y={lslY + 4} fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">
            LSL {activeParam.minLimit}
          </text>

          {/* Setpoint Line */}
          <line x1={padding.left} y1={setpointY} x2={svgWidth - padding.right} y2={setpointY} stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
          <text x={padding.left - 45} y={setpointY + 3} fill="#38bdf8" fontSize="9" fontFamily="monospace">
            SP {activeParam.setpoint}
          </text>

          {/* Area under curve */}
          {history.length > 1 && (
            <polygon
              points={`${padding.left},${svgHeight - padding.bottom} ${pointsString} ${getX(history.length - 1)},${svgHeight - padding.bottom}`}
              fill="url(#paramAreaGrad)"
            />
          )}

          {/* Polyline Curve */}
          {history.length > 1 && (
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />
          )}

          {/* Data Points */}
          {history.map((h, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(h.value)}
              r="3.5"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* Legend Overlay */}
        <div className="flex items-center justify-end gap-4 text-[10px] font-mono text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-sky-400"></span> Process Value (PV)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-sky-300 border-dashed"></span> Setpoint (SP)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t border-rose-500 border-dashed"></span> Tolerance Limits (USL/LSL)
          </span>
        </div>
      </div>
    </div>
  );
};
