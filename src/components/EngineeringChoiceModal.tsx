import React from 'react';

interface EngineeringChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'grid' | 'hmi') => void;
  currentMode?: 'grid' | 'hmi';
}

const EngineeringChoiceModal: React.FC<EngineeringChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  currentMode = 'grid'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3 text-amber-400">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              <i className="fas fa-sliders"></i>
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Select Workstation Architecture</h3>
              <p className="text-xs text-slate-400">Choose between Responsive IIoT Grid or Absolute SCADA HMI Screen Designer</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* 2 Choice Options Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* Option 1: IIoT Studio / Responsive Grid */}
          <div 
            onClick={() => {
              onSelectMode('grid');
              onClose();
            }}
            className={`border rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4 group relative overflow-hidden ${
              currentMode === 'grid'
                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-950'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-lg border border-amber-500/30">
                  <i className="fas fa-border-all"></i>
                </div>
                {currentMode === 'grid' && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
                    Active Mode
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                  IIoT Studio Grid Builder
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Responsive Bento grid cards with drag-to-reorder, auto-wrapping columns, alarms, and card telemetry widgets.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-check text-amber-400 text-xs"></i>
                  <span>Responsive Auto-Layout Cards</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-check text-amber-400 text-xs"></i>
                  <span>Drag-to-Reorder Column Bento Grid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-check text-amber-400 text-xs"></i>
                  <span>Ideal for Mobile & Dashboard Telemetry</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Launch Grid Studio</span>
              <i className="fas fa-arrow-right text-xs"></i>
            </button>
          </div>

          {/* Option 2: Web HMI Canvas Editor */}
          <div 
            onClick={() => {
              onSelectMode('hmi');
              onClose();
            }}
            className={`border rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4 group relative overflow-hidden ${
              currentMode === 'hmi'
                ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/30'
                : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/50 hover:bg-slate-950'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center text-lg border border-sky-500/30">
                  <i className="fas fa-microchip"></i>
                </div>
                {currentMode === 'hmi' && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500 text-slate-950 px-2 py-0.5 rounded-md">
                    Active Mode
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                  Web HMI Canvas Designer
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  SCADA & Industrial HMI style absolute drag-and-drop canvas with X, Y coordinates, W & H scaling, touch keypad & screen navigation.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-check text-sky-400 text-xs"></i>
                  <span>Freeform X, Y Dragging & Pixel W/H Sizing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-check text-sky-400 text-xs"></i>
                  <span>Static Text Labels, Setpoints & Indicators</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-check text-sky-400 text-xs"></i>
                  <span>Touch 7-Segment Keypad Popups & Screen Jumps</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="w-full py-2.5 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Launch Web HMI Canvas</span>
              <i className="fas fa-microchip text-xs"></i>
            </button>
          </div>

        </div>

        {/* Footer Note */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-circle-info text-amber-400"></i>
            <span>You can switch workstation modes at any time using the top toolbar toggle.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EngineeringChoiceModal;
