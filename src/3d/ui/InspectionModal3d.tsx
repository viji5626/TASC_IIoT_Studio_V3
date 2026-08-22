import React from 'react';
import { Scada3dObject } from '../types/scene';

interface InspectionModal3dProps {
  object: Scada3dObject | null;
  onClose: () => void;
  onJumpTo2dScreen?: (dashboardId: string) => void;
  latestValues?: Record<string, { val: any; time?: string }>;
}

export const InspectionModal3d: React.FC<InspectionModal3dProps> = ({
  object,
  onClose,
  onJumpTo2dScreen,
  latestValues = {}
}) => {
  if (!object) return null;

  return (
    <div 
      className="absolute bottom-6 right-6 w-84 bg-slate-900/98 border border-sky-500/40 rounded-xl shadow-2xl p-4 text-xs select-none z-30 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              {object.id}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">ONLINE</span>
          </div>
          <h3 className="font-bold text-slate-100 text-sm mt-1">{object.name}</h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <i className="fas fa-xmark text-sm"></i>
        </button>
      </div>

      {/* Telemetry Metrics */}
      <div className="space-y-2 mb-3.5">
        {object.bindings && object.bindings.length > 0 ? (
          object.bindings.map((b, idx) => {
            const key = b.dataSourceMode === 'driver' ? b.driverTagId : b.topic;
            const entry = key ? latestValues[key] : undefined;
            const val = entry !== undefined ? entry.val : '--';

            return (
              <div key={b.id || idx} className="flex items-center justify-between p-2 bg-slate-950/80 rounded-lg border border-slate-800/80">
                <div>
                  <span className="font-bold text-slate-300 capitalize text-xs block">
                    {b.property.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px] block">
                    {key || 'No Tag'}
                  </span>
                </div>
                <div className="text-right font-mono font-bold text-sky-300 text-sm">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  {b.unit ? <span className="text-xs text-slate-400 ml-1">{b.unit}</span> : ''}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-3 text-center text-slate-500 italic bg-slate-950/60 rounded-lg">
            No live SCADA tag bindings configured for this equipment.
          </div>
        )}
      </div>

      {/* Description */}
      {object.equipmentDescription && (
        <p className="text-[11px] text-slate-400 mb-3 bg-slate-950/40 p-2 rounded border border-slate-800/50 leading-relaxed">
          {object.equipmentDescription}
        </p>
      )}

      {/* Jump to 2D Screen */}
      {object.linkedDashboardId && onJumpTo2dScreen && (
        <button
          type="button"
          onClick={() => onJumpTo2dScreen(object.linkedDashboardId!)}
          className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <i className="fas fa-arrow-up-right-from-square text-xs"></i>
          <span>Open 2D Diagnostics Screen</span>
        </button>
      )}
    </div>
  );
};
