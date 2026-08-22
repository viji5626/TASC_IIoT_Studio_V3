import React from 'react';
import { SmartIcon } from '../../../utils/iconAnimator';

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
            <div className="space-y-3">
              <span className="text-xs text-gray-400 font-bold uppercase">ON Icon & Color</span>
              <div className="flex items-center space-x-3">
                <button type="button" onClick={() => setPickingIconFor('on')} className="w-10 h-10 rounded bg-[#222] flex items-center justify-center text-xl text-emerald-400 overflow-hidden">
                  <SmartIcon icon={formData.iconOn || 'fa-fan'} isAnimate={!!formData.rotateOn} isFlash={!!formData.flashOn} speed={formData.animSpeedOn || 'medium'} />
                </button>
                <button type="button" onClick={() => setPickingColorFor('iconOn')} className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full border border-white/20" style={{ backgroundColor: formData.iconColorOn || '#10b981' }}></div>
                  <span className="text-xs text-gray-400">Pick</span>
                </button>
              </div>

              <div className="flex items-center space-x-2.5 pt-1 border-t border-white/5 flex-wrap gap-y-1.5">
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
                    <span>Flash</span>
                  </span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-300 select-none" title="Dedicated smart animation (rotation for fan/pump, soundwave for speaker/siren, strobe for light, drip for tap, spark for electricity)">
                  <input 
                    type="checkbox"
                    name="rotateOn"
                    checked={formData.rotateOn || false}
                    onChange={handleChange}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="flex items-center space-x-1 font-bold text-sky-400">
                    <i className="fas fa-wand-magic-sparkles text-[10px] text-sky-400"></i>
                    <span>Animate</span>
                  </span>
                </label>

                {formData.rotateOn && (
                  <select
                    name="animSpeedOn"
                    value={formData.animSpeedOn || 'medium'}
                    onChange={handleChange}
                    className="bg-[#1e1e1e] border border-sky-500/50 text-[10px] text-sky-300 font-bold px-1.5 py-0.5 rounded outline-none cursor-pointer hover:border-sky-400 animate-in fade-in duration-150"
                    title="Animation Speed"
                  >
                    <option value="slow">Slow</option>
                    <option value="medium">Medium</option>
                    <option value="fast">Fast</option>
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs text-gray-400 font-bold uppercase">OFF Icon & Color</span>
              <div className="flex items-center space-x-3">
                <button type="button" onClick={() => setPickingIconFor('off')} className="w-10 h-10 rounded bg-[#222] flex items-center justify-center text-xl text-gray-400 overflow-hidden">
                  <SmartIcon icon={formData.iconOff || 'fa-fan'} isAnimate={!!formData.rotateOff} isFlash={!!formData.flashOff} speed={formData.animSpeedOff || 'medium'} />
                </button>
                <button type="button" onClick={() => setPickingColorFor('iconOff')} className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full border border-white/20" style={{ backgroundColor: formData.iconColorOff || '#4b5563' }}></div>
                  <span className="text-xs text-gray-400">Pick</span>
                </button>
              </div>

              <div className="flex items-center space-x-2.5 pt-1 border-t border-white/5 flex-wrap gap-y-1.5">
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
                    <span>Flash</span>
                  </span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-gray-300 select-none" title="Dedicated smart animation (rotation for fan/pump, soundwave for speaker/siren, strobe for light, drip for tap, spark for electricity)">
                  <input 
                    type="checkbox"
                    name="rotateOff"
                    checked={formData.rotateOff || false}
                    onChange={handleChange}
                    className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="flex items-center space-x-1 font-bold text-sky-400">
                    <i className="fas fa-wand-magic-sparkles text-[10px] text-sky-400"></i>
                    <span>Animate</span>
                  </span>
                </label>

                {formData.rotateOff && (
                  <select
                    name="animSpeedOff"
                    value={formData.animSpeedOff || 'medium'}
                    onChange={handleChange}
                    className="bg-[#1e1e1e] border border-sky-500/50 text-[10px] text-sky-300 font-bold px-1.5 py-0.5 rounded outline-none cursor-pointer hover:border-sky-400 animate-in fade-in duration-150"
                    title="Animation Speed"
                  >
                    <option value="slow">Slow</option>
                    <option value="medium">Medium</option>
                    <option value="fast">Fast</option>
                  </select>
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

      {isButton && (
        <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#141414] p-4 rounded-xl border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-2">
              <i className="fas fa-hand-pointer text-amber-400"></i>
              <span>Button Graphic Style & State Labels</span>
            </span>
            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded font-mono border border-amber-500/20">Tactile HMI Button</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-amber-500 absolute -top-2">State ON Text (State 1)</label>
              <input name="payloadOnText" value={formData.payloadOnText ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" placeholder="ON / RUNNING" />
            </div>
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-gray-400 absolute -top-2">State OFF Text (State 0)</label>
              <input name="payloadOffText" value={formData.payloadOffText ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" placeholder="OFF / STOPPED" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-amber-500 absolute -top-2">Button Click Payload</label>
              <input name="buttonPayload" value={formData.buttonPayload ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" placeholder="1 or TOGGLE" />
            </div>
            <div className="space-y-1">
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
        </div>
      )}
    </>
  );
};
