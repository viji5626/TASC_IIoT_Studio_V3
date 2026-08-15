import React from 'react';

interface ExitSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndExit: () => void;
  onExitWithoutSave: () => void;
  editionName?: string;
  isCommunitySave?: boolean;
}

export const ExitSessionModal: React.FC<ExitSessionModalProps> = ({
  isOpen,
  onClose,
  onSaveAndExit,
  onExitWithoutSave,
  editionName = 'Community Edition',
  isCommunitySave = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
          isCommunitySave 
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
            : 'bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500'
        }`} />

        {/* Header Icon & Close Button */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
            isCommunitySave 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`}>
            <i className={`fas ${isCommunitySave ? 'fa-cube' : 'fa-triangle-exclamation'}`}></i>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Cancel"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Title & Body */}
        <div className="space-y-2 mb-6">
          <h2 className="text-xl font-black text-white tracking-tight">
            Close Session?
          </h2>
          <p className="text-sm font-semibold text-slate-100 leading-relaxed">
            {isCommunitySave
              ? 'Save your Community Demo layout to browser storage before closing?'
              : 'Do you want to save your current workstation setup before returning to the landing page?'}
          </p>
          <p className="text-xs text-slate-400 leading-normal">
            {isCommunitySave ? (
              <>
                You are currently in <span className="text-emerald-400 font-bold">{editionName}</span>. Saving will store your demo in the <span className="text-emerald-300 font-semibold">Community Demo slot</span> without affecting commercial packages.
              </>
            ) : (
              <>
                You are currently in <span className="text-sky-400 font-bold">{editionName}</span>. Choose whether to save your layout state in browser memory before returning to the landing page.
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {/* Option 1: Save and Exit */}
          <button
            type="button"
            onClick={onSaveAndExit}
            className={`w-full py-3.5 px-4 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              isCommunitySave
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 shadow-sky-500/20'
            }`}
          >
            <i className="fas fa-floppy-disk text-sm"></i>
            <span>{isCommunitySave ? 'Save and Exit (Community Demo Memory)' : 'Save and Exit (Save in Browser Memory)'}</span>
          </button>

          {/* Option 2: Exit without Save */}
          <button
            type="button"
            onClick={onExitWithoutSave}
            className="w-full py-2.5 px-4 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <i className="fas fa-trash-can text-sm text-rose-400"></i>
            <span>Exit without Save</span>
          </button>

          {/* Option 3: Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitSessionModal;
