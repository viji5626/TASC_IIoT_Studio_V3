import React from 'react';
import { AppState } from '../../../types';
import TagAutocompleteInput from '../../TagAutocompleteInput';

interface PanelAlarmsSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  appState?: AppState;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleLowThresholdChange: (newLow: number) => void;
  handleHighThresholdChange: (newHigh: number) => void;
  setPickingColorFor: (target: 'first' | 'second' | 'third' | null) => void;
  isGauge: boolean;
  isStaticOrDecorative: boolean;
  isLineGraph: boolean;
}

export const PanelAlarmsSection: React.FC<PanelAlarmsSectionProps> = ({
  formData,
  setFormData,
  appState,
  handleChange,
  handleLowThresholdChange,
  handleHighThresholdChange,
  setPickingColorFor,
  isGauge,
  isStaticOrDecorative,
  isLineGraph
}) => {
  return (
    <div className="space-y-4">
      {/* Dedicated Equipment Trip Tag & Fault Alarm Controls */}
      {!isStaticOrDecorative && !isLineGraph && (
        <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#1a0f12] p-4 rounded-xl border border-red-500/40 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center space-x-2">
              <i className="fas fa-triangle-exclamation text-red-500 animate-pulse"></i>
              <span>Equipment Trip Tag & Fault Alarm Settings</span>
            </span>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="enableTrip"
                checked={!!formData.enableTrip}
                onChange={handleChange}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
              <span className="text-xs text-red-300 font-bold">Enable Trip Tag & Alarm</span>
            </label>
          </div>

          {formData.enableTrip && (
            <div className="space-y-3 pt-2">
              {/* Trip Read Tag JSONPath Query & Trigger Payload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <TagAutocompleteInput
                    name="tripJsonPath"
                    label="JSONPath Query (Read Tag for Equipment Trip State)"
                    tagType="read"
                    value={formData.tripJsonPath || ''}
                    onChange={(val) => setFormData((prev: any) => ({ ...prev, tripJsonPath: val }))}
                    appState={appState}
                    placeholder="e.g. $.d.pump_trip[0] or $.fault_status"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Extracts trip/fault value from incoming payload on primary topic
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Trip Trigger Payload Value
                  </label>
                  <input
                    type="text"
                    name="payloadTrip"
                    value={formData.payloadTrip !== undefined ? formData.payloadTrip : '1'}
                    onChange={handleChange}
                    placeholder="e.g. 1, TRIP, FAULT, TRUE"
                    className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-red-500/40 font-mono focus:border-red-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Triggers trip when extracted value matches (e.g. 1, TRIP, FAULT)
                  </span>
                </div>
              </div>

              {/* Optional Separate Topic Override */}
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  Optional Separate Trip Topic (Leave blank to use primary subscribe topic configured at top)
                </label>
                <input
                  type="text"
                  name="tripTopic"
                  value={formData.tripTopic || ''}
                  onChange={handleChange}
                  placeholder={formData.topic ? `Default (Primary Topic): ${formData.topic}` : 'e.g. factory/motor1/trip'}
                  className="w-full bg-slate-900/80 text-slate-300 rounded-lg p-2 text-xs border border-slate-800 font-mono focus:border-red-400 focus:outline-none"
                />
              </div>

              {/* Trip Alarm Message & Custom Hazard Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Trip Alarm Telemetry Message
                  </label>
                  <input
                    type="text"
                    name="tripMessage"
                    value={formData.tripMessage || ''}
                    onChange={handleChange}
                    placeholder="e.g. MOTOR OVERLOAD TRIP / FAULT"
                    className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-sans focus:border-red-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Trip Hazard Accent Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      name="tripColor"
                      value={formData.tripColor || '#ef4444'}
                      onChange={handleChange}
                      className="w-8 h-8 rounded border border-slate-700 bg-slate-900 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      name="tripColor"
                      value={formData.tripColor || '#ef4444'}
                      onChange={handleChange}
                      className="flex-1 bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Trip Animation Style */}
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Trip Animation & Visual Indicator Style
                </label>
                <select
                  name="tripAnimStyle"
                  value={formData.tripAnimStyle || 'flash_strobe'}
                  onChange={handleChange}
                  className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold focus:border-red-400 focus:outline-none"
                >
                  <option value="flash_strobe">⚡ High-Intensity Strobe Flash + TRIP Badge</option>
                  <option value="warning_pulse">⚠️ Pulsing Red Warning Glow</option>
                  <option value="red_hazard_border">🚨 Red Hazard Border Outline</option>
                  <option value="trip_badge">🏷️ Static TRIP / FAULT Badge Overlay</option>
                </select>
              </div>
            </div>
          )}

          {/* Telemetry Timeout & Disconnection Watchdog Section */}
          <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#17141f] p-4 rounded-xl border border-amber-500/40 shadow-inner mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-plug-circle-xmark text-amber-400 animate-pulse"></i>
                <span>Telemetry Timeout & Disconnection Watchdog</span>
              </span>
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="enableStaleTimeout"
                  checked={formData.enableStaleTimeout !== false}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, enableStaleTimeout: e.target.checked }))}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-xs text-amber-300 font-bold">
                  {formData.enableStaleTimeout !== false ? 'Watchdog Active' : 'Watchdog Disabled'}
                </span>
              </label>
            </div>

            {formData.enableStaleTimeout !== false && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">
                      Timeout Interval (Seconds)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="3600"
                        name="staleTimeoutSeconds"
                        value={formData.staleTimeoutSeconds ?? 10}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, staleTimeoutSeconds: Math.max(1, parseInt(e.target.value) || 10) }))}
                        className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-amber-500/40 font-mono focus:border-amber-400 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400 font-mono shrink-0">Sec</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Displays [OFFLINE / DISCONNECTED] badge if no telemetry payload is received for this interval.
                    </span>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="text-xs text-slate-400 font-semibold mb-1">Quick Timeout Presets:</label>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {[
                        { label: '3s (Ultra Speed)', val: 3 },
                        { label: '5s (Fast)', val: 5 },
                        { label: '10s (Standard)', val: 10 },
                        { label: '30s (Slow)', val: 30 }
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setFormData((prev: any) => ({ ...prev, staleTimeoutSeconds: preset.val }))}
                          className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                            (formData.staleTimeoutSeconds ?? 10) === preset.val
                              ? 'bg-amber-500/30 text-amber-200 border border-amber-500/80 font-bold'
                              : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/20">
                  <label className="flex items-center space-x-2 cursor-pointer select-none bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 hover:border-amber-500/50 transition-colors">
                    <input
                      type="checkbox"
                      name="showOfflineBadge"
                      checked={formData.showOfflineBadge !== false}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, showOfflineBadge: e.target.checked }))}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-200 font-bold flex items-center space-x-1.5">
                        <i className="fas fa-plug-circle-xmark text-[10px] text-amber-400"></i>
                        <span>Display OFFLINE Badge on Element</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Shows glowing [🔌 OFFLINE (Xs)] badge overlay on Grid and HMI Canvas View
                      </span>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Inbuilt Multi-Zone Thresholds & Alarms for Gauge / Progress / Text Display */}
      {isGauge && (
        <div className="space-y-4 bg-black/30 p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <i className="fas fa-palette text-xs"></i>
              <span>Gauge Segment Thresholds & Colors</span>
            </label>
            <span className="text-[10px] text-gray-400 font-mono">Interlocked Limits</span>
          </div>

          {/* Color Pickers & Zone Status */}
          <div className="grid grid-cols-3 gap-3">
            <div onClick={() => setPickingColorFor('first')} className="flex flex-col items-center p-2 rounded-lg bg-gray-900/80 border border-gray-800 cursor-pointer hover:border-amber-500/50 transition-all">
              <div className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md mb-1" style={{ backgroundColor: formData.firstColor }}></div>
              <span className="text-xs font-bold text-gray-200">Low Zone</span>
              <span className="text-[10px] text-gray-400 font-mono">{formData.payloadMin ?? 0} → {formData.lowThreshold}</span>
            </div>

            <div onClick={() => setPickingColorFor('second')} className="flex flex-col items-center p-2 rounded-lg bg-gray-900/80 border border-gray-800 cursor-pointer hover:border-amber-500/50 transition-all">
              <div className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md mb-1" style={{ backgroundColor: formData.secondColor }}></div>
              <span className="text-xs font-bold text-gray-200">Mid Zone</span>
              <span className="text-[10px] text-gray-400 font-mono">{formData.lowThreshold} → {formData.highThreshold}</span>
            </div>

            <div onClick={() => setPickingColorFor('third')} className="flex flex-col items-center p-2 rounded-lg bg-gray-900/80 border border-gray-800 cursor-pointer hover:border-amber-500/50 transition-all">
              <div className="w-7 h-7 rounded-full border-2 border-white/20 shadow-md mb-1" style={{ backgroundColor: formData.thirdColor }}></div>
              <span className="text-xs font-bold text-gray-200">High Zone</span>
              <span className="text-[10px] text-gray-400 font-mono">{formData.highThreshold} → {formData.payloadMax ?? 100}</span>
            </div>
          </div>

          {/* Visual Color Bar Preview */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-950 border border-gray-800">
            <div style={{ width: `${Math.max(2, Math.min(100, (((formData.lowThreshold - (formData.payloadMin ?? 0)) / ((formData.payloadMax ?? 100) - (formData.payloadMin ?? 0) || 1)) * 100)))}%`, backgroundColor: formData.firstColor }} title="Low Zone"></div>
            <div style={{ width: `${Math.max(2, Math.min(100, (((formData.highThreshold - formData.lowThreshold) / ((formData.payloadMax ?? 100) - (formData.payloadMin ?? 0) || 1)) * 100)))}%`, backgroundColor: formData.secondColor }} title="Mid Zone"></div>
            <div style={{ flex: 1, backgroundColor: formData.thirdColor }} title="High Zone"></div>
          </div>

          {/* Sliders & Numeric Inputs */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-semibold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: formData.firstColor }}></span>
                  <span>Low Cut-off (Low → Mid)</span>
                </span>
                <input 
                  type="number" 
                  value={formData.lowThreshold}
                  onChange={(e) => handleLowThresholdChange(Number(e.target.value))}
                  className="w-16 bg-gray-950 text-white font-mono text-xs px-2 py-0.5 rounded border border-gray-700 text-right outline-none focus:border-amber-500"
                />
              </div>
              <input 
                type="range"
                min={formData.payloadMin ?? 0}
                max={formData.payloadMax ?? 100}
                value={formData.lowThreshold}
                onChange={(e) => handleLowThresholdChange(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-semibold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: formData.secondColor }}></span>
                  <span>High Cut-off (Mid → High)</span>
                </span>
                <input 
                  type="number" 
                  value={formData.highThreshold}
                  onChange={(e) => handleHighThresholdChange(Number(e.target.value))}
                  className="w-16 bg-gray-950 text-white font-mono text-xs px-2 py-0.5 rounded border border-gray-700 text-right outline-none focus:border-amber-500"
                />
              </div>
              <input 
                type="range"
                min={formData.payloadMin ?? 0}
                max={formData.payloadMax ?? 100}
                value={formData.highThreshold}
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
                  placeholder="Low Value Warning"
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
      )}
    </div>
  );
};
