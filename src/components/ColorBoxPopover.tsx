import React, { useState, useRef, useEffect } from 'react';

interface ColorBoxPopoverProps {
  label: string;
  icon: string;
  iconColorClass?: string;
  color: string; // e.g. '#0284c7', 'transparent', 'rgba(2, 132, 199, 0.8)'
  onChange: (color: string) => void;
  defaultColor?: string;
}

// Utility to parse hex or rgba string into { r, g, b, a (0-100) }
function parseColorString(colorStr: string, defaultHex: string = '#0ea5e9') {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'none') {
    return { r: 14, g: 165, b: 233, a: 0, isTransparent: true };
  }

  // Handle rgba(r, g, b, a)
  const rgbaMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const alphaRaw = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    const a = Math.round(alphaRaw * 100);
    return { r, g, b, a, isTransparent: a === 0 };
  }

  // Handle Hex #RGB, #RRGGBB, #RRGGBBAA
  let hex = colorStr.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return { r, g, b, a: 100, isTransparent: false };
  }
  if (hex.length === 8) {
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const alphaHex = parseInt(hex.substring(6, 8), 16) || 255;
    const a = Math.round((alphaHex / 255) * 100);
    return { r, g, b, a, isTransparent: a === 0 };
  }

  return { r: 14, g: 165, b: 233, a: 100, isTransparent: false };
}

// Convert r,g,b,a back to string
function colorToOutputString(r: number, g: number, b: number, aPercent: number): string {
  if (aPercent <= 0) return 'transparent';
  if (aPercent >= 100) {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  const alphaDecimal = (aPercent / 100).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${alphaDecimal})`;
}

// Convert r,g,b to hex string for input type="color"
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const PRESET_COLORS = [
  '#0284c7', '#06b6d4', '#10b981', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f97316', 
  '#f59e0b', '#eab308', '#84cc16', '#64748b', '#ffffff', '#0f172a'
];

export const ColorBoxPopover: React.FC<ColorBoxPopoverProps> = ({
  label,
  icon,
  iconColorClass = 'text-sky-400',
  color,
  onChange,
  defaultColor = '#0284c7'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = parseColorString(color, defaultColor);
  const isTransparent = parsed.isTransparent || color === 'transparent';

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRGBChange = (newR: number, newG: number, newB: number, currentAlpha: number = parsed.a) => {
    const alphaToUse = currentAlpha === 0 ? 100 : currentAlpha;
    const output = colorToOutputString(newR, newG, newB, alphaToUse);
    onChange(output);
  };

  const handleAlphaChange = (newAlpha: number) => {
    const clampedAlpha = Math.max(0, Math.min(100, newAlpha));
    const output = colorToOutputString(parsed.r, parsed.g, parsed.b, clampedAlpha);
    onChange(output);
  };

  const handleHexColorInput = (hexStr: string) => {
    const cleanHex = hexStr.replace('#', '');
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
      handleRGBChange(r, g, b, parsed.a === 0 ? 100 : parsed.a);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Compact Toolbar Swatch Button */}
      <div 
        className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        title={`Configure ${label} Color & Transparency`}
      >
        <i className={`fas ${icon} text-[11px] ${iconColorClass}`}></i>
        <span className="text-[10px] text-slate-300 font-bold hidden sm:inline">{label}:</span>

        {/* Color Preview Badge */}
        <div 
          className="w-5 h-5 rounded border border-slate-700 relative overflow-hidden flex items-center justify-center shadow-inner shrink-0"
          style={{
            backgroundColor: isTransparent ? 'transparent' : colorToOutputString(parsed.r, parsed.g, parsed.b, parsed.a),
            backgroundImage: isTransparent ? 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)' : undefined,
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
          }}
        >
          {isTransparent && (
            <i className="fas fa-ban text-[9px] text-rose-400"></i>
          )}
        </div>
      </div>

      {/* Floating Color Box Popover */}
      {isOpen && (
        <div className="absolute top-8 left-0 z-[500] w-64 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <i className={`fas ${icon} text-xs ${iconColorClass}`}></i>
              <span>{label} Color</span>
            </span>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded text-xs"
            >
              <i className="fas fa-xmark"></i>
            </button>
          </div>

          {/* Color Preview Swatch & Spectrum Input */}
          <div className="flex items-center space-x-3 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <div 
              className="w-9 h-9 rounded-lg border border-slate-700 relative overflow-hidden flex items-center justify-center shrink-0 shadow-inner"
              style={{
                backgroundColor: isTransparent ? 'transparent' : colorToOutputString(parsed.r, parsed.g, parsed.b, parsed.a),
                backgroundImage: isTransparent ? 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)' : undefined,
                backgroundSize: '10px 10px'
              }}
            >
              {isTransparent && <i className="fas fa-ban text-xs text-rose-400"></i>}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-1.5">
                <input 
                  type="color"
                  value={rgbToHex(parsed.r, parsed.g, parsed.b)}
                  onChange={(e) => handleHexColorInput(e.target.value)}
                  className="w-6 h-6 bg-transparent cursor-pointer rounded border-0 outline-none overflow-hidden shrink-0"
                  title="Pick Spectrum Color"
                />
                <input 
                  type="text"
                  value={isTransparent ? 'transparent' : colorToOutputString(parsed.r, parsed.g, parsed.b, parsed.a)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'transparent') {
                      onChange('transparent');
                    } else if (val.startsWith('#') || val.startsWith('rgb')) {
                      onChange(val);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-sky-300 px-2 py-0.5 rounded outline-none"
                  placeholder="#hex or rgba"
                />
              </div>
            </div>
          </div>

          {/* Transparent / No Color Quick Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (isTransparent) {
                // Restore solid color
                handleRGBChange(parsed.r, parsed.g, parsed.b, 100);
              } else {
                onChange('transparent');
              }
            }}
            className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              isTransparent
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className="fas fa-ban text-rose-400 text-xs"></i>
            <span>{isTransparent ? '✓ Transparent Active (No Color)' : 'Set No Color / 100% Transparent'}</span>
          </button>

          {/* Transparency / Opacity Slider & Numeric Entry */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-bold flex items-center space-x-1">
                <i className="fas fa-circle-half-stroke text-[10px] text-purple-400"></i>
                <span>Opacity / Transparency:</span>
              </span>
              
              {/* Numeric Entry Input Box */}
              <div className="flex items-center space-x-1">
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={isTransparent ? 0 : parsed.a}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    if (!isNaN(num)) {
                      handleAlphaChange(num);
                    }
                  }}
                  className="w-12 bg-slate-950 border border-slate-700 font-mono font-bold text-xs text-sky-300 text-center rounded py-0.5 outline-none focus:border-sky-400"
                />
                <span className="text-[10px] text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Slider */}
            <input 
              type="range"
              min="0"
              max="100"
              step="1"
              value={isTransparent ? 0 : parsed.a}
              onChange={(e) => handleAlphaChange(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />

            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-0.5">
              <span>0% (Transparent)</span>
              <span>50%</span>
              <span>100% (Opaque)</span>
            </div>
          </div>

          {/* Preset Swatches Palette */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Palette Presets</span>
            <div className="grid grid-cols-8 gap-1.5">
              {PRESET_COLORS.map(presetHex => (
                <button
                  key={presetHex}
                  type="button"
                  onClick={() => {
                    const p = parseColorString(presetHex);
                    handleRGBChange(p.r, p.g, p.b, parsed.a === 0 ? 100 : parsed.a);
                  }}
                  className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform cursor-pointer shadow-sm"
                  style={{ backgroundColor: presetHex }}
                  title={presetHex}
                />
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
