import React from 'react';

interface PanelMediaAndPipeSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isStaticText: boolean;
  isScreenJump: boolean;
  isImage: boolean;
  isClock: boolean;
  isPipe: boolean;
}

export const PanelMediaAndPipeSection: React.FC<PanelMediaAndPipeSectionProps> = ({
  formData,
  setFormData,
  handleChange,
  isStaticText,
  isScreenJump,
  isImage,
  isClock,
  isPipe
}) => {
  return (
    <>
      {/* Static Text Config */}
      {isStaticText && (
        <div className="space-y-4 pt-2 border-t border-[#262626]">
          <div className="relative border-b border-gray-700 py-2">
            <label className="text-xs text-amber-500 absolute -top-2 font-bold">Static Text Content</label>
            <input 
              name="staticText" 
              value={formData.staticText ?? formData.panelName ?? ''} 
              onChange={handleChange} 
              className="w-full bg-transparent outline-none text-sky-400 py-2 font-bold text-sm" 
              placeholder="e.g. AMAN HATCHERY - AUTOMATION CONTROLS" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-gray-400 absolute -top-2">Font Size (pt)</label>
              <input 
                type="number" 
                name="fontSize" 
                value={formData.fontSize ?? 18} 
                onChange={handleChange} 
                className="w-full bg-transparent outline-none text-white py-2 font-mono" 
              />
            </div>
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-gray-400 absolute -top-2">Text Alignment</label>
              <select 
                name="textAlign" 
                value={formData.textAlign ?? 'center'} 
                onChange={handleChange} 
                className="w-full bg-transparent outline-none text-white py-2"
              >
                <option value="center">Center</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Text Color</label>
              <input 
                type="color" 
                name="textColor" 
                value={formData.textColor || '#38bdf8'} 
                onChange={handleChange} 
                className="w-full h-8 bg-transparent cursor-pointer rounded" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">BG Color</label>
              <input 
                type="color" 
                name="bgColor" 
                value={formData.bgColor || '#0f172a'} 
                onChange={handleChange} 
                className="w-full h-8 bg-transparent cursor-pointer rounded" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Border Color</label>
              <input 
                type="color" 
                name="borderColor" 
                value={formData.borderColor || '#0ea5e9'} 
                onChange={handleChange} 
                className="w-full h-8 bg-transparent cursor-pointer rounded" 
              />
            </div>
            <div>
              <label className="text-[10px] text-purple-400 font-bold block mb-1">Opacity</label>
              <div className="flex flex-col justify-center h-8">
                <input 
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  name="opacity"
                  value={formData.opacity ?? 1}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none" 
                />
                <span className="text-[9px] font-mono text-purple-300 text-center block mt-1">
                  {Math.round((formData.opacity ?? 1) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-amber-400 font-bold block mb-1">Rotation</label>
              <div className="flex flex-col justify-center h-8">
                <input 
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  name="rotation"
                  value={formData.rotation ?? 0}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, rotation: parseInt(e.target.value) || 0 }))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none" 
                />
                <span className="text-[9px] font-mono text-amber-300 text-center block mt-1">
                  {formData.rotation ?? 0}°
                </span>
              </div>
            </div>
          </div>

          {/* Shadow / Glow Effect Section */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-cyan-400 font-bold flex items-center space-x-2">
                <i className="fas fa-wand-magic-sparkles text-cyan-400"></i>
                <span>Font Shadow / Text Glow Effect</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="shadowEnabled"
                  checked={!!formData.shadowEnabled}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, shadowEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-semibold">{formData.shadowEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>

            {formData.shadowEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Glow / Shadow Color</label>
                  <input
                    type="color"
                    name="shadowColor"
                    value={formData.shadowColor || '#38bdf8'}
                    onChange={handleChange}
                    className="w-full h-8 bg-transparent cursor-pointer rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cyan-400 font-bold block mb-1">Glow Intensity ({formData.shadowIntensity ?? 15}px)</label>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="1"
                    name="shadowIntensity"
                    value={formData.shadowIntensity ?? 15}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, shadowIntensity: parseInt(e.target.value) || 15 }))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none mt-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen Jump Config */}
      {isScreenJump && (
        <div className="space-y-4 pt-2 border-t border-[#262626]">
          <div className="relative border-b border-gray-700 py-2">
            <label className="text-xs text-amber-500 absolute -top-2 font-bold">Target Screen ID / Dashboard ID</label>
            <input 
              name="targetScreenId" 
              value={formData.targetScreenId ?? ''} 
              onChange={handleChange} 
              className="w-full bg-transparent outline-none text-sky-400 py-2 font-mono text-sm" 
              placeholder="e.g. dash_fan_timer or dash_home" 
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Clicking this button on the HMI screen will automatically jump to the target screen ID.
          </p>
        </div>
      )}

      {/* Media Image Asset Config */}
      {isImage && (
        <div className="space-y-4 pt-2 border-t border-[#262626]">
          <div className="space-y-2">
            <label className="text-xs text-purple-400 font-bold block">Media Asset / Image File</label>
            <div className="flex items-center space-x-2">
              <label className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center space-x-1.5 shrink-0">
                <i className="fas fa-upload text-xs"></i>
                <span>Choose File (JPG, PNG, GIF, SVG)</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.svg,image/jpeg,image/png,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const res = ev.target?.result as string;
                        setFormData((prev: any) => ({ ...prev, imageUrl: res, staticText: res }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <span className="text-xs text-slate-400 truncate">Or paste Image URL below:</span>
            </div>
            <input
              name="imageUrl"
              value={formData.imageUrl || formData.staticText || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, imageUrl: e.target.value, staticText: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 text-purple-300 px-3 py-2 rounded-lg text-xs font-mono outline-none"
              placeholder="data:image/... or https://..."
            />
          </div>

          {(formData.imageUrl || formData.staticText) && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-4">
              <div className="w-16 h-16 bg-slate-900 rounded-lg border border-slate-800 p-1 flex items-center justify-center overflow-hidden shrink-0">
                <img src={formData.imageUrl || formData.staticText} alt="Preview" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="text-xs text-slate-300 space-y-1 flex-1">
                <span className="font-bold text-white block">Image Preview</span>
                <span className="text-[10px] text-slate-400 block">Supports transparent PNG, animated GIF, vector SVG, and JPG.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Image Fit Mode</label>
              <select
                name="imageFit"
                value={formData.imageFit || 'contain'}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-xs outline-none"
              >
                <option value="contain">Contain (Keep aspect ratio)</option>
                <option value="cover">Cover (Fill entire frame)</option>
                <option value="fill">Fill (Stretch to fit)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                name="opacity"
                value={formData.opacity ?? 1}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-mono text-right block">{Math.round((formData.opacity ?? 1) * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Clock Display Settings */}
      {isClock && (
        <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#141414] p-4 rounded-xl border border-sky-500/30">
          <span className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
            <i className="fas fa-clock text-sky-400"></i>
            <span>Clock Display Settings</span>
          </span>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">Time Format</label>
              <select
                name="clockFormat"
                value={formData.clockFormat || '12h'}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, clockFormat: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700"
              >
                <option value="12h">12-Hour AM/PM + Date</option>
                <option value="24h">24-Hour Digital Clock</option>
                <option value="date_time">Date & Time (Full)</option>
                <option value="time_only">Time Only (HH:MM)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Industrial Process Pipe Settings */}
      {isPipe && (
        <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#141414] p-4 rounded-xl border border-emerald-500/40 shadow-inner">
          <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <i className="fas fa-grip-lines text-emerald-400"></i>
              <span>Process Pipe & Flow Mechanics Settings</span>
            </span>
            <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">3D Vector Pipe</span>
          </span>

          {/* Pipe Thickness Adjuster, Turning Radius & End Fittings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-semibold">Pipe Thickness / Diameter</label>
                <span className="text-xs font-mono font-bold text-emerald-400">{formData.borderWidth ?? 10}px</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="2"
                  max="40"
                  step="1"
                  name="borderWidth"
                  value={formData.borderWidth ?? 10}
                  onChange={handleChange}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <input
                  type="number"
                  min="2"
                  max="40"
                  name="borderWidth"
                  value={formData.borderWidth ?? 10}
                  onChange={handleChange}
                  className="w-14 bg-slate-900 text-white rounded p-1 text-xs border border-slate-700 font-mono text-center"
                />
              </div>
              <div className="flex items-center space-x-1 pt-1">
                {[
                  { label: 'Fine (4px)', val: 4 },
                  { label: 'Std (10px)', val: 10 },
                  { label: 'Ind (18px)', val: 18 },
                  { label: 'Heavy (28px)', val: 28 }
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, borderWidth: p.val }))}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer ${
                      (formData.borderWidth ?? 10) === p.val
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-semibold">Turning Radius (Corner Fillet)</label>
                <span className="text-xs font-mono font-bold text-emerald-400">{formData.pipeCornerRadius ?? 14}px</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  name="pipeCornerRadius"
                  value={formData.pipeCornerRadius ?? 14}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeCornerRadius: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="30"
                  name="pipeCornerRadius"
                  value={formData.pipeCornerRadius ?? 14}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeCornerRadius: Number(e.target.value) }))}
                  className="w-14 bg-slate-900 text-white rounded p-1 text-xs border border-slate-700 font-mono text-center"
                />
              </div>
              <div className="flex items-center space-x-1 pt-1">
                {[
                  { label: 'Sharp (0px)', val: 0 },
                  { label: 'Std (14px)', val: 14 },
                  { label: 'Sweep (24px)', val: 24 }
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, pipeCornerRadius: p.val }))}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer ${
                      (formData.pipeCornerRadius ?? 14) === p.val
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Pipe End Fittings</label>
              <select
                name="pipeEndType"
                value={formData.pipeEndType || 'flange'}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeEndType: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700"
              >
                <option value="flange">🛠️ Flange End (Collar + Bolts)</option>
                <option value="round">⚪ Round End (Dome Cap)</option>
                <option value="triangle">🔺 Triangle End (Conical Nozzle)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Particle Animation Pattern</label>
              <select
                name="pipeAnimStyle"
                value={formData.pipeAnimStyle || 'bubbles'}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeAnimStyle: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700"
              >
                <option value="bubbles">🫧 Floating Bubbles Set (Multi-Size)</option>
                <option value="dashes">⚡ Pulse Dash Stream</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Flow Mechanics Direction</label>
              <select
                name="pipeFlowDirection"
                value={formData.pipeFlowDirection || 'ltr'}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeFlowDirection: e.target.value }))}
                className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700"
              >
                <option value="ltr">➔ Left to Right (LTR / Forward)</option>
                <option value="rtl">⬅️ Right to Left (RTL / Reverse)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Metallic Wall Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  name="borderColor"
                  value={formData.borderColor || '#06b6d4'}
                  onChange={handleChange}
                  className="w-9 h-8 bg-transparent cursor-pointer rounded border-0 outline-none"
                />
                <span className="text-xs font-mono text-slate-400">{formData.borderColor || '#06b6d4'}</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Fluid Particle Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  name="firstColor"
                  value={formData.firstColor || '#38bdf8'}
                  onChange={handleChange}
                  className="w-9 h-8 bg-transparent cursor-pointer rounded border-0 outline-none"
                />
                <span className="text-xs font-mono text-slate-400">{formData.firstColor || '#38bdf8'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
