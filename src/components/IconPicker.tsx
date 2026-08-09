import React, { useState } from 'react';
import { ICON_LIBRARY, IconItem, SmartIcon } from '../utils/iconAnimator';

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon?: string;
  onSelect: (icon: string) => void;
}

const CATEGORIES = ['All', 'Industrial', 'Audio/Alarm', 'Lighting', 'Fluid/Plumbing', 'Thermal/HVAC', 'Electrical', 'Network', 'Safety'] as const;

const IconPicker: React.FC<IconPickerProps> = ({ isOpen, onClose, currentIcon, onSelect }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (!isOpen) return null;

  const filtered = ICON_LIBRARY.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.label.toLowerCase().includes(search.toLowerCase()) ||
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] w-full max-w-md rounded-2xl border border-[#2a2a2a] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in duration-150">
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#1a1a1a]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <i className="fas fa-icons text-amber-400"></i>
              <span>Select Indicator & SCADA Icon</span>
            </h3>
            <p className="text-[10px] text-slate-400">Expanded SCADA Library with Dedicated Smart Animations</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white cursor-pointer"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="p-3 bg-[#111] border-b border-[#222] space-y-2">
          <input 
            type="text" 
            placeholder="Search icon by name or type (e.g. tap, speaker, fan, light, valve)..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#333] text-xs text-white px-3 py-1.5 rounded-lg outline-none focus:border-amber-500 font-mono"
          />

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  activeCategory === cat 
                    ? 'bg-amber-500 text-black shadow-sm' 
                    : 'bg-[#1e1e1e] text-slate-400 hover:text-white hover:bg-[#282828]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 p-4 overflow-y-auto flex-grow max-h-[55vh]">
          {filtered.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
              No matching icons found for "{search}"
            </div>
          ) : (
            filtered.map(item => {
              const isSelected = currentIcon === item.name || currentIcon === item.name.replace(/^fa-/, '');
              return (
                <button
                  key={item.name}
                  type="button"
                  title={`${item.label} (${item.animType.toUpperCase()} animation)`}
                  onClick={() => {
                    onSelect(item.name);
                    onClose();
                  }}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all group/btn cursor-pointer ${
                    isSelected 
                      ? 'bg-amber-500 text-black font-bold scale-105 shadow-lg ring-2 ring-amber-400' 
                      : 'bg-[#1e1e1e] text-gray-300 hover:text-white hover:bg-[#282828] border border-slate-800/80 hover:border-amber-500/50'
                  }`}
                >
                  <div className="text-xl group-hover/btn:scale-110 transition-transform">
                    <SmartIcon icon={item.name} />
                  </div>
                  <span className="text-[9px] font-mono truncate w-full text-center leading-tight opacity-90">
                    {item.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default IconPicker;
