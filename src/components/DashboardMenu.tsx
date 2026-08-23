import React from 'react';

interface DashboardMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isLocked: boolean;
  hasPin?: boolean;
  onToggleLock: () => void;
  onAddDashboard: () => void;
}

const DashboardMenu: React.FC<DashboardMenuProps> = ({ 
  isOpen, 
  onClose, 
  isLocked, 
  hasPin = false,
  onToggleLock, 
  onAddDashboard
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative mt-16 mr-5 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right">
        <div className="p-2 space-y-1">
          {/* Lock toggle */}
          <div 
            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer group transition-colors" 
            onClick={onToggleLock}
          >
            <div className="flex items-center space-x-3 text-slate-300 group-hover:text-white">
              <i className={`fas ${isLocked ? 'fa-lock text-sky-400' : 'fa-lock-open text-slate-400'} w-5 text-center text-sm`}></i>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Lock Screen Edits</span>
                {hasPin && <span className="text-[9px] text-amber-400">PIN Protected</span>}
              </div>
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors relative ${isLocked ? 'bg-sky-500' : 'bg-slate-800 border border-slate-700'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-slate-950 transition-transform ${isLocked ? 'translate-x-4' : ''}`}></div>
            </div>
          </div>

          <div className="h-[1px] bg-slate-800 my-1"></div>

          <button 
            onClick={() => { onAddDashboard(); onClose(); }} 
            className="w-full p-3 flex items-center space-x-3 hover:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors text-left"
          >
            <i className="fas fa-plus-circle w-5 text-center text-emerald-400"></i>
            <span>Add New Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardMenu;
