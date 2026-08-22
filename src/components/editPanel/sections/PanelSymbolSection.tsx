import React from 'react';
import { PanelType } from '../../../types';

interface PanelSymbolSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleLowThresholdChange: (newLow: number) => void;
  handleHighThresholdChange: (newHigh: number) => void;
  setPickingColorFor: (target: 'first' | 'second' | 'third' | null) => void;
}

export const PanelSymbolSection: React.FC<PanelSymbolSectionProps> = ({
  formData,
  setFormData,
  handleChange,
  handleLowThresholdChange,
  handleHighThresholdChange,
  setPickingColorFor
}) => {
  if (formData.type !== PanelType.IMAGE && !formData.symbolId && !formData.symbolAnimType) {
    return null;
  }

  return (
    <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#0c1322] p-4 rounded-xl border border-sky-500/30">
      <div className="flex items-center justify-between">
        <label className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
          <i className="fas fa-industry text-xs text-sky-400"></i>
          <span>Industrial Symbol Animation & Alarming</span>
        </label>
        <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded font-mono border border-sky-500/20">
          TASC Symbol Library
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Configure real-time SVG animations, level indicator thresholds, low/high alarms, and digital ON/OFF state color behavior for this industrial equipment symbol.
      </p>

      {/* Symbol Animation Type Selector */}
      <div>
        <label className="text-xs text-slate-300 font-bold block mb-1">Symbol Animation Mode</label>
        <select
          name="symbolAnimType"
          value={formData.symbolAnimType || 'none'}
          onChange={handleChange}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs outline-none focus:border-sky-500 font-semibold"
        >
          <option value="none">🚫 Static Display (No Animation)</option>
          <option value="digital_on_off">🔴🟢 Digital ON/OFF State (Valves, Cutoff, Solenoids)</option>
          <option value="analog_level">📊 Analog Level Fill & Sight Glass (Tanks, Silos, Vessels)</option>
          <option value="analog_valve_angle">🔄 Control Valve Angle / Stem Travel (0° - 90°)</option>
          <option value="motor_rotation">🌀 Motor / Agitator Rotation (Pumps, Fans, Mixers)</option>
        </select>
      </div>

      {/* Digital ON/OFF State Config */}
      {(formData.symbolAnimType === 'digital_on_off' || formData.symbolAnimType === 'motor_rotation') && (
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-emerald-400 font-bold block mb-1">ON Payload Match</label>
              <input
                type="text"
                name="payloadOn"
                value={formData.payloadOn ?? '1'}
                onChange={handleChange}
                placeholder="e.g. 1 or RUNNING"
                className="w-full bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs px-2.5 py-1.5 rounded outline-none focus:border-emerald-500 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] text-rose-400 font-bold block mb-1">OFF Payload Match</label>
              <input
                type="text"
                name="payloadOff"
                value={formData.payloadOff ?? '0'}
                onChange={handleChange}
                placeholder="e.g. 0 or STOPPED"
                className="w-full bg-slate-950 border border-slate-800 text-rose-300 font-mono text-xs px-2.5 py-1.5 rounded outline-none focus:border-rose-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">ACTIVE (ON) Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.iconColorOn || '#10b981'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, iconColorOn: e.target.value }))}
                  className="w-8 h-7 bg-transparent cursor-pointer rounded border border-slate-700"
                />
                <span className="text-xs font-mono text-emerald-400 font-bold">{formData.iconColorOn || '#10b981'}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">INACTIVE (OFF) Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.iconColorOff || '#ef4444'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, iconColorOff: e.target.value }))}
                  className="w-8 h-7 bg-transparent cursor-pointer rounded border border-slate-700"
                />
                <span className="text-xs font-mono text-rose-400 font-bold">{formData.iconColorOff || '#ef4444'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analog Level & Alarm Config with Interlocked Limits */}
      {(formData.symbolAnimType === 'analog_level' || formData.symbolAnimType === 'analog_valve_angle') && (
        <div className="space-y-4 pt-3 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-sky-400 font-bold block mb-1">Payload Min Limit (0%)</label>
              <input
                type="number"
                name="payloadMin"
                value={formData.payloadMin ?? 0}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-sky-400 font-bold block mb-1">Payload Max Limit (100%)</label>
              <input
                type="number"
                name="payloadMax"
                value={formData.payloadMax ?? 100}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Symbol Segment Thresholds & Colors Card */}
          <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <i className="fas fa-palette text-xs"></i>
                <span>Symbol Segment Thresholds & Colors</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Interlocked Limits</span>
            </div>

            {/* Color Pickers & Zone Status Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => setPickingColorFor('first')} 
                className="flex flex-col items-center p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 cursor-pointer hover:border-amber-500/50 transition-all"
              >
                <div className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md mb-1" style={{ backgroundColor: formData.firstColor || '#10b981' }}></div>
                <span className="text-xs font-bold text-gray-200">Low Zone</span>
                <span className="text-[10px] text-gray-400 font-mono">{formData.payloadMin ?? 0} → {formData.lowThreshold ?? 33}</span>
              </div>

              <div 
                onClick={() => setPickingColorFor('second')} 
                className="flex flex-col items-center p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 cursor-pointer hover:border-amber-500/50 transition-all"
              >
                <div className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md mb-1" style={{ backgroundColor: formData.secondColor || '#f59e0b' }}></div>
                <span className="text-xs font-bold text-gray-200">Mid Zone</span>
                <span className="text-[10px] text-gray-400 font-mono">{formData.lowThreshold ?? 33} → {formData.highThreshold ?? 66}</span>
              </div>

              <div 
                onClick={() => setPickingColorFor('third')} 
                className="flex flex-col items-center p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 cursor-pointer hover:border-amber-500/50 transition-all"
              >
                <div className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md mb-1" style={{ backgroundColor: formData.thirdColor || '#ef4444' }}></div>
                <span className="text-xs font-bold text-gray-200">High Zone</span>
                <span className="text-[10px] text-gray-400 font-mono">{formData.highThreshold ?? 66} → {formData.payloadMax ?? 100}</span>
              </div>
            </div>

            {/* Visual Color Bar Preview */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-950 border border-gray-800">
              <div 
                style={{ 
                  width: `${Math.max(2, Math.min(100, (((formData.lowThreshold - (formData.payloadMin ?? 0)) / ((formData.payloadMax ?? 100) - (formData.payloadMin ?? 0) || 1)) * 100)))}%`, 
                  backgroundColor: formData.firstColor || '#10b981' 
                }} 
                title="Low Zone"
              ></div>
              <div 
                style={{ 
                  width: `${Math.max(2, Math.min(100, (((formData.highThreshold - formData.lowThreshold) / ((formData.payloadMax ?? 100) - (formData.payloadMin ?? 0) || 1)) * 100)))}%`, 
                  backgroundColor: formData.secondColor || '#f59e0b' 
                }} 
                title="Mid Zone"
              ></div>
              <div 
                style={{ flex: 1, backgroundColor: formData.thirdColor || '#ef4444' }} 
                title="High Zone"
              ></div>
            </div>

            {/* Interlocked Sliders & Inputs */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-semibold flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: formData.firstColor || '#10b981' }}></span>
                    <span>Low Cut-off (Low → Mid)</span>
                  </span>
                  <input 
                    type="number" 
                    value={formData.lowThreshold ?? 33}
                    onChange={(e) => handleLowThresholdChange(Number(e.target.value))}
                    className="w-16 bg-gray-950 text-white font-mono text-xs px-2 py-0.5 rounded border border-gray-700 text-right outline-none focus:border-amber-500"
                  />
                </div>
                <input 
                  type="range"
                  min={formData.payloadMin ?? 0}
                  max={formData.payloadMax ?? 100}
                  value={formData.lowThreshold ?? 33}
                  onChange={(e) => handleLowThresholdChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 font-semibold flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: formData.secondColor || '#f59e0b' }}></span>
                    <span>High Cut-off (Mid → High)</span>
                  </span>
                  <input 
                    type="number" 
                    value={formData.highThreshold ?? 66}
                    onChange={(e) => handleHighThresholdChange(Number(e.target.value))}
                    className="w-16 bg-gray-950 text-white font-mono text-xs px-2 py-0.5 rounded border border-gray-700 text-right outline-none focus:border-amber-500"
                  />
                </div>
                <input 
                  type="range"
                  min={formData.payloadMin ?? 0}
                  max={formData.payloadMax ?? 100}
                  value={formData.highThreshold ?? 66}
                  onChange={(e) => handleHighThresholdChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Inbuilt Alarm Triggers */}
            <div className="space-y-3 bg-[#161616] p-4 rounded-xl border border-amber-500/30 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-2">
                  <i className="fas fa-bell text-xs text-amber-400 animate-pulse"></i>
                  <span>Inbuilt Alarm Triggers</span>
                </label>
                <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded font-mono border border-amber-500/20">Selectable Tick Marks</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Select tick marks to enable alarms for Low, Mid, or High zones. When triggered, a live pop-up alert displays on screen and mobile devices generate a 5-second vibration haptic.
              </p>

              <div className="space-y-2.5 pt-1">
                {/* Low Alarm Checkbox */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-2 ${
                  formData.enableLowAlarm 
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm' 
                    : 'bg-gray-900/60 border-gray-800'
                }`}>
                  <label className="flex items-center space-x-3 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      name="enableLowAlarm"
                      checked={!!formData.enableLowAlarm}
                      onChange={handleChange}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: formData.firstColor || '#10b981' }}></span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200">Low Zone Alarm Tick</span>
                      <span className="text-[10px] text-gray-400 font-mono">(Val ≤ {formData.lowThreshold ?? 33})</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    name="lowAlarmMsg"
                    value={formData.lowAlarmMsg ?? ''}
                    onChange={handleChange}
                    placeholder="Low Zone Warning"
                    className="bg-gray-950 text-emerald-400 font-mono text-xs px-2.5 py-1.5 rounded border border-gray-800 outline-none w-full sm:w-48 focus:border-emerald-500"
                  />
                </div>

                {/* Mid Alarm Checkbox */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-2 ${
                  formData.enableMidAlarm 
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-sm' 
                    : 'bg-gray-900/60 border-gray-800'
                }`}>
                  <label className="flex items-center space-x-3 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      name="enableMidAlarm"
                      checked={!!formData.enableMidAlarm}
                      onChange={handleChange}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: formData.secondColor || '#f59e0b' }}></span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200">Mid Zone Alarm Tick</span>
                      <span className="text-[10px] text-gray-400 font-mono">({formData.lowThreshold ?? 33} &lt; Val ≤ {formData.highThreshold ?? 66})</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    name="midAlarmMsg"
                    value={formData.midAlarmMsg ?? ''}
                    onChange={handleChange}
                    placeholder="Mid Zone Warning"
                    className="bg-gray-950 text-amber-400 font-mono text-xs px-2.5 py-1.5 rounded border border-gray-800 outline-none w-full sm:w-48 focus:border-amber-500"
                  />
                </div>

                {/* High Alarm Checkbox */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-2 ${
                  formData.enableHighAlarm 
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-sm' 
                    : 'bg-gray-900/60 border-gray-800'
                }`}>
                  <label className="flex items-center space-x-3 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      name="enableHighAlarm"
                      checked={!!formData.enableHighAlarm}
                      onChange={handleChange}
                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                    />
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: formData.thirdColor || '#ef4444' }}></span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200">High Zone Alarm Tick</span>
                      <span className="text-[10px] text-gray-400 font-mono">(Val &gt; {formData.highThreshold ?? 66})</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    name="highAlarmMsg"
                    value={formData.highAlarmMsg ?? ''}
                    onChange={handleChange}
                    placeholder="High Critical Alarm"
                    className="bg-gray-950 text-rose-400 font-mono text-xs px-2.5 py-1.5 rounded border border-gray-800 outline-none w-full sm:w-48 focus:border-rose-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
