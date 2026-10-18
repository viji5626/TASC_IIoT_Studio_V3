import React from 'react';
import { SmartIcon, parseSpeedToSeconds } from '../../../utils/iconAnimator';

interface PanelControlsSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setPickingIconFor: (target: 'on' | 'off' | null) => void;
  setPickingColorFor: (target: 'first' | 'second' | 'third' | 'iconOn' | 'iconOff' | null) => void;
  isLED: boolean;
  isSwitch: boolean;
  isButton: boolean;
}

export const PanelControlsSection: React.FC<PanelControlsSectionProps> = ({
  formData,
  setFormData,
  handleChange,
  setPickingIconFor,
  setPickingColorFor,
  isLED,
  isSwitch,
  isButton
}) => {
  return (
    <>
      {isLED && (
        <div className="space-y-6 pt-2 border-t border-[#262626]">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-gray-400 absolute -top-2">Payload ON value</label>
              <input name="payloadOn" value={formData.payloadOn ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" />
            </div>
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-gray-400 absolute -top-2">Payload OFF value</label>
              <input name="payloadOff" value={formData.payloadOff ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-black/20 p-4 rounded-lg border border-white/5">
            {/* ON Icon & Settings Card */}
            <div className="space-y-3">
              <span className="text-xs text-gray-400 font-bold uppercase">ON Icon & Color</span>
              <div className="flex items-center space-x-3">
                <button 
                  type="button" 
                  onClick={() => setPickingIconFor('on')} 
                  className="w-10 h-10 rounded bg-[#222] flex items-center justify-center text-xl text-emerald-400 overflow-hidden shadow-inner border border-emerald-500/30"
                  title="Click to pick ON icon"
                >
                  <SmartIcon 
                    icon={formData.iconOn || 'fa-fan'} 
                    isAnimate={formData.rotateOn !== false} 
                    isFlash={!!formData.flashOn} 
                    speed={formData.animSpeedOn ?? formData.iconAnimSpeed ?? 'medium'} 
                  />
                </button>
                <button type="button" onClick={() => setPickingColorFor('iconOn')} className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full border border-white/20" style={{ backgroundColor: formData.iconColorOn || '#10b981' }}></div>
                  <span className="text-xs text-gray-400">Pick</span>
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-300 select-none">
                  <input 
                    type="checkbox"
                    name="flashOn"
                    checked={formData.flashOn || false}
                    onChange={handleChange}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-bolt text-[10px] text-amber-400"></i>
                    <span>Flash / Pulse Status</span>
                  </span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-300 select-none">
                  <input 
                    type="checkbox"
                    checked={formData.rotateOn !== false}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, rotateOn: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-sky-500 rounded cursor-pointer"
                  />
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-rotate text-[10px] text-sky-400"></i>
                    <span>Rotate / Spin Status</span>
                  </span>
                </label>

                {formData.rotateOn !== false && (
                  <div className="space-y-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>ON Spin Speed:</span>
                      <span className="font-mono text-sky-300 font-bold">
                        {parseSpeedToSeconds(formData.animSpeedOn ?? formData.iconAnimSpeed ?? 1.5).toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.1"
                      value={parseSpeedToSeconds(formData.animSpeedOn ?? formData.iconAnimSpeed ?? 1.5)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1.5;
                        setFormData((prev: any) => ({ ...prev, animSpeedOn: val, iconAnimSpeed: val }));
                      }}
                      className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
                    />
                    <div className="flex items-center space-x-1 pt-0.5">
                      {[
                        { label: 'Fast', sec: 0.4 },
                        { label: 'Normal', sec: 1.2 },
                        { label: 'Slow', sec: 3.0 }
                      ].map(chip => (
                        <button
                          key={chip.sec}
                          type="button"
                          onClick={() => setFormData((prev: any) => ({ ...prev, animSpeedOn: chip.sec, iconAnimSpeed: chip.sec }))}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OFF Icon & Settings Card */}
            <div className="space-y-3">
              <span className="text-xs text-gray-400 font-bold uppercase">OFF Icon & Color</span>
              <div className="flex items-center space-x-3">
                <button 
                  type="button" 
                  onClick={() => setPickingIconFor('off')} 
                  className="w-10 h-10 rounded bg-[#222] flex items-center justify-center text-xl text-gray-400 overflow-hidden shadow-inner border border-slate-700"
                  title="Click to pick OFF icon"
                >
                  <SmartIcon 
                    icon={formData.iconOff || 'fa-fan'} 
                    isAnimate={!!formData.rotateOff} 
                    isFlash={!!formData.flashOff} 
                    speed={formData.animSpeedOff ?? formData.iconAnimSpeed ?? 'medium'} 
                  />
                </button>
                <button type="button" onClick={() => setPickingColorFor('iconOff')} className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full border border-white/20" style={{ backgroundColor: formData.iconColorOff || '#4b5563' }}></div>
                  <span className="text-xs text-gray-400">Pick</span>
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-300 select-none">
                  <input 
                    type="checkbox"
                    name="flashOff"
                    checked={formData.flashOff || false}
                    onChange={handleChange}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-bolt text-[10px] text-amber-400"></i>
                    <span>Flash / Pulse Status</span>
                  </span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-300 select-none">
                  <input 
                    type="checkbox"
                    checked={!!formData.rotateOff}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, rotateOff: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-sky-500 rounded cursor-pointer"
                  />
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-rotate text-[10px] text-sky-400"></i>
                    <span>Rotate / Spin Status</span>
                  </span>
                </label>

                {formData.rotateOff && (
                  <div className="space-y-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>OFF Spin Speed:</span>
                      <span className="font-mono text-sky-300 font-bold">
                        {parseSpeedToSeconds(formData.animSpeedOff ?? formData.iconAnimSpeed ?? 1.5).toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="6.0"
                      step="0.1"
                      value={parseSpeedToSeconds(formData.animSpeedOff ?? formData.iconAnimSpeed ?? 1.5)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1.5;
                        setFormData((prev: any) => ({ ...prev, animSpeedOff: val }));
                      }}
                      className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
                    />
                    <div className="flex items-center space-x-1 pt-0.5">
                      {[
                        { label: 'Fast', sec: 0.4 },
                        { label: 'Normal', sec: 1.2 },
                        { label: 'Slow', sec: 3.0 }
                      ].map(chip => (
                        <button
                          key={chip.sec}
                          type="button"
                          onClick={() => setFormData((prev: any) => ({ ...prev, animSpeedOff: chip.sec }))}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isSwitch && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#262626]">
          <div className="relative border-b border-gray-700 py-2">
            <label className="text-xs text-amber-500 absolute -top-2">Switch ON Payload</label>
            <input name="payloadOn" value={formData.payloadOn ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" />
          </div>
          <div className="relative border-b border-gray-700 py-2">
            <label className="text-xs text-gray-400 absolute -top-2">Switch OFF Payload</label>
            <input name="payloadOff" value={formData.payloadOff ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" />
          </div>
        </div>
      )}

      {isButton && (() => {
        const action = formData.buttonAction || 'momentary';
        const isMomentaryOrToggle = action === 'momentary' || action === 'toggle';

        return (
          <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#141414] p-4 rounded-xl border border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-hand-pointer text-amber-400"></i>
                <span>Action Button Feature & Style</span>
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded font-mono border border-amber-500/20">
                {action === 'momentary' && 'Momentary Pushbutton'}
                {action === 'toggle' && 'Toggle Switch Button'}
                {action === 'set_bit' && 'Set Bit (Latch High)'}
                {action === 'reset_bit' && 'Reset Bit (Latch Low)'}
              </span>
            </div>

            {/* 1. Action Button Mode Dropdown */}
            <div className="space-y-1">
              <label className="text-xs text-amber-400 font-bold flex items-center space-x-1.5">
                <i className="fas fa-bolt text-[11px] text-amber-400"></i>
                <span>Button Action Feature</span>
              </label>
              <select
                name="buttonAction"
                value={action}
                onChange={(e) => {
                  const act = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    buttonAction: act,
                    payloadOn: prev.payloadOn !== undefined && prev.payloadOn !== '' ? prev.payloadOn : '1',
                    payloadOff: prev.payloadOff !== undefined && prev.payloadOff !== '' ? prev.payloadOff : '0',
                    payloadOnText: prev.payloadOnText || (act === 'set_bit' ? 'SET' : 'ON / RUNNING'),
                    payloadOffText: prev.payloadOffText || (act === 'reset_bit' ? 'RESET' : 'OFF / STOPPED')
                  }));
                }}
                className="w-full bg-slate-900 text-white font-bold rounded-lg p-2.5 text-xs border border-amber-500/50 outline-none focus:border-amber-400 cursor-pointer shadow-inner"
              >
                <option value="momentary">Momentary (Pushbutton)</option>
                <option value="toggle">Toggle</option>
                <option value="set_bit">Set Bit</option>
                <option value="reset_bit">Reset Bit</option>
              </select>
              <p className="text-[10.5px] text-slate-400">
                {action === 'momentary' && 'Momentary: Pressing down publishes State ON; releasing publishes State OFF.'}
                {action === 'toggle' && 'Toggle: Alternates between State ON and State OFF on each click.'}
                {action === 'set_bit' && 'Set Bit: Publishes the configured Set value (default: 1) on click.'}
                {action === 'reset_bit' && 'Reset Bit: Publishes the configured Reset value (default: 0) on click.'}
              </p>
            </div>

            {/* 2. State Labels & Values */}
            {isMomentaryOrToggle ? (
              <div className="space-y-3 pt-1">
                {/* Visible Button Texts */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative border-b border-gray-700 py-2">
                    <label className="text-xs text-emerald-400 absolute -top-2">State ON Text (State 1)</label>
                    <input 
                      name="payloadOnText" 
                      value={formData.payloadOnText ?? ''} 
                      onChange={handleChange} 
                      className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                      placeholder="ON / RUNNING" 
                    />
                  </div>
                  <div className="relative border-b border-gray-700 py-2">
                    <label className="text-xs text-slate-400 absolute -top-2">State OFF Text (State 0)</label>
                    <input 
                      name="payloadOffText" 
                      value={formData.payloadOffText ?? ''} 
                      onChange={handleChange} 
                      className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                      placeholder="OFF / STOPPED" 
                    />
                  </div>
                </div>

                {/* State Values */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative border-b border-gray-700 py-2">
                    <label className="text-xs text-emerald-400 absolute -top-2">State ON Value (Payload ON)</label>
                    <input 
                      name="payloadOn" 
                      value={formData.payloadOn ?? ''} 
                      onChange={handleChange} 
                      className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                      placeholder="1" 
                    />
                  </div>
                  <div className="relative border-b border-gray-700 py-2">
                    <label className="text-xs text-slate-400 absolute -top-2">State OFF Value (Payload OFF)</label>
                    <input 
                      name="payloadOff" 
                      value={formData.payloadOff ?? ''} 
                      onChange={handleChange} 
                      className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                      placeholder="0" 
                    />
                  </div>
                </div>
              </div>
            ) : action === 'set_bit' ? (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-emerald-400 absolute -top-2">Button Visible Text</label>
                  <input 
                    name="payloadOnText" 
                    value={formData.payloadOnText ?? ''} 
                    onChange={handleChange} 
                    className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                    placeholder="SET / START" 
                  />
                </div>
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-emerald-400 absolute -top-2">Set Bit Value (Payload)</label>
                  <input 
                    name="payloadOn" 
                    value={formData.payloadOn ?? ''} 
                    onChange={handleChange} 
                    className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                    placeholder="1" 
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-rose-400 absolute -top-2">Button Visible Text</label>
                  <input 
                    name="payloadOffText" 
                    value={formData.payloadOffText ?? ''} 
                    onChange={handleChange} 
                    className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                    placeholder="RESET / STOP" 
                  />
                </div>
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-rose-400 absolute -top-2">Reset Bit Value (Payload)</label>
                  <input 
                    name="payloadOff" 
                    value={formData.payloadOff ?? ''} 
                    onChange={handleChange} 
                    className="w-full bg-transparent outline-none text-white py-2 font-mono text-xs" 
                    placeholder="0" 
                  />
                </div>
              </div>
            )}

            {/* 3. Button Graphic Style */}
            <div className="space-y-1 pt-1">
              <label className="text-xs text-gray-400 font-semibold block">Button Shape Style</label>
              <select
                name="buttonStyle"
                value={formData.buttonStyle || 'rounded'}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, buttonStyle: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700"
              >
                <option value="square">Square Rectangular</option>
                <option value="rounded">Rounded Box (Default)</option>
                <option value="pill">Pill / Stadium</option>
                <option value="circular">Circular Push-Button</option>
                <option value="bevel">Beveled 3D Frame</option>
                <option value="glossy">Cyan Glossy Neon</option>
              </select>
            </div>
          </div>
        );
      })()}
    </>
  );
};
