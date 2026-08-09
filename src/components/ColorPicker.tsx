import React, { useState } from 'react';

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor?: string;
  onSelect: (color: string) => void;
}

const PRESET_COLORS = [
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

        <div className="grid grid-cols-5 gap-3">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => {
                onSelect(color);
                onClose();
              }}
              className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${hex === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="pt-2 flex items-center space-x-2">
          <input 
            type="color" 
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="w-10 h-9 bg-transparent cursor-pointer rounded overflow-hidden"
          />
          <input 
            type="text" 
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="flex-grow bg-[#1e1e1e] border border-[#333] text-xs font-mono text-white px-3 py-2 rounded-lg outline-none"
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
