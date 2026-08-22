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
          </div>
        )}
      </div>
    </div>
  );
};
