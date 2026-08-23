import React from 'react';
import { BatchRecord } from '../../types/traceability';

interface GenealogyTreeViewerProps {
  batch: BatchRecord;
  onSelectSerial?: (serial: string) => void;
  onSelectLot?: (lotNumber: string) => void;
}

export const GenealogyTreeViewer: React.FC<GenealogyTreeViewerProps> = ({
  batch,
  onSelectSerial,
  onSelectLot
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fas fa-network-wired text-sky-400"></i>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            End-to-End Material Genealogy & Process Tree
          </h3>
        </div>
        <span className="text-[10px] bg-sky-950/60 border border-sky-500/30 text-sky-300 px-2 py-0.5 rounded-full font-mono">
          Batch: {batch.batchNumber}
        </span>
      </div>

      {/* 4-Stage Horizontal Genealogy Flow */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Stage 1: Inward Raw Material Lots */}
        <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> 1. Inward Raw Materials
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
              {batch.rawMaterials.length} Lots
            </span>
          </div>

          <div className="space-y-2">
            {batch.rawMaterials.map(rm => (
              <div
                key={rm.id}
                onClick={() => onSelectLot && onSelectLot(rm.lotNumber)}
                className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-sky-500 transition-all cursor-pointer group text-xs"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-sky-300 group-hover:underline">
                    {rm.lotNumber}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Grade {rm.qualityGrade}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 truncate mt-0.5">{rm.materialName}</p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                  <span>{rm.quantityUsed} {rm.unit}</span>
                  <span className="truncate max-w-[100px] text-slate-500">{rm.supplierName.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 2: WIP Processing & Reaction */}
        <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> 2. WIP Execution
            </span>
            <span className="text-[9px] bg-emerald-950/60 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
              {batch.yieldPercentage}% Yield
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Recipe Profile</span>
              <span className="font-bold text-white text-xs">{batch.recipeName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Equipment Line</span>
              <span className="text-slate-200 text-xs">{batch.lineName}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-slate-800">
              <div>
                <span className="text-slate-500 block text-[9px]">Target</span>
                <span className="text-slate-200 font-bold">{batch.targetQuantity} {batch.unit}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Actual Output</span>
                <span className="text-emerald-400 font-bold">{batch.actualQuantity} {batch.unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 3: In-Line Quality & Process Parameters */}
        <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> 3. Parameter Controls
            </span>
            <span className="text-[9px] bg-sky-950 text-sky-300 px-1.5 py-0.2 rounded font-mono">
              {batch.parameters.length} CPPs
            </span>
          </div>

          <div className="space-y-1.5">
            {batch.parameters.map(p => (
              <div key={p.id} className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[11px] text-slate-300 font-medium truncate">{p.name}</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {p.currentValue} {p.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                  <span>Setpoint: {p.setpoint}</span>
                  <span>Limit: {p.minLimit} - {p.maxLimit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 4: Finished Goods Serial Numbers */}
        <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 4. Finished Goods
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
              {batch.finishedSerials.length} Sample Serials
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
            {batch.finishedSerials.map(s => (
              <div
                key={s.serialNumber}
                onClick={() => onSelectSerial && onSelectSerial(s.serialNumber)}
                className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-emerald-500 transition-all cursor-pointer group flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-qrcode text-sky-400 text-[10px]"></i>
                  <span className="text-slate-200 group-hover:text-emerald-300 font-semibold text-[11px]">
                    {s.serialNumber}
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {s.inspectionResult}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
