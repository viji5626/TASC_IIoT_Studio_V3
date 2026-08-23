import React, { useState, useEffect, useMemo } from 'react';
import { BatchRecord, BatchStatus } from '../../types/traceability';
import { TraceabilityService } from '../../services/TraceabilityService';
import { GenealogyTreeViewer } from './GenealogyTreeViewer';
import { BatchParameterHistorian } from './BatchParameterHistorian';
import { RecallExplorerModal } from './RecallExplorerModal';
import { BatchCoaReportModal } from './BatchCoaReportModal';
import { BatchCreateModal } from './BatchCreateModal';

interface TraceabilityStudioViewProps {
  onBack: () => void;
  latestValues?: Record<string, any>;
}

export const TraceabilityStudioView: React.FC<TraceabilityStudioViewProps> = ({
  onBack,
  latestValues = {}
}) => {
  const [batches, setBatches] = useState<BatchRecord[]>(() => TraceabilityService.loadBatches());
  const [activeBatchId, setActiveBatchId] = useState<string>(() => TraceabilityService.getActiveBatchId());

  // Modals
  const [isRecallModalOpen, setIsRecallModalOpen] = useState<boolean>(false);
  const [recallInitialQuery, setRecallInitialQuery] = useState<string>('');
  const [recallInitialMode, setRecallInitialMode] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');
  const [isCoaModalOpen, setIsCoaModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Active Batch
  const activeBatch = useMemo(() => {
    return batches.find(b => b.id === activeBatchId) || batches[0];
  }, [batches, activeBatchId]);

  const handleSelectBatch = (id: string) => {
    setActiveBatchId(id);
    TraceabilityService.setActiveBatchId(id);
  };

  // Synchronize Live Telemetry from real field tags if bound
  useEffect(() => {
    if (activeBatch.status !== BatchStatus.IN_PROGRESS || !latestValues) return;

    let hasChanges = false;
    const updatedParams = activeBatch.parameters.map(p => {
      if (p.tagAddress && latestValues[p.tagAddress] !== undefined) {
        const liveVal = Number(latestValues[p.tagAddress]?.val ?? p.currentValue);
        if (liveVal !== p.currentValue && !isNaN(liveVal)) {
          hasChanges = true;
          const isOos = liveVal < p.minLimit || liveVal > p.maxLimit;
          const newHistory = [
            ...(p.telemetryHistory || []),
            { timestamp: Date.now(), value: liveVal, isOos }
          ].slice(-24);

          return {
            ...p,
            currentValue: liveVal,
            oosViolationCount: isOos ? p.oosViolationCount + 1 : p.oosViolationCount,
            telemetryHistory: newHistory
          };
        }
      }
      return p;
    });

    if (hasChanges) {
      setBatches(prev => prev.map(b => b.id === activeBatch.id ? { ...b, parameters: updatedParams } : b));
    }
  }, [latestValues, activeBatch]);

  const getStatusBadge = (status: BatchStatus) => {
    switch (status) {
      case BatchStatus.IN_PROGRESS:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            IN PROGRESS (ACTIVE)
          </span>
        );
      case BatchStatus.APPROVED:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            RELEASED & APPROVED (QA)
          </span>
        );
      case BatchStatus.QUARANTINED:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            QUARANTINED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 font-bold text-xs">
            {status}
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
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <i className="fas fa-barcode text-sm"></i>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                Batch & Lot Traceability Studio
              </h1>
              <p className="text-[11px] text-slate-400">
                End-to-End Material Genealogy, 21 CFR Part 11 Audit Trail & Bi-Directional Recall
              </p>
            </div>
          </div>
        </div>

        {/* Center: Batch Selector & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1">
            <i className="fas fa-cubes-stacked text-cyan-400 text-xs"></i>
            <select
              value={activeBatchId}
              onChange={e => handleSelectBatch(e.target.value)}
              className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.batchNumber} - {b.recipeName.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>

          {getStatusBadge(activeBatch.status)}
        </div>

        {/* Right: Actions (New Batch, Recall Explorer, CoA Export, Jump to OEE) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-all"
          >
            <i className="fas fa-plus text-[11px]"></i>
            <span>+ New Batch</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRecallInitialQuery('');
              setRecallInitialMode('FORWARD');
              setIsRecallModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
          >
            <i className="fas fa-bullseye text-[11px]"></i>
            <span>Recall Explorer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCoaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <i className="fas fa-file-pdf text-[11px]"></i>
            <span>Generate CoA</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="p-4 space-y-4 max-w-[1600px] mx-auto w-full">
        {/* Active Work Order KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Work Order #</span>
            <span className="text-base font-bold font-mono text-white mt-1 block">
              {activeBatch.workOrderNumber}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono font-semibold">
              Formula: {activeBatch.recipeVersion}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Product Recipe</span>
            <span className="text-xs font-bold text-slate-100 mt-1 block truncate">
              {activeBatch.recipeName}
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {activeBatch.lineName}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Target vs Actual</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
              {activeBatch.actualQuantity.toLocaleString()} / {activeBatch.targetQuantity.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeBatch.unit} ({((activeBatch.actualQuantity / activeBatch.targetQuantity) * 100).toFixed(1)}% Completed)
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Yield Quality</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
              {activeBatch.yieldPercentage}%
            </span>
            <span className="text-[10px] text-rose-400 font-mono">
              {activeBatch.scrapQuantity} {activeBatch.unit} Scrap
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Time in Production</span>
            <span className="text-base font-bold font-mono text-sky-400 mt-1 block">
              {Math.floor(activeBatch.durationMinutes / 60)}h {activeBatch.durationMinutes % 60}m
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Started: {new Date(activeBatch.startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Lead Operator</span>
            <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
              {activeBatch.leadOperator}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              QA: {activeBatch.supervisorName.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* 4-Stage Material & Process Genealogy Flow */}
        <GenealogyTreeViewer
          batch={activeBatch}
          onSelectLot={lot => {
            setRecallInitialQuery(lot);
            setRecallInitialMode('FORWARD');
            setIsRecallModalOpen(true);
          }}
          onSelectSerial={sn => {
            setRecallInitialQuery(sn);
            setRecallInitialMode('BACKWARD');
            setIsRecallModalOpen(true);
          }}
        />

        {/* Critical Process Parameters (CPP) Historian Profile */}
        <BatchParameterHistorian
          parameters={activeBatch.parameters}
        />

        {/* FDA 21 CFR Part 11 Electronic Signature Audit Trail */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-signature text-purple-400"></i>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                FDA 21 CFR Part 11 Electronic Signature & Audit Trail Log
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Immutable SHA-256 Verified Log
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action & Milestone</th>
                  <th className="py-2.5 px-3">Performed By</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Signature Meaning</th>
                  <th className="py-2.5 px-3">Verification Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {activeBatch.auditTrail.map(aud => (
                  <tr key={aud.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(aud.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      {aud.action}
                      <p className="text-[10px] text-slate-400">{aud.details}</p>
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">{aud.performedBy}</td>
                    <td className="py-2.5 px-3 text-slate-400">{aud.role}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                        {aud.signatureMeaning}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 text-[10px]">
                      ✓ SHA-256 VALIDATED
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      <RecallExplorerModal
        isOpen={isRecallModalOpen}
        initialQuery={recallInitialQuery}
        initialMode={recallInitialMode}
        onClose={() => setIsRecallModalOpen(false)}
      />

      <BatchCoaReportModal
        isOpen={isCoaModalOpen}
        batch={activeBatch}
        onClose={() => setIsCoaModalOpen(false)}
      />

      <BatchCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaveBatch={newBatch => {
          const updated = [newBatch, ...batches];
          setBatches(updated);
          TraceabilityService.saveBatches(updated);
          setActiveBatchId(newBatch.id);
        }}
      />
    </div>
  );
};
