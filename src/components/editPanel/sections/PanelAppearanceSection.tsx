import React, { useState } from 'react';
import { AppState, PanelType } from '../../../types';
import TagAutocompleteInput from '../../TagAutocompleteInput';

interface PanelAppearanceSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  appState?: AppState;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isActionable: boolean;
  isStaticText: boolean;
  isImage: boolean;
  isClock: boolean;
  isPipe: boolean;
  isShape: boolean;
  isScreenJump: boolean;
  isLED?: boolean;
  isSwitch?: boolean;
  dataSourceMode: 'mqtt' | 'driver';
}

export const PanelAppearanceSection: React.FC<PanelAppearanceSectionProps> = ({
  formData,
  setFormData,
  appState,
  handleChange,
  isActionable,
  isStaticText,
  isImage,
  isClock,
  isPipe,
  isShape,
  isScreenJump,
  isLED,
  isSwitch,
  dataSourceMode
}) => {
  const isActuallyLED = isLED ?? (formData.type === PanelType.LED);
  const isActuallySwitch = isSwitch ?? (formData.type === PanelType.SWITCH);

  // Retractable sections (all retracted by default)
  const [isTypographyExpanded, setIsTypographyExpanded] = useState<boolean>(false);
  const [isDimensionsExpanded, setIsDimensionsExpanded] = useState<boolean>(false);
  const [isJsonExpanded, setIsJsonExpanded] = useState<boolean>(false);

  return (
    <div className="space-y-3">
      {/* ─── SENSOR / ELEMENT NAME ALIGNMENT ─── */}
      <div className="bg-[#121824] p-3 rounded-xl border border-sky-500/30 flex items-center justify-between">
        <span className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
          <i className="fas fa-align-center text-sky-400"></i>
          <span>Sensor Name Alignment</span>
        </span>
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              type="button"
              onClick={() => setFormData((prev: any) => ({ ...prev, textAlign: align }))}
              className={`px-2.5 py-1 rounded text-xs font-bold uppercase flex items-center space-x-1.5 transition-all cursor-pointer ${
                (formData.textAlign || 'left') === align
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className={`fas fa-align-${align} text-[10px]`}></i>
              <span className="capitalize">{align}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── LED INDICATOR: DEDICATED INDICATION ICON SIZE ─── */}
      {isActuallyLED && (
        <div className="bg-[#0f172a] p-3.5 rounded-xl border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center space-x-2">
              <i className="fas fa-icons text-emerald-400"></i>
              <span>Indication Icon Size</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              {formData.iconSize ?? 24} px
            </span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, iconSize: Math.max(12, (parseInt(String(prev.iconSize ?? 24)) || 24) - 2) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Decrease Icon Size (-2px)"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>

              <input
                type="number"
                min="12"
                max="128"
                name="iconSize"
                value={formData.iconSize ?? 24}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, iconSize: Math.max(12, Math.min(128, parseInt(e.target.value) || 24)) }))}
                className="w-14 bg-transparent text-center text-white font-mono font-bold text-xs outline-none"
              />

              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, iconSize: Math.min(128, (parseInt(String(prev.iconSize ?? 24)) || 24) + 2) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Increase Icon Size (+2px)"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {[16, 20, 24, 28, 32, 40, 48, 64].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, iconSize: size }))}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                    (parseInt(String(formData.iconSize ?? 24)) || 24) === size
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/80 font-bold shadow'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── LED INDICATOR: DEDICATED TEXT & LABEL FONT SIZE ─── */}
      {isActuallyLED && (
        <div className="bg-[#0b1329] p-3.5 rounded-xl border border-sky-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
              <i className="fas fa-font text-sky-400"></i>
              <span>Indicator Label & Text Font Size</span>
            </span>
            <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
              {formData.fontSize ?? 12} px
            </span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.max(8, (parseInt(String(prev.fontSize ?? 12)) || 12) - 2) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Decrease Font Size (-2px)"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>

              <input
                type="number"
                min="8"
                max="72"
                name="fontSize"
                value={formData.fontSize ?? 12}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, fontSize: Math.max(8, Math.min(72, parseInt(e.target.value) || 12)) }))}
                className="w-14 bg-transparent text-center text-white font-mono font-bold text-xs outline-none"
              />

              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.min(72, (parseInt(String(prev.fontSize ?? 12)) || 12) + 2) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Increase Font Size (+2px)"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {[10, 12, 14, 16, 18, 20, 24, 28].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: size }))}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                    (parseInt(String(formData.fontSize ?? 12)) || 12) === size
                      ? 'bg-sky-500/30 text-sky-200 border border-sky-500/80 font-bold shadow'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TOGGLE SWITCH: DEDICATED TOGGLE SWITCH SIZE ─── */}
      {isActuallySwitch && (
        <div className="bg-[#0f172a] p-3.5 rounded-xl border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center space-x-2">
              <i className="fas fa-toggle-on text-emerald-400"></i>
              <span>Toggle Switch Size</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              {formData.switchSize ?? 48} px
            </span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, switchSize: Math.max(28, (parseInt(String(prev.switchSize ?? 48)) || 48) - 4) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Decrease Switch Size (-4px)"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>

              <input
                type="number"
                min="28"
                max="120"
                name="switchSize"
                value={formData.switchSize ?? 48}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, switchSize: Math.max(28, Math.min(120, parseInt(e.target.value) || 48)) }))}
                className="w-14 bg-transparent text-center text-white font-mono font-bold text-xs outline-none"
              />

              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, switchSize: Math.min(120, (parseInt(String(prev.switchSize ?? 48)) || 48) + 4) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Increase Switch Size (+4px)"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {[
                { label: 'Small (36px)', val: 36 },
                { label: 'Medium (48px)', val: 48 },
                { label: 'Large (64px)', val: 64 },
                { label: 'X-Large (80px)', val: 80 }
              ].map(preset => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, switchSize: preset.val }))}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                    (parseInt(String(formData.switchSize ?? 48)) || 48) === preset.val
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/80 font-bold shadow'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TOGGLE SWITCH: DEDICATED TEXT & LABEL FONT SIZE ─── */}
      {isActuallySwitch && (
        <div className="bg-[#0b1329] p-3.5 rounded-xl border border-sky-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
              <i className="fas fa-font text-sky-400"></i>
              <span>Switch Label & Text Font Size</span>
            </span>
            <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
              {formData.fontSize ?? 12} px
            </span>
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.max(8, (parseInt(String(prev.fontSize ?? 12)) || 12) - 2) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Decrease Font Size (-2px)"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>

              <input
                type="number"
                min="8"
                max="72"
                name="fontSize"
                value={formData.fontSize ?? 12}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, fontSize: Math.max(8, Math.min(72, parseInt(e.target.value) || 12)) }))}
                className="w-14 bg-transparent text-center text-white font-mono font-bold text-xs outline-none"
              />

              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.min(72, (parseInt(String(prev.fontSize ?? 12)) || 12) + 2) }))}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                title="Increase Font Size (+2px)"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {[10, 12, 14, 16, 18, 20, 24, 28].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: size }))}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                    (parseInt(String(formData.fontSize ?? 12)) || 12) === size
                      ? 'bg-sky-500/30 text-sky-200 border border-sky-500/80 font-bold shadow'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SCREEN JUMP BUTTON LABEL FONT SIZE ─── */}
      {isScreenJump && (
        <div className="bg-[#0c1829] rounded-xl border border-sky-500/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fas fa-font text-sky-400 text-xs"></i>
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider">
                Button Label & Text Font Size
              </span>
            </div>
            <span className="text-xs font-mono text-sky-300 font-bold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
              {formData.fontSize ?? 14} px
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.max(10, (parseInt(String(prev.fontSize ?? 14)) || 14) - 2) }))}
                className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer transition-colors"
                title="Decrease Font Size (-2px)"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="w-10 text-center font-mono text-xs font-bold text-white">
                {formData.fontSize ?? 14}
              </span>
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.min(36, (parseInt(String(prev.fontSize ?? 14)) || 14) + 2) }))}
                className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer transition-colors"
                title="Increase Font Size (+2px)"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {[11, 12, 14, 16, 18, 20, 24].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: size }))}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                    (parseInt(String(formData.fontSize ?? 14)) || 14) === size
                      ? 'bg-sky-500/30 text-sky-200 border border-sky-500/80 font-bold shadow'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── PROCESS VALUE FONT SIZE & TYPOGRAPHY (RETRACTABLE, FOR GAUGES & OTHER ELEMENTS) ─── */}
      {!isStaticText && !isClock && !isPipe && !isShape && !isScreenJump && !isActuallyLED && !isActuallySwitch && (
        <div className="bg-[#0d1520] rounded-xl border border-sky-500/40 shadow-inner overflow-hidden transition-all">
          <div
            onClick={() => setIsTypographyExpanded(!isTypographyExpanded)}
            className="p-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-sky-500/10 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <i className={`fas fa-chevron-${isTypographyExpanded ? 'down' : 'right'} text-sky-400 text-xs transition-transform duration-200`}></i>
              <i className="fas fa-text-height text-sky-400"></i>
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider">
                Process Value Font Size & Typography
              </span>
            </div>
            <span className="text-xs font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
              {formData.fontSize ?? 18} px
            </span>
          </div>

          {isTypographyExpanded && (
            <div className="p-4 pt-2 space-y-3 border-t border-sky-500/20">
              <div className="flex items-center space-x-3 pt-1">
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.max(8, (parseInt(String(prev.fontSize ?? 18)) || 18) - 2) }))}
                    className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                    title="Decrease Font Size (-2px)"
                  >
                    <i className="fas fa-minus text-xs"></i>
                  </button>

                  <input
                    type="number"
                    min="8"
                    max="120"
                    name="fontSize"
                    value={formData.fontSize ?? 18}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, fontSize: parseInt(e.target.value) || 18 }))}
                    className="w-14 bg-transparent text-center text-white font-mono font-bold text-xs outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: Math.min(120, (parseInt(String(prev.fontSize ?? 18)) || 18) + 2) }))}
                    className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-black text-base flex items-center justify-center transition-colors cursor-pointer"
                    title="Increase Font Size (+2px)"
                  >
                    <i className="fas fa-plus text-xs"></i>
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  {[12, 16, 18, 20, 24, 28, 36, 48].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, fontSize: size }))}
                      className={`px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                        (parseInt(String(formData.fontSize ?? 18)) || 18) === size
                          ? 'bg-sky-500/30 text-sky-200 border border-sky-500/80 font-bold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CARD SIZE / LAYOUT DIMENSIONS (RETRACTABLE, HIDDEN FOR LED, SWITCH & SCREEN JUMP) ─── */}
      {!isActuallyLED && !isActuallySwitch && !isScreenJump && (
        <div className="bg-[#141414] rounded-xl border border-gray-800 overflow-hidden transition-all">
          <div
            onClick={() => setIsDimensionsExpanded(!isDimensionsExpanded)}
            className="p-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <i className={`fas fa-chevron-${isDimensionsExpanded ? 'down' : 'right'} text-amber-400 text-xs transition-transform duration-200`}></i>
              <i className="fas fa-expand text-xs text-amber-500"></i>
              <span className="text-xs text-amber-500 font-semibold">Element Dimensions & Size</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">
              {formData.colSpan ?? 1} Col × {formData.rowSpan ?? 1} Row
            </span>
          </div>

          {isDimensionsExpanded && (
            <div className="p-4 pt-2 space-y-3 border-t border-gray-800/80">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-gray-400 block mb-1">Width Span</span>
                  <select 
                    name="colSpan" 
                    value={formData.colSpan ?? 1} 
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, colSpan: Number(e.target.value) }))}
                    className="w-full bg-[#1a1a1a] text-white border border-gray-700 outline-none rounded-lg p-2 text-xs"
                  >
                    <option value="1">1 Column (Standard)</option>
                    <option value="2">2 Columns (Wide)</option>
                    <option value="3">3 Columns (Extra Wide)</option>
                    <option value="4">4 Columns (Full Row)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 block mb-1">Height Span</span>
                  <select 
                    name="rowSpan" 
                    value={formData.rowSpan ?? 1} 
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, rowSpan: Number(e.target.value) }))}
                    className="w-full bg-[#1a1a1a] text-white border border-gray-700 outline-none rounded-lg p-2 text-xs"
                  >
                    <option value="0">Slim / Sleek (Height 112px)</option>
                    <option value="1">Standard (Height 176px)</option>
                    <option value="2">Tall (Height 288px)</option>
                    <option value="3">Large (Height 384px)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── JSONPATH PAYLOAD PARSER & PUBLISH (RETRACTABLE) ─── */}
      {!isStaticText && !isImage && !isClock && !isPipe && !isShape && !isScreenJump && formData.type !== PanelType.LINE_GRAPH && dataSourceMode !== 'driver' && (
        <div className="bg-[#141414] rounded-xl border border-gray-800 overflow-hidden transition-all">
          <div
            onClick={() => setIsJsonExpanded(!isJsonExpanded)}
            className="p-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <i className={`fas fa-chevron-${isJsonExpanded ? 'down' : 'right'} text-amber-400 text-xs transition-transform duration-200`}></i>
              <i className="fas fa-code text-xs text-amber-500"></i>
              <span className="text-xs text-gray-300 font-medium">JSONPath Payload Extraction & Pattern</span>
            </div>
            {formData.isJSONPayload && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                JSON Active
              </span>
            )}
          </div>

          {isJsonExpanded && (
            <div className="p-4 pt-2 space-y-3 border-t border-gray-800/80">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="isJSONPayload"
                  name="isJSONPayload" 
                  checked={formData.isJSONPayload || false} 
                  onChange={handleChange} 
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer" 
                />
                <label htmlFor="isJSONPayload" className="text-sm text-gray-300 font-medium cursor-pointer">
                  Payload is JSON Data / Extract using JSONPath
                </label>
              </div>

              {formData.isJSONPayload && (
                <div className="space-y-2">
                  <TagAutocompleteInput
                    name="jsonPath"
                    label="JSONPath Query (Read Tag for Incoming Subscriptions)"
                    tagType="read"
                    value={formData.jsonPath || ''}
                    onChange={(val) => setFormData((prev: any) => ({ ...prev, jsonPath: val, isJSONPayload: true }))}
                    appState={appState}
                    placeholder="e.g. $.d.sensor_val[0] or $.temperature"
                  />
                  <div className="text-[11px] text-gray-400 bg-gray-900/90 p-3 rounded-lg border border-gray-800/80 space-y-1">
                    <p className="font-semibold text-amber-400 flex items-center space-x-1">
                      <i className="fas fa-circle-info text-[10px]"></i>
                      <span>JSONPath Guidance for incoming JSON:</span>
                    </p>
                    <p className="text-gray-300 font-mono text-[10px] bg-black/40 px-2 py-1 rounded">
                      {`{"ID":"...", "d":{"sensor_val":[65]}}`}
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-300 text-[11px]">
                      <li>Array value: <code className="text-amber-300 font-mono">$.d.sensor_val[0]</code> → extracts <code className="text-emerald-400 font-bold">65</code></li>
                      <li>Nested property: <code className="text-amber-300 font-mono">$.d.sensor_val</code> → auto-unpacks <code className="text-emerald-400 font-bold">65</code></li>
                    </ul>
                  </div>
                </div>
              )}

              {/* JSON Pattern for Publish (Outbound) - Only for Actionable Widgets */}
              {isActionable && (
                <div className="space-y-2 pt-2 border-t border-gray-800/60">
                  <TagAutocompleteInput
                    name="publishPattern"
                    label="JSON Pattern for Publish (Write Tag for Outbound Payloads)"
                    tagType="write"
                    value={formData.publishPattern || ''}
                    onChange={(val) => setFormData((prev: any) => ({ ...prev, publishPattern: val }))}
                    appState={appState}
                    placeholder='e.g. { "d": { "sensor_val": [<payload>] } }'
                  />

                  {/* Quick Template Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-400 font-medium mr-1">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, publishPattern: '{ "d": { "sensor_val": [<payload>] } }' }))}
                      className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-300 rounded text-[10px] font-mono hover:bg-sky-500/20 cursor-pointer"
                    >
                      {`{ "d": { "sensor_val": [<payload>] } }`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, publishPattern: '{ "value": <payload> }' }))}
                      className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-mono hover:bg-slate-700 cursor-pointer"
                    >
                      {`{ "value": <payload> }`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TIMESTAMP DISPLAY & QOS FLAGS ─── */}
      {!isStaticText && !isImage && !isClock && !isPipe && !isShape && !isScreenJump && (
        <div className={`grid grid-cols-1 ${isActionable ? 'sm:grid-cols-2' : ''} gap-3 pt-2`}>
          <div className="flex items-center space-x-3 bg-[#171717] p-2.5 rounded-lg border border-gray-800">
            <input type="checkbox" id="showReceivedTimeStamp" name="showReceivedTimeStamp" checked={formData.showReceivedTimeStamp ?? true} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
            <label htmlFor="showReceivedTimeStamp" className="text-gray-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer">
              <i className="fas fa-clock text-emerald-400 text-[10px]"></i>
              <span>Show Subscribed (Rx) 24h Time</span>
            </label>
          </div>
          {isActionable && (
            <div className="flex items-center space-x-3 bg-[#171717] p-2.5 rounded-lg border border-gray-800">
              <input type="checkbox" id="showSentTimeStamp" name="showSentTimeStamp" checked={formData.showSentTimeStamp ?? true} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
              <label htmlFor="showSentTimeStamp" className="text-gray-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer">
                <i className="fas fa-paper-plane text-amber-400 text-[10px]"></i>
                <span>Show Published (Tx) 24h Time</span>
              </label>
            </div>
          )}
        </div>
      )}

      {isActionable && (
        <>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center space-x-3 bg-[#171717] p-2.5 rounded-lg border border-gray-800">
              <input type="checkbox" id="confirmPublish" name="confirmPublish" checked={formData.confirmPublish || false} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
              <label htmlFor="confirmPublish" className="text-gray-300 text-xs font-semibold cursor-pointer">Confirm Before Publish</label>
            </div>
            {formData.type === PanelType.TEXT_INPUT && (
              <div className="flex items-center space-x-3 bg-[#171717] p-2.5 rounded-lg border border-gray-800">
                <input type="checkbox" id="clearOnPublish" name="clearOnPublish" checked={formData.clearOnPublish || false} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
                <label htmlFor="clearOnPublish" className="text-gray-300 text-xs font-semibold cursor-pointer">Clear Text on Publish</label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center space-x-3 bg-[#171717] p-2.5 rounded-lg border border-gray-800">
              <span className="text-gray-300 text-xs font-semibold">QoS Level</span>
              <select name="qos" value={formData.qos ?? 0} onChange={handleChange} className="bg-[#1a1a1a] text-white border border-gray-700 outline-none rounded p-1 text-xs">
                <option value="0">QoS 0 (At most once)</option>
                <option value="1">QoS 1 (At least once)</option>
                <option value="2">QoS 2 (Exactly once)</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
