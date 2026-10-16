import React from 'react';

interface PanelTextDisplaySectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const PanelTextDisplaySection: React.FC<PanelTextDisplaySectionProps> = ({
  formData,
  setFormData,
  handleChange
}) => {
  const intDigits = formData.scaleIntegerDigits ?? 2;
  const fracDigits = formData.scaleFractionDigits ?? 2;
  const divisor = formData.scaleDivisor || Math.pow(10, fracDigits) || 100;
  const exampleRaw = 5573;
  const exampleDisplay = (exampleRaw / divisor).toFixed(fracDigits);
  const formatSample = `${'9'.repeat(intDigits)}.${'9'.repeat(fracDigits)}`;

  return (
    <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#0c1626] p-4 rounded-xl border border-sky-500/30 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <i className="fas fa-desktop text-sky-400 text-xs"></i>
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            Text Display / Sensor Readout Settings
          </h3>
        </div>
        <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded font-mono border border-sky-500/20">
          Digital Readout
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Configure telemetry readout presentation and 16-bit PLC integer decimal scaling for this display element.
      </p>

      {/* ── Fixed Decimal / Scaled Integer Conversion (e.g. 16-bit PLC 5573 <-> Real 55.73) ── */}
      <div className="pt-2 border-t border-sky-900/40 space-y-3">
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
              className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-sky-300 flex items-center space-x-1.5">
              <i className="fas fa-divide text-[10px] text-sky-400"></i>
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
          Converts raw PLC 16-bit integer registers into real decimal format. Display divides received telemetry value by factor (e.g. 5573 ➔ 55.73 {formData.unit || ''}).
        </p>

        {formData.enableDecimalScaling && (
          <div className="bg-[#080f1a] border border-sky-500/30 rounded-xl p-3.5 space-y-3 shadow-inner">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative border-b border-gray-700 py-1">
                <label className="text-[11px] text-sky-400 font-semibold mb-1 flex items-center space-x-1">
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
                <label className="text-[11px] text-sky-400 font-semibold mb-1 flex items-center space-x-1">
                  <i className="fas fa-ellipsis text-[9px]"></i>
                  <span>Digit Fraction (Decimals / Scale)</span>
                </label>
                <select
                  name="scaleFractionDigits"
                  value={formData.scaleFractionDigits ?? 2}
                  onChange={(e) => {
                    const frac = parseInt(e.target.value) || 0;
                    const divisorVal = Math.pow(10, frac);
                    setFormData((prev: any) => ({
                      ...prev,
                      scaleFractionDigits: frac,
                      scaleDivisor: divisorVal,
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
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-300 font-mono text-[10px]">
                <span className="text-sky-400 font-bold">Visible Real Format:</span>
                <span className="bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30 font-bold tracking-wider">
                  {formatSample} ({intDigits} Int . {fracDigits} Frac)
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-700/50 text-[10px]">
                <span className="text-slate-400 block font-sans text-[9px]">PLC ➔ Screen (Readout):</span>
                <span className="text-emerald-300 font-mono font-bold text-xs">
                  {exampleRaw} <i className="fas fa-arrow-right text-[9px] mx-1.5 text-slate-500"></i> {exampleDisplay} {formData.unit || ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
