import React, { useState } from 'react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'enter' | 'set';
  correctPin?: string;
  onSuccess: (pin?: string) => void;
  title?: string;
}

const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  mode,
  correctPin = '',
  onSuccess,
  title
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'enter') {
      if (correctPin && pin !== correctPin) {
        setError('Incorrect PIN. Please try again.');
        return;
      }
      onSuccess();
      setPin('');
    } else {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
      onSuccess(pin);
      setPin('');
      setConfirmPin('');
    }
  };

  const handleKeypad = (num: string) => {
    setError('');
    if (mode === 'enter') {
      if (pin.length < 6) setPin(prev => prev + num);
    } else {
      if (pin.length < 6) {
        setPin(prev => prev + num);
      } else if (confirmPin.length < 6) {
        setConfirmPin(prev => prev + num);
      }
    }
  };

  const handleDeleteKey = () => {
    setError('');
    if (mode === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin(prev => prev.slice(0, -1));
      } else {
        setPin(prev => prev.slice(0, -1));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-slate-100 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <i className="fas fa-shield-halved text-lg"></i>
            <span className="text-sm">
              {title || (mode === 'enter' ? 'Dashboard Security PIN' : 'Set Security PIN')}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {mode === 'enter' 
            ? 'Enter your Security PIN to unlock layout edits and authorize runtime safeguard operations.'
            : 'Create a Security PIN for runtime safeguard operation security (Value input, Pushbutton, Toggle switch) and layout protection across Community Edition, Engineering Edition, and Client Edition.'
          }
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'enter' ? (
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block text-center">
                Enter PIN Passcode
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="••••"
                className="w-full bg-slate-950 text-center font-mono text-2xl tracking-[0.5em] py-3 rounded-xl border border-slate-800 focus:border-amber-500 outline-none text-amber-400"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                  placeholder="••••"
                  className="w-full bg-slate-950 text-center font-mono text-xl tracking-[0.3em] py-2.5 rounded-xl border border-slate-800 focus:border-amber-500 outline-none text-amber-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                  placeholder="••••"
                  className="w-full bg-slate-950 text-center font-mono text-xl tracking-[0.3em] py-2.5 rounded-xl border border-slate-800 focus:border-amber-500 outline-none text-amber-400"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center font-medium animate-in shake">
              <i className="fas fa-circle-exclamation mr-1.5"></i>
              {error}
            </div>
          )}

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1','2','3','4','5','6','7','8','9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypad(num)}
                className="py-2.5 bg-slate-800/60 hover:bg-slate-700/80 active:bg-amber-500/20 rounded-xl font-mono text-lg font-bold text-slate-200 transition-colors shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setPin(''); setConfirmPin(''); setError(''); }}
              className="py-2.5 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypad('0')}
              className="py-2.5 bg-slate-800/60 hover:bg-slate-700/80 active:bg-amber-500/20 rounded-xl font-mono text-lg font-bold text-slate-200 transition-colors shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDeleteKey}
              className="py-2.5 bg-slate-800/40 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400"
            >
              <i className="fas fa-backspace text-sm"></i>
            </button>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              {mode === 'enter' ? 'Unlock Edits' : 'Save PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinModal;
