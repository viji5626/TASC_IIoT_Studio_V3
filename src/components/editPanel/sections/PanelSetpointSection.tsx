import React from 'react';

interface PanelSetpointSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isSlider: boolean;
  isTextInput: boolean;
}

export const PanelSetpointSection: React.FC<PanelSetpointSectionProps> = ({
  formData,
  setFormData,
  handleChange,
  isSlider,
  isTextInput
}) => {
  return (
    <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#161616] p-4 rounded-xl border border-sky-500/30">
      <div className="flex items-center justify-between">
        <label className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
          <i className="fas fa-sliders text-xs text-sky-400"></i>
          <span>Setpoint Input Limits (Min ↔ Max)</span>
        </label>
        <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded font-mono border border-sky-500/20">Input Range Protection</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Define allowed setpoint limits. The system will prevent sending values outside this range (e.g. if set between 0 &lt;&gt; 100, entering 101 or -5 will be blocked).
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative border-b border-gray-700 py-2">
          <label className="text-xs text-amber-500 absolute -top-2">Min Setpoint Limit *</label>
          <input type="number" name="payloadMin" value={formData.payloadMin ?? 0} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" />
        </div>
        <div className="relative border-b border-gray-700 py-2">
          <label className="text-xs text-amber-500 absolute -top-2">Max Setpoint Limit *</label>
          <input type="number" name="payloadMax" value={formData.payloadMax ?? 100} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-1">
        <div className="relative border-b border-gray-700 py-2">
          <label className="text-xs text-gray-400 absolute -top-2">Unit Symbol</label>
          <input name="unit" value={formData.unit ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" placeholder="e.g. °C, %, RPM, kW" />
        </div>
        {isSlider && (
          <div className="relative border-b border-gray-700 py-2">
            <label className="text-xs text-gray-400 absolute -top-2">Step Size</label>
            <input type="number" name="sliderStep" value={formData.sliderStep ?? 1} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2 font-mono" placeholder="1" />
          </div>
        )}
        {isTextInput && (
          <div className="space-y-3 pt-3 col-span-2 border-t border-gray-800">
            <label className="text-xs text-amber-400 font-bold block">Input Data Type</label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-200 select-none">
                <input
                  type="radio"
                  name="dataType"
                  value="number"
                  checked={(formData.dataType || 'number') === 'number'}
                  onChange={() => setFormData((prev: any) => ({ ...prev, dataType: 'number' }))}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <span className="font-semibold">Number (Numeric Setpoint)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-200 select-none">
                <input
                  type="radio"
                  name="dataType"
                  value="text"
                  checked={formData.dataType === 'text'}
                  onChange={() => setFormData((prev: any) => ({ ...prev, dataType: 'text' }))}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
                <span className="font-semibold">Text (Alpha-Numeric String)</span>
              </label>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300 select-none">
                <input type="checkbox" name="clearOnPublish" checked={!!formData.clearOnPublish} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
                <span>Clear text on send</span>
              </label>
            </div>

            {/* ── Fixed Decimal / Scaled Integer Conversion (e.g. 16-bit PLC 5573 <-> Real 55.73) ── */}
            {(formData.dataType || 'number') === 'number' && (
              <div className="pt-3 border-t border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="enableDecimalScaling"
                      checked={!!formData.enableDecimalScaling}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const frac = formData.scaleFractionDigits ?? 2;
                        setFormData((prev: any) => ({
                          ...prev,
                          enableDecimalScaling: checked,
                          scaleIntegerDigits: prev.scaleIntegerDigits ?? 2,
                          scaleFractionDigits: frac,
                          scaleDivisor: Math.pow(10, frac),
                          decimalPrecision: frac
                        }));
                      }}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                      <i className="fas fa-divide text-[10px] text-amber-400"></i>
                      <span>Enable Decimal Scaling (PLC 16-bit Scaled Integer)</span>
                    </span>
                  </label>
                  {formData.enableDecimalScaling && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                      ÷ {formData.scaleDivisor || Math.pow(10, formData.scaleFractionDigits ?? 2) || 100} Scaling Active
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Converts raw PLC 16-bit integer registers into real decimal format. Display divides received value by factor (e.g. 5573 ➔ 55.73), and Send multiplies back into a raw integer string ("5573").
                </p>

                {formData.enableDecimalScaling && (
                  <div className="bg-[#121212] border border-amber-500/30 rounded-xl p-3.5 space-y-3 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative border-b border-gray-700 py-1">
                        <label className="text-[11px] text-amber-400 font-semibold mb-1 flex items-center space-x-1">
                          <i className="fas fa-hashtag text-[9px]"></i>
                          <span>Digit Integer (Before Decimal)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          name="scaleIntegerDigits"
                          value={formData.scaleIntegerDigits ?? 2}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(8, parseInt(e.target.value) || 2));
                            setFormData((prev: any) => ({ ...prev, scaleIntegerDigits: val }));
                          }}
                          className="w-full bg-transparent outline-none text-white py-1.5 font-mono text-xs"
                          placeholder="2"
                        />
                        <span className="text-[9px] text-slate-500">Integer digits (e.g. 2 digits = 0..99)</span>
                      </div>

                      <div className="relative border-b border-gray-700 py-1">
                        <label className="text-[11px] text-amber-400 font-semibold mb-1 flex items-center space-x-1">
                          <i className="fas fa-ellipsis text-[9px]"></i>
                          <span>Digit Fraction (Decimals / Scale)</span>
                        </label>
                        <select
                          name="scaleFractionDigits"
                          value={formData.scaleFractionDigits ?? 2}
                          onChange={(e) => {
                            const frac = parseInt(e.target.value) || 0;
                            const divisor = Math.pow(10, frac);
                            setFormData((prev: any) => ({
                              ...prev,
                              scaleFractionDigits: frac,
                              scaleDivisor: divisor,
                              decimalPrecision: frac
                            }));
                          }}
                          className="w-full bg-[#1e1e1e] border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-xs outline-none cursor-pointer"
                        >
                          <option value="1">1 Decimal (÷ 10, e.g. 55.7)</option>
                          <option value="2">2 Decimals (÷ 100, e.g. 55.73)</option>
                          <option value="3">3 Decimals (÷ 1000, e.g. 55.730)</option>
                          <option value="4">4 Decimals (÷ 10000, e.g. 55.7300)</option>
                        </select>
                        <span className="text-[9px] text-slate-500">Decimal fraction places &amp; divisor factor</span>
                      </div>
                    </div>

                    {/* Live Formula & Example Preview Box */}
                    {(() => {
                      const intDigits = formData.scaleIntegerDigits ?? 2;
                      const fracDigits = formData.scaleFractionDigits ?? 2;
                      const divisor = formData.scaleDivisor || Math.pow(10, fracDigits) || 100;
                      const exampleRaw = 5573;
                      const exampleDisplay = (exampleRaw / divisor).toFixed(fracDigits);
                      const formatSample = `${'9'.repeat(intDigits)}.${'9'.repeat(fracDigits)}`;

                      return (
                        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between text-slate-300 font-mono text-[10px]">
                            <span className="text-amber-400 font-bold">Visible Real Format:</span>
                            <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-bold tracking-wider">
                              {formatSample} ({intDigits} Int . {fracDigits} Frac)
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/80">
                            <div className="bg-slate-900/90 p-1.5 rounded border border-slate-700/50">
                              <span className="text-slate-400 block font-sans text-[9px]">PLC ➔ Screen (Read):</span>
                              <span className="text-emerald-300 font-mono font-bold">
                                {exampleRaw} <i className="fas fa-arrow-right text-[8px] mx-1 text-slate-500"></i> {exampleDisplay} {formData.unit || ''}
                              </span>
                            </div>
                            <div className="bg-slate-900/90 p-1.5 rounded border border-slate-700/50">
                              <span className="text-slate-400 block font-sans text-[9px]">Operator ➔ PLC (Send):</span>
                              <span className="text-amber-300 font-mono font-bold">
                                "{exampleDisplay}" <i className="fas fa-arrow-right text-[8px] mx-1 text-slate-500"></i> "{exampleRaw}"
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
