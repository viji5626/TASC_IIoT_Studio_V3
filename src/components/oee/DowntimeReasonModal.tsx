import React, { useState } from 'react';
import { DowntimeEvent, DowntimeCategory, DowntimeReasonCode } from '../../types/production';

interface DowntimeReasonModalProps {
  isOpen: boolean;
  event: DowntimeEvent | null;
  reasonCodes: DowntimeReasonCode[];
  onClose: () => void;
  onSave: (updatedEvent: DowntimeEvent) => void;
}

export const DowntimeReasonModal: React.FC<DowntimeReasonModalProps> = ({
  isOpen,
  event,
  reasonCodes,
  onClose,
  onSave
}) => {
  if (!isOpen || !event) return null;

  const [selectedCategory, setSelectedCategory] = useState<DowntimeCategory>(event.category || DowntimeCategory.MECHANICAL);
  const [selectedReasonId, setSelectedReasonId] = useState<string>(event.reasonCodeId || '');
  const [customNotes, setCustomNotes] = useState<string>(event.notes || '');
  const [operatorName, setOperatorName] = useState<string>(event.operatorName || 'Line Supervisor');

  const filteredReasons = reasonCodes.filter(r => r.category === selectedCategory);

  const handleSave = () => {
    const matchedReason = reasonCodes.find(r => r.id === selectedReasonId);
    const updated: DowntimeEvent = {
      ...event,
      category: selectedCategory,
      reasonCodeId: selectedReasonId,
      reasonText: matchedReason ? matchedReason.name : (customNotes || 'Custom Operator Log'),
      operatorName,
      notes: customNotes,
      isPlanned: matchedReason ? matchedReason.isPlanned : false
    };
    onSave(updated);
    onClose();
  };

  const categories = Object.values(DowntimeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <i className="fas fa-tag text-sm"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Tag Downtime Root Cause</h3>
              <p className="text-[11px] text-slate-400">
                Duration: {Math.round(event.durationSec / 60)} min ({event.durationSec}s) • Started {new Date(event.startTime).toLocaleTimeString()}
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-300 overflow-y-auto max-h-[70vh]">
          {/* Category Selector */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5 uppercase text-[10px] tracking-wider">
              1. Root Cause Category
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedReasonId('');
                  }}
                  className={`p-2 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between border ${
                    selectedCategory === cat
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{cat.replace('_', ' ')}</span>
                  {selectedCategory === cat && <i className="fas fa-check text-[10px] text-sky-400"></i>}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Code Picker */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5 uppercase text-[10px] tracking-wider">
              2. Standard Reason Code
            </label>
            <select
              value={selectedReasonId}
              onChange={e => setSelectedReasonId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">-- Select Specific Reason --</option>
              {filteredReasons.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.id}] {r.name} {r.isPlanned ? '(Planned)' : '(Unplanned)'}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Name */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5 uppercase text-[10px] tracking-wider">
              3. Operator / Supervisor
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              placeholder="Enter operator name or ID"
            />
          </div>

          {/* Corrective Action Notes */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5 uppercase text-[10px] tracking-wider">
              4. Corrective Action & Root Cause Notes
            </label>
            <textarea
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 placeholder-slate-500"
              placeholder="e.g. Cleared jammed bottle in starwheel guide, replaced worn belt."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
          >
            <i className="fas fa-save"></i> Save Downtime Log
          </button>
        </div>
      </div>
    </div>
  );
};
