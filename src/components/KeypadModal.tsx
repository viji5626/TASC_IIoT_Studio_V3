import React, { useState, useEffect } from 'react';

interface KeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val: number) => void;
  initialValue?: number | string;
  title?: string;
  unit?: string;
  min?: number;
  max?: number;
}

const KeypadModal: React.FC<KeypadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = 0,
  title = 'Numeric Setpoint Entry',
  unit = '',
  min = -99999,
  max = 99999
}) => {
  const [typedValue, setTypedValue] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTypedValue(initialValue !== undefined && initialValue !== null ? String(initialValue) : '0');
      setErrorMsg(null);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleKeyPress = (char: string) => {
    setErrorMsg(null);
    if (char === 'AC') {
      setTypedValue('0');
      return;
    }
    if (char === 'DEL') {
      setTypedValue(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }
    if (char === '+/-') {
      setTypedValue(prev => {
        if (prev.startsWith('-')) return prev.slice(1);
        if (prev === '0') return '0';
        return '-' + prev;
      });
      return;
    }
    if (char === '.') {
      if (!typedValue.includes('.')) {
        setTypedValue(prev => prev + '.');
      }
      return;
    }

    // Number digit 0-9
    setTypedValue(prev => {
      if (prev === '0') return char;
      if (prev === '-0') return '-' + char;
      return prev + char;
    });
  };

  const handleConfirm = () => {
    const num = parseFloat(typedValue);
    if (isNaN(num)) {
      setErrorMsg('Invalid numeric value');
      return;
    }
    if (min !== undefined && num < min) {
      setErrorMsg(`Value below min limit (${min})`);
      return;
    }
    if (max !== undefined && num > max) {
      setErrorMsg(`Value exceeds max limit (${max})`);
      return;
    }
    onConfirm(num);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 text-slate-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <i className="fas fa-calculator text-base"></i>
            <span className="truncate">{title}</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        </div>

        {/* 7-Segment / Digital Display Window */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-3.5 space-y-1 shadow-inner relative">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>Range: [{min} .. {max}]</span>
            <span className="text-amber-400 font-bold uppercase">INPUT SP</span>
          </div>
          <div className="flex items-baseline justify-end space-x-2">
            <span className="text-3xl font-black text-amber-400 font-mono tracking-wider digital-font drop-shadow-md">
              {typedValue || '0'}
            </span>
            {unit && <span className="text-sm font-bold text-sky-400 font-mono">{unit}</span>}
          </div>
        </div>

        {errorMsg && (
          <div className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl text-center animate-in shake">
            <i className="fas fa-triangle-exclamation mr-1.5"></i>
            {errorMsg}
          </div>
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button onClick={() => handleKeyPress('7')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">7</button>
          <button onClick={() => handleKeyPress('8')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">8</button>
          <button onClick={() => handleKeyPress('9')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">9</button>
          <button onClick={() => handleKeyPress('AC')} className="h-12 bg-rose-600/20 hover:bg-rose-600/30 active:scale-95 text-rose-400 font-extrabold text-sm rounded-xl border border-rose-500/40 shadow transition-all cursor-pointer">AC</button>

          {/* Row 2 */}
          <button onClick={() => handleKeyPress('4')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">4</button>
          <button onClick={() => handleKeyPress('5')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">5</button>
          <button onClick={() => handleKeyPress('6')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">6</button>
          <button onClick={() => handleKeyPress('DEL')} className="h-12 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-400 font-extrabold text-sm rounded-xl border border-amber-500/40 shadow transition-all cursor-pointer">DEL</button>

          {/* Row 3 */}
          <button onClick={() => handleKeyPress('1')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">1</button>
          <button onClick={() => handleKeyPress('2')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">2</button>
          <button onClick={() => handleKeyPress('3')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">3</button>
          <button onClick={() => handleKeyPress('+/-')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-sm rounded-xl border border-slate-700 shadow transition-all cursor-pointer">+/-</button>

          {/* Row 4 */}
          <button onClick={() => handleKeyPress('0')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg rounded-xl border border-slate-700 shadow transition-all cursor-pointer">0</button>
          <button onClick={() => handleKeyPress('.')} className="h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-xl rounded-xl border border-slate-700 shadow transition-all cursor-pointer">.</button>
          <button onClick={handleConfirm} className="col-span-2 h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5">
            <span>ENT</span>
            <i className="fas fa-turn-down text-xs rotate-90"></i>
          </button>
        </div>

      </div>
    </div>
  );
};

export default KeypadModal;
