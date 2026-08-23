import React from 'react';

interface OeeDonutGaugeProps {
  value: number; // 0 to 100
  label: string;
  subLabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  target?: number; // Benchmark target e.g. 85%
  isPrimary?: boolean;
}

export const OeeDonutGauge: React.FC<OeeDonutGaugeProps> = ({
  value,
  label,
  subLabel,
  size = 140,
  strokeWidth = 12,
  color,
  target = 85,
  isPrimary = false
}) => {
  const safeVal = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeVal / 100) * circumference;

  // Dynamic color coding based on OEE thresholds
  const getColor = () => {
    if (color) return color;
    if (safeVal >= target) return '#10b981'; // Emerald (World class)
    if (safeVal >= 65) return '#f59e0b';    // Amber (Fair)
    return '#ef4444';                      // Red (Needs attention)
  };

  const ringColor = getColor();

  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
      isPrimary 
        ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-sky-500/30 shadow-lg shadow-sky-950/30' 
        : 'bg-slate-900/60 border border-slate-800/80'
    }`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Value Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-mono font-bold tracking-tight ${isPrimary ? 'text-2xl text-white' : 'text-lg text-slate-100'}`}>
            {safeVal.toFixed(1)}%
          </span>
          {target && (
            <span className="text-[10px] text-slate-400 font-mono">
              Target: {target}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className={`font-semibold tracking-wide block ${isPrimary ? 'text-sm text-sky-300 uppercase' : 'text-xs text-slate-300'}`}>
          {label}
        </span>
        {subLabel && (
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
