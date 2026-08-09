import React, { useState } from 'react';

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClearAll: () => void;
  widgetCount: number;
  connectionCount: number;
  dashboardCount: number;
  editionName: string;
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({
  isOpen,
  onClose,
  onConfirmClearAll,
  widgetCount,
  connectionCount,
  dashboardCount,
  editionName,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    onConfirmClearAll();
    onClose();
    setConfirmText('');
    setHasConfirmedCheckbox(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden text-slate-100">
        {/* Glow Header Accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Title & Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-lg shrink-0">
              <i className="fas fa-trash-can"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">Clear All Configuration</h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                  {editionName}
                </span>
              </div>
              <p className="text-xs text-slate-400">Wipe all widgets & MQTT broker settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-rose-400 font-extrabold text-xs uppercase tracking-wider">
            <i className="fas fa-triangle-exclamation text-sm"></i>
            <span>Irreversible Action</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            This will permanently erase all widgets and MQTT broker configurations from this session. This action cannot be undone.
          </p>
        </div>

        {/* Breakdown of items to be cleared */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Items to be erased:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center space-y-1">
              <div className="text-xl font-black text-rose-400">{widgetCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Widgets</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center space-y-1">
              <div className="text-xl font-black text-amber-400">{connectionCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Brokers</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center space-y-1">
              <div className="text-xl font-black text-sky-400">{dashboardCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Dashboards</div>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start space-x-3 cursor-pointer bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
          <input
            type="checkbox"
            checked={hasConfirmedCheckbox}
            onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
            className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900 cursor-pointer"
          />
          <span className="text-xs text-slate-300 font-semibold select-none leading-snug">
            I confirm that I want to delete all widgets and broker settings to start with a blank dashboard.
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel / Keep Data
          </button>
          <button
            type="button"
            disabled={!hasConfirmedCheckbox}
            onClick={handleClear}
            className="py-2.5 px-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-rose-600/20"
          >
            <i className="fas fa-trash-can text-xs"></i>
            <span>Yes, Clear Everything</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearAllModal;
