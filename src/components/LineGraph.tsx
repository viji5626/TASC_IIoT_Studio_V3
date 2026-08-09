import React, { useState, useMemo } from 'react';

interface DataPoint {
  value: number;
  time: string;
}

interface LineGraphProps {
  history: DataPoint[];
  unit?: string;
  color?: string;
  penThickness?: number;
  graphType?: 'line' | 'bar' | 'hbar' | 'area';
  showGrid?: boolean;
  fillArea?: boolean;
  payloadMin?: number;
  payloadMax?: number;
  height?: number;
  isCompact?: boolean;
}

const LineGraph: React.FC<LineGraphProps> = ({ 
  history = [], 
  unit = '', 
  color = '#38bdf8',
  penThickness = 2.5,
  graphType = 'line',
  showGrid = true,
  fillArea = true,
  payloadMin,
  payloadMax,
  height = 90,
  isCompact = false
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [frozenHistory, setFrozenHistory] = useState<DataPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // Toggle pause/resume stream
  const handleTogglePause = () => {
    if (!isPaused) {
      setFrozenHistory([...history]);
    }
    setIsPaused(!isPaused);
  };

  const activeHistory = isPaused ? frozenHistory : history;

  const points = useMemo(() => {
    if (!activeHistory || activeHistory.length === 0) return [];
    return activeHistory.slice(-25); // Keep up to last 25 points
  }, [activeHistory]);

  const { pathD, areaD, minVal, maxVal, lastVal, coords } = useMemo(() => {
    if (points.length === 0) {
      return { pathD: '', areaD: '', minVal: 0, maxVal: 100, lastVal: 0, coords: [] };
    }

    const values = points.map(p => p.value);
    let min = payloadMin !== undefined ? payloadMin : Math.min(...values);
    let max = payloadMax !== undefined ? payloadMax : Math.max(...values);
    if (min === max) {
      min -= 5;
      max += 5;
    }
    const range = max - min || 1;

    const width = 200;
    const h = 60;
    const padding = 5;

    const calculatedCoords = points.map((p, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * (width - 2 * padding) + padding;
      const normalized = Math.max(0, Math.min(1, (p.value - min) / range));
      const y = h - padding - normalized * (h - 2 * padding);
      return { x, y, value: p.value, time: p.time };
    });

    const path = calculatedCoords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const firstX = calculatedCoords[0]?.x || 0;
    const lastX = calculatedCoords[calculatedCoords.length - 1]?.x || width;
    const area = `${path} L ${lastX} ${h} L ${firstX} ${h} Z`;

    return {
      pathD: path,
      areaD: area,
      minVal: min,
      maxVal: max,
      lastVal: points[points.length - 1].value,
      coords: calculatedCoords
    };
  }, [points, payloadMin, payloadMax]);

  const renderContent = () => {
    if (points.length === 0) {
      return (
        <div className="w-full h-24 flex flex-col items-center justify-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <i className="fas fa-chart-line text-lg mb-1 opacity-40"></i>
          <span>Waiting for telemetry stream...</span>
        </div>
      );
    }

    if (graphType === 'hbar') {
      // Horizontal Bar Graph (H Graph)
      const normalizedRatio = Math.max(0, Math.min(1, (lastVal - minVal) / ((maxVal - minVal) || 1)));
      return (
        <div className="w-full flex flex-col justify-center space-y-2 py-2">
          <div className="flex justify-between text-[11px] font-mono text-slate-300">
            <span>0%</span>
            <span className="font-bold" style={{ color }}>{lastVal} {unit}</span>
            <span>100%</span>
          </div>
          <div className="w-full h-6 bg-slate-950 rounded-lg p-1 border border-slate-800 relative overflow-hidden flex items-center">
            <div 
              className="h-full rounded transition-all duration-300 shadow-md"
              style={{ width: `${normalizedRatio * 100}%`, backgroundColor: color }}
            ></div>
          </div>
        </div>
      );
    }

    if (graphType === 'bar') {
      // Vertical Bar Graph
      return (
        <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
          <svg viewBox="0 0 200 65" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {showGrid && (
              <>
                <line x1="0" y1="15" x2="200" y2="15" stroke="#ffffff15" strokeDasharray="2 2" />
                <line x1="0" y1="35" x2="200" y2="35" stroke="#ffffff15" strokeDasharray="2 2" />
                <line x1="0" y1="55" x2="200" y2="55" stroke="#ffffff15" strokeDasharray="2 2" />
              </>
            )}
            {coords.map((c, i) => {
              const barWidth = Math.max(3, 160 / coords.length);
              const barHeight = Math.max(2, 60 - c.y);
              return (
                <rect
                  key={i}
                  x={c.x - barWidth / 2}
                  y={c.y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx="1"
                  className="transition-all duration-200 cursor-pointer hover:opacity-80"
                  onMouseEnter={() => setHoveredPoint({ value: c.value, time: c.time })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>
        </div>
      );
    }

    // Line Graph / Area Chart
    return (
      <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg viewBox="0 0 200 65" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid && (
            <>
              <line x1="0" y1="15" x2="200" y2="15" stroke="#ffffff15" strokeDasharray="3 3" />
              <line x1="0" y1="35" x2="200" y2="35" stroke="#ffffff15" strokeDasharray="3 3" />
              <line x1="0" y1="55" x2="200" y2="55" stroke="#ffffff15" strokeDasharray="3 3" />
            </>
          )}

          {/* Area Fill */}
          {(fillArea || graphType === 'area') && (
            <path d={areaD} fill={`url(#gradient-${color.replace('#', '')})`} />
          )}

          {/* Line Path */}
          <path 
            d={pathD} 
            fill="none" 
            stroke={color} 
            strokeWidth={penThickness} 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="transition-all duration-300 ease-in-out" 
          />

          {/* Interactive Data Point Dots */}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={penThickness + 1}
              fill={color}
              stroke="#0f172a"
              strokeWidth="1.5"
              className="cursor-pointer hover:scale-150 transition-transform"
              onMouseEnter={() => setHoveredPoint({ value: c.value, time: c.time })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col space-y-1">
      {/* Top Controls & Status Header */}
      <div className="flex justify-between items-center text-xs px-1">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleTogglePause}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 border transition-all ${
              isPaused 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title={isPaused ? "Resume telemetry stream" : "Pause & inspect history"}
          >
            <i className={`fas ${isPaused ? 'fa-play text-amber-400' : 'fa-pause'}`}></i>
            <span>{isPaused ? 'PAUSED' : 'PAUSE'}</span>
          </button>

          <span className="text-slate-400 font-mono text-[10px]">
            Min: <span className="text-slate-200">{minVal.toFixed(1)}</span> | Max: <span className="text-slate-200">{maxVal.toFixed(1)}</span>
          </span>
        </div>

        <span className="font-bold text-white digital-font text-sm flex items-center space-x-1">
          <span style={{ color }}>{hoveredPoint ? hoveredPoint.value.toFixed(1) : lastVal.toFixed(1)}</span>
          <span className="text-[10px] text-sky-400">{unit}</span>
        </span>
      </div>

      {/* Hover Tooltip display */}
      {hoveredPoint && (
        <div className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded flex items-center justify-between">
          <span>Inspect: {hoveredPoint.value} {unit}</span>
          <span className="text-slate-400">{hoveredPoint.time}</span>
        </div>
      )}

      {/* Main Chart Canvas */}
      {renderContent()}
    </div>
  );
};

export default LineGraph;
