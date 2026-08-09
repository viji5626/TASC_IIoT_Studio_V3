import React, { useState } from 'react';

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor?: string;
  onSelect: (color: string) => void;
}

const PRESET_COLORS = [
  'transparent',
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
  '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', 
  '#eab308', '#84cc16', '#22c55e', '#64748b', '#ffffff'
];

const ColorPicker: React.FC<ColorPickerProps> = ({ isOpen, onClose, initialColor = '#10b981', onSelect }) => {
  const [hex, setHex] = useState(initialColor);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] w-full max-w-xs rounded-2xl border border-[#2a2a2a] p-5 space-y-4 shadow-2xl animate-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <h3 className="text-sm font-bold text-white">Choose Color</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><i className="fas fa-times"></i></button>
        </div>

        {/* Quick Transparent Button */}
        <button
          type="button"
          onClick={() => {
            onSelect('transparent');
            onClose();
          }}
          className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
            hex === 'transparent'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <i className="fas fa-ban text-rose-400"></i>
          <span>No Color / Transparent</span>
        </button>

        <div className="grid grid-cols-4 gap-2.5">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => {
                onSelect(color);
                onClose();
              }}
              className={`w-9 h-9 rounded-xl border-2 transition-transform hover:scale-105 flex items-center justify-center ${
                color === 'transparent'
                  ? 'bg-slate-900 border-dashed border-rose-500/60 text-rose-400'
                  : hex === color ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-90'
              }`}
              style={color !== 'transparent' ? { backgroundColor: color } : undefined}
              title={color === 'transparent' ? 'No Color / Transparent' : color}
            >
              {color === 'transparent' && <i className="fas fa-ban text-xs"></i>}
            </button>
          ))}
        </div>

        <div className="pt-2 flex items-center space-x-2">
          <input 
            type="color" 
            value={hex && hex !== 'transparent' ? hex : '#10b981'}
            onChange={(e) => setHex(e.target.value)}
            className="w-10 h-9 bg-transparent cursor-pointer rounded overflow-hidden"
          />
          <input 
            type="text" 
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="flex-grow bg-[#1e1e1e] border border-[#333] text-xs font-mono text-white px-3 py-2 rounded-lg outline-none"
            placeholder="hex or transparent"
          />
          <button 
            onClick={() => {
              onSelect(hex);
              onClose();
            }}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded-lg"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
