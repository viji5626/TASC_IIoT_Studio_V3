import React, { useState } from 'react';
import { TraceabilityService } from '../../services/TraceabilityService';
import { RecallSearchResult } from '../../types/traceability';

interface RecallExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialMode?: 'FORWARD' | 'BACKWARD';
}

export const RecallExplorerModal: React.FC<RecallExplorerModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialMode = 'FORWARD'
}) => {
  const [mode, setMode] = useState<'FORWARD' | 'BACKWARD'>(initialMode);
  const [query, setQuery] = useState<string>(initialQuery || (initialMode === 'FORWARD' ? 'LOT-API-9941' : 'SN-B088-1004'));
  const [forwardResults, setForwardResults] = useState<RecallSearchResult[]>([]);
  const [backwardResult, setBackwardResult] = useState<RecallSearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    if (mode === 'FORWARD') {
      const results = TraceabilityService.forwardRecall(query);
      setForwardResults(results);
      setBackwardResult(null);
    } else {
      const result = TraceabilityService.backwardRecall(query);
      setBackwardResult(result);
      setForwardResults([]);
    }
    setHasSearched(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <i className="fas fa-bullseye text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Bi-Directional Recall & Blast Radius Explorer</h2>
              <p className="text-[11px] text-slate-400">
                Forward Lot Contamination Trace & Backward Serial Genealogy Lookup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Search Controls */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('FORWARD');
                setQuery('LOT-API-9941');
                setHasSearched(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'FORWARD'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fas fa-arrow-right-from-bracket text-[10px]"></i>
              <span>Forward Recall (Supplier Lot → Finished Goods)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('BACKWARD');
                setQuery('SN-B088-1004');
                setHasSearched(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'BACKWARD'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fas fa-arrow-left-to-bracket text-[10px]"></i>
              <span>Backward Trace (Finished Serial / QR → Raw Materials)</span>
            </button>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleExecuteSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={
                  mode === 'FORWARD'
                    ? 'Enter Raw Material Lot # (e.g. LOT-API-9941, LOT-SUGAR-9941)'
                    : 'Enter Finished Good Serial # or QR Code (e.g. SN-B088-1004, SN-BEV-8801)'
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-search text-[10px]"></i>
              <span>Run Trace</span>
            </button>
          </form>
        </div>

        {/* Results Area */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {!hasSearched ? (
            <div className="py-12 text-center text-slate-500">
              <i className="fas fa-magnifying-glass-location text-3xl mb-2 text-slate-600"></i>
              <p className="text-xs">Enter a Lot # or Serial # above and click "Run Trace" to calculate genealogy and blast radius.</p>
            </div>
          ) : mode === 'FORWARD' ? (
            forwardResults.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                <i className="fas fa-circle-check text-2xl text-emerald-400 mb-2"></i>
                <p className="text-xs font-semibold">No Batches Found Consuming Lot "{query}"</p>
                <p className="text-[11px] text-slate-500">This raw material lot was not consumed in any recorded production batch.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400 animate-ping"></span>
                    <span className="text-xs font-bold text-rose-200">
                      Blast Radius Detected: {forwardResults.length} Production Batch(es) Affected
                    </span>
                  </div>
                  <span className="text-[11px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    Risk Level: {forwardResults[0].recallRiskLevel}
                  </span>
                </div>

                {forwardResults.map(res => (
                  <div key={res.matchedBatch.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <span className="font-mono font-bold text-sky-400 text-sm">{res.matchedBatch.batchNumber}</span>
                        <span className="text-xs text-slate-300 ml-2 font-medium">({res.matchedBatch.recipeName})</span>
                      </div>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {res.matchedBatch.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Work Order</span>
                        <span className="text-slate-200 font-bold">{res.matchedBatch.workOrderNumber}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Line</span>
                        <span className="text-slate-200 truncate block">{res.matchedBatch.lineName}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Total Output</span>
                        <span className="text-slate-200 font-bold">{res.matchedBatch.actualQuantity} {res.matchedBatch.unit}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-500 block">Affected Serials</span>
                        <span className="text-rose-400 font-bold">{res.affectedSerialsCount} Packaged Items</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Affected Serial Numbers for Immediate Quarantine
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                        {res.affectedSerials.map(sn => (
                          <span key={sn} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono">
                            {sn}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Backward Recall Results
            !backwardResult ? (
              <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                <i className="fas fa-triangle-exclamation text-2xl text-amber-400 mb-2"></i>
                <p className="text-xs font-semibold">No Finished Good Serial Found for "{query}"</p>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block">Customer Serial Found</span>
                    <span className="text-base font-mono font-bold text-emerald-400">{query}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    ✓ Verified Authentic Lot
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Batch & Recipe</span>
                    <span className="font-mono font-bold text-sky-400 text-xs block">{backwardResult.matchedBatch.batchNumber}</span>
                    <span className="text-slate-300 text-[11px] truncate block">{backwardResult.matchedBatch.recipeName}</span>
                  </div>

                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Manufacture Details</span>
                    <span className="text-slate-200 text-xs block font-bold">{backwardResult.matchedBatch.lineName}</span>
                    <span className="text-slate-400 text-[11px] font-mono block">
                      Lead: {backwardResult.matchedBatch.leadOperator}
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Quality Compliance</span>
                    <span className="text-emerald-400 font-mono font-bold text-xs block">
                      {backwardResult.matchedBatch.yieldPercentage}% Yield
                    </span>
                    <span className="text-slate-400 text-[11px] block">0 Out-of-Spec (OOS)</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
                    Original Supplier Raw Materials Ingested
                  </span>
                  <div className="space-y-1.5">
                    {backwardResult.rawMaterialsSummary.map((rm, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-medium">{rm.materialName}</span>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-sky-300 font-bold">{rm.lotNumber}</span>
                          <span className="text-slate-500">{rm.supplier}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
