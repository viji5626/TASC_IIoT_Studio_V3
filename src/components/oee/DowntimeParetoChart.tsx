import React from 'react';
import { DowntimeCategory, SixBigLossesBreakdown } from '../../types/production';

interface ParetoItem {
  category: DowntimeCategory;
  totalSeconds: number;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

interface DowntimeParetoChartProps {
  paretoData: ParetoItem[];
  losses: SixBigLossesBreakdown;
  onSelectCategory?: (category: DowntimeCategory) => void;
}

export const DowntimeParetoChart: React.FC<DowntimeParetoChartProps> = ({
  paretoData,
  losses,
  onSelectCategory
}) => {
  const formatCategoryName = (cat: DowntimeCategory): string => {
    switch (cat) {
      case DowntimeCategory.MECHANICAL: return 'Mechanical Jam / Failure';
      case DowntimeCategory.ELECTRICAL: return 'Electrical & Sensor Faults';
      case DowntimeCategory.MATERIAL_SHORTAGE: return 'Raw Material Shortage';
      case DowntimeCategory.QUALITY_INSPECTION: return 'Quality / Sampling Delay';
      case DowntimeCategory.CHANGEOVER_SETUP: return 'Tooling Changeover';
      case DowntimeCategory.OPERATOR_BREAK: return 'Operator Breaks / Meetings';
      case DowntimeCategory.UTILITY_FAILURE: return 'Utility / Air Outage';
      default: return 'Unclassified Downtime';
    }
  };

  const formatHours = (sec: number) => {
    return (sec / 3600).toFixed(1) + ' hrs';
  };

  const maxSeconds = Math.max(1, ...paretoData.map(d => d.totalSeconds));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 80/20 Pareto Bar & Cumulative Chart */}
      <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-chart-column text-rose-400"></i>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Downtime Pareto 80/20 Loss Analysis
            </h3>
          </div>
          <span className="text-[10px] bg-rose-950/60 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-mono">
            Total Lost: {losses.totalLostHours} Hours
          </span>
        </div>

        {paretoData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 italic text-sm">
            No unplanned downtime recorded for this shift. Perfect operating continuity!
          </div>
        ) : (
          <div className="space-y-3">
            {paretoData.map(item => {
              const barWidth = Math.max(2, (item.totalSeconds / maxSeconds) * 100);
              const isEightyPct = item.cumulativePercentage <= 80;

              return (
                <div 
                  key={item.category}
                  onClick={() => onSelectCategory && onSelectCategory(item.category)}
                  className="group cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-medium text-slate-200 group-hover:text-sky-300 transition-colors flex items-center gap-1.5">
                      {formatCategoryName(item.category)}
                      {isEightyPct && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded">
                          Top 80% Loss
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-400">{formatHours(item.totalSeconds)}</span>
                      <span className="text-rose-400 font-bold">{item.percentage}%</span>
                      <span className="text-sky-400 text-[10px] w-12 text-right">({item.cumulativePercentage}%)</span>
                    </div>
                  </div>

                  {/* Horizontal Bar with Cumulative Line Dot */}
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex relative border border-slate-800">
                    <div 
                      style={{ width: `${barWidth}%` }}
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500 group-hover:brightness-110"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Six Big Losses Card Breakdown */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-sitemap text-amber-400"></i>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              TPM Six Big Losses Breakdown
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Unplanned Breakdowns */}
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">1. Unplanned Equipment Failure</span>
              <span className="font-mono text-rose-400 font-bold">{formatHours(losses.unplannedBreakdownsSec)}</span>
            </div>

            {/* 2. Setup & Adjustments */}
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">2. Setup & Tool Changeover</span>
              <span className="font-mono text-purple-400 font-bold">{formatHours(losses.setupAndAdjustmentsSec)}</span>
            </div>

            {/* 3. Small Stops & Idling */}
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">3. Idling & Minor Stops (&lt;5m)</span>
              <span className="font-mono text-amber-400 font-bold">{formatHours(losses.smallStopsAndIdlingSec)}</span>
            </div>

            {/* 4. Reduced Speed Loss */}
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">4. Reduced Operating Speed</span>
              <span className="font-mono text-orange-400 font-bold">{formatHours(losses.reducedSpeedLossSec)}</span>
            </div>

            {/* 5. Production Defects */}
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">5. In-Process Scrap & Defects</span>
              <span className="font-mono text-cyan-400 font-bold">{losses.productionRejectsCount} Parts</span>
            </div>

            {/* 6. Startup Scrap */}
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-300">6. Startup Yield Rejects</span>
              <span className="font-mono text-cyan-400 font-bold">{losses.startupRejectsCount} Parts</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Overall World-Class Benchmark:</span>
          <span className="font-mono font-bold text-emerald-400">&gt; 85.0% OEE</span>
        </div>
      </div>
    </div>
  );
};
