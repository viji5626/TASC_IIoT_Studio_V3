import React from 'react';

interface OptionItem {
  label: string;
  value: string;
}

interface PanelOptionsEditorProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  optionItems: OptionItem[];
  setOptionItems: React.Dispatch<React.SetStateAction<OptionItem[]>>;
  optionsStr: string;
  setOptionsStr: React.Dispatch<React.SetStateAction<string>>;
  isRadioButtons: boolean;
  isComboBox: boolean;
}

export const PanelOptionsEditor: React.FC<PanelOptionsEditorProps> = ({
  formData,
  setFormData,
  optionItems,
  setOptionItems,
  optionsStr,
  setOptionsStr,
  isRadioButtons,
  isComboBox
}) => {
  const updateOptionItem = (index: number, field: 'label' | 'value', value: string) => {
    const updated = optionItems.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setOptionItems(updated);
    const optsStrArray = updated.map(o => `${o.label}:${o.value}`);
    setOptionsStr(optsStrArray.join(', '));
    setFormData((prev: any) => ({
      ...prev,
      optionItems: updated,
      options: optsStrArray
    }));
  };

  const addOptionItem = () => {
    const newIdx = optionItems.length + 1;
    const updated = [...optionItems, { label: `Selection ${newIdx}`, value: `${newIdx * 10}` }];
    setOptionItems(updated);
    const optsStrArray = updated.map(o => `${o.label}:${o.value}`);
    setOptionsStr(optsStrArray.join(', '));
    setFormData((prev: any) => ({
      ...prev,
      optionItems: updated,
      options: optsStrArray
    }));
  };

  const removeOptionItem = (index: number) => {
    if (optionItems.length <= 1) return;
    const updated = optionItems.filter((_, idx) => idx !== index);
    setOptionItems(updated);
    const optsStrArray = updated.map(o => `${o.label}:${o.value}`);
    setOptionsStr(optsStrArray.join(', '));
    setFormData((prev: any) => ({
      ...prev,
      optionItems: updated,
      options: optsStrArray
    }));
  };

  const handleOptionsChange = (val: string) => {
    setOptionsStr(val);
    const parsedOptions: OptionItem[] = val.split(',').map(s => {
      const parts = s.split(':');
      return {
        label: parts[0]?.trim() || '',
        value: parts[1]?.trim() || parts[0]?.trim() || ''
      };
    }).filter(o => o.label !== '');

    setOptionItems(parsedOptions);
    setFormData((prev: any) => ({
      ...prev,
      options: val.split(',').map(s => s.trim()).filter(Boolean),
      optionItems: parsedOptions
    }));
  };

  return (
    <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#161616] p-4 rounded-xl border border-amber-500/30">
      <div className="flex items-center justify-between">
        <label className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-2">
          <i className="fas fa-list-check text-xs text-amber-400"></i>
          <span>{isRadioButtons ? 'Radio Button Selections & Tags' : isComboBox ? 'Combo Box Dropdown Options' : 'Multi-State Options'}</span>
        </label>
        <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded font-mono border border-amber-500/20">Publisher & Subscriber Tags</span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Define the selection labels and corresponding MQTT payload values. When an option is selected from the {isRadioButtons ? 'radio button group' : 'dropdown'}, its assigned payload value will be published to the MQTT topic.
      </p>

      <div className="space-y-2">
        {optionItems.map((opt, idx) => (
          <div key={idx} className="flex items-center space-x-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-amber-500 font-bold font-mono w-6 shrink-0">#{idx + 1}</span>
            <div className="flex-1">
              <label className="text-[9px] text-slate-400 block mb-0.5">Label</label>
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOptionItem(idx, 'label', e.target.value)}
                placeholder={`Selection ${idx + 1}`}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-2.5 py-1.5 rounded outline-none focus:border-amber-500 font-semibold"
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] text-amber-400 block mb-0.5">Payload Value</label>
              <input
                type="text"
                value={opt.value}
                onChange={(e) => updateOptionItem(idx, 'value', e.target.value)}
                placeholder={`e.g. ${(idx + 1) * 20}`}
                className="w-full bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs px-2.5 py-1.5 rounded outline-none focus:border-amber-500 font-bold"
              />
            </div>
            <button
              type="button"
              onClick={() => removeOptionItem(idx)}
              className="p-2 text-slate-500 hover:text-rose-400 rounded transition-colors"
              title="Remove Option"
            >
              <i className="fas fa-trash text-xs"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={addOptionItem}
          className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/40 flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <i className="fas fa-plus text-[10px]"></i>
          <span>Add Option</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const preset = [
              { label: 'Selection 1', value: '20' },
              { label: 'Selection 2', value: '40' },
              { label: 'Selection 3', value: '60' },
              { label: 'Selection 4', value: '80' }
            ];
            setOptionItems(preset);
            const optsStrArray = preset.map(o => `${o.label}:${o.value}`);
            setOptionsStr(optsStrArray.join(', '));
            setFormData((prev: any) => ({
              ...prev,
              optionItems: preset,
              options: optsStrArray
            }));
          }}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 transition-all cursor-pointer"
        >
          Load Preset (20, 40, 60, 80)
        </button>
      </div>

      <div className="pt-2 border-t border-slate-800">
        <label className="text-[10px] text-slate-400 block mb-1">Quick Edit (Comma Separated)</label>
        <input 
          value={optionsStr ?? ''} 
          onChange={(e) => handleOptionsChange(e.target.value)} 
          className="w-full bg-slate-950 border border-slate-800 text-white py-2 px-3 rounded-lg font-mono text-xs outline-none focus:border-amber-500" 
          placeholder="Selection 1:20, Selection 2:40, Selection 3:60, Selection 4:80"
        />
      </div>
    </div>
  );
};
