import React, { useState, useEffect, useMemo } from 'react';
import { Panel, PanelType, AppState } from '../types';
import IconPicker from './IconPicker';
import ColorPicker from './ColorPicker';
import TopicAutocompleteInput from './TopicAutocompleteInput';
import TagAutocompleteInput from './TagAutocompleteInput';
import { getSmartIconAnimationClass, SmartIcon } from '../utils/iconAnimator';
import { estimateStorageFootprint, saveHistorianRetentionConfig, getIsStoragePersisted, detectOEMBrowserWarning } from '../utils/trendHistorianEngine';

interface EditPanelModalProps {
  panel: Partial<Panel>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPanel: any) => void;
  appState?: AppState;
}

const EditPanelModal: React.FC<EditPanelModalProps> = ({ panel, isOpen, onClose, onSave, appState }) => {
  const [formData, setFormData] = useState<any>(panel);
  const [pickingIconFor, setPickingIconFor] = useState<'on' | 'off' | null>(null);
  const [pickingColorFor, setPickingColorFor] = useState<'iconOn' | 'iconOff' | 'first' | 'second' | 'third' | null>(null);
  const [optionsStr, setOptionsStr] = useState('');
  const [optionItems, setOptionItems] = useState<{ label: string; value: string }[]>([]);
  const [historianCustomIntervalError, setHistorianCustomIntervalError] = useState<string | null>(null);
  const [historianSectionOpen, setHistorianSectionOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const pMin = Number(panel.payloadMin ?? 0);
      const pMax = Number(panel.payloadMax ?? 100);
      const pRange = pMax - pMin || 100;
      const lowDefault = panel.lowThreshold !== undefined ? Number(panel.lowThreshold) : Math.round(pMin + pRange * 0.33);
      const highDefault = panel.highThreshold !== undefined ? Number(panel.highThreshold) : Math.round(pMin + pRange * 0.66);

      const initialOptionItems = (panel.optionItems && panel.optionItems.length > 0)
        ? panel.optionItems
        : (panel.options || []).map(opt => {
            if (typeof opt === 'string' && opt.includes(':')) {
              const parts = opt.split(':');
              return { label: parts[0].trim(), value: parts.slice(1).join(':').trim() };
            }
            return { label: String(opt), value: String(opt) };
          });

      if (initialOptionItems.length === 0) {
        initialOptionItems.push(
          { label: 'Selection 1', value: '20' },
          { label: 'Selection 2', value: '40' },
          { label: 'Selection 3', value: '60' },
          { label: 'Selection 4', value: '80' }
        );
      }
      setOptionItems(initialOptionItems);

      setFormData({
        ...panel,
        qos: panel.qos ?? 0,
        messageFactor: panel.messageFactor ?? 1,
        decimalPrecision: panel.decimalPrecision ?? 1,
        payloadMin: pMin,
        payloadMax: pMax,
        lowThreshold: lowDefault,
        highThreshold: highDefault,
        colSpan: panel.colSpan ?? 1,
        rowSpan: panel.rowSpan ?? 1,
        firstColor: panel.firstColor ?? '#38bdf8',
        secondColor: panel.secondColor ?? '#f59e0b',
        thirdColor: panel.thirdColor ?? '#ef4444',
        penColor: panel.penColor ?? panel.firstColor ?? '#38bdf8',
        penThickness: panel.penThickness ?? 2,
        graphType: panel.graphType ?? 'line',
        showGrid: panel.showGrid ?? true,
        fillArea: panel.fillArea ?? true,
        showNodeMarkers: panel.showNodeMarkers ?? false,
        iconOn: panel.iconOn ?? 'fa-fan',
        iconOff: panel.iconOff ?? 'fa-fan',
        iconColorOn: panel.iconColorOn ?? '#10b981',
        iconColorOff: panel.iconColorOff ?? '#4b5563',
        fontSize: panel.fontSize ?? 'Normal',
        payloadOn: panel.payloadOn ?? '1',
        payloadOff: panel.payloadOff ?? '0',
        showReceivedTimeStamp: panel.showReceivedTimeStamp ?? true,
        showSentTimeStamp: panel.showSentTimeStamp ?? true,
        buttonPayload: panel.buttonPayload ?? '1',
        sliderStep: panel.sliderStep ?? 1,
        publishPattern: panel.publishPattern ?? (panel.jsonPath && panel.jsonPath.includes('<payload>') ? panel.jsonPath : ''),
        publishTopic: panel.publishTopic ?? '',
        confirmPublish: panel.confirmPublish ?? false,
        clearOnPublish: panel.clearOnPublish ?? false,
        enableLowAlarm: panel.enableLowAlarm ?? false,
        enableMidAlarm: panel.enableMidAlarm ?? false,
        enableHighAlarm: panel.enableHighAlarm ?? false,
        lowAlarmMsg: panel.lowAlarmMsg ?? 'Low Zone Warning',
        midAlarmMsg: panel.midAlarmMsg ?? 'Mid Zone Warning',
        highAlarmMsg: panel.highAlarmMsg ?? 'High Critical Alarm',
        options: initialOptionItems.map(o => `${o.label}:${o.value}`),
        optionItems: initialOptionItems,
        alarmViewMode: panel.alarmViewMode ?? 'live',
        pageSize: panel.pageSize ?? 5,
        maxDisplayRows: panel.maxDisplayRows ?? 100,
        // Historian logging fields
        enableHistorianLogging: panel.enableHistorianLogging ?? false,
        logIntervalSeconds: panel.logIntervalSeconds ?? 10,
        retentionValue: (appState?.userRole === 'community' || appState?.productEdition === 'community') ? 1 : (panel.retentionValue ?? 7),
        retentionUnit: (appState?.userRole === 'community' || appState?.productEdition === 'community') ? 'HOURS' : (panel.retentionUnit ?? 'DAYS'),
        logStorageCapMb: panel.logStorageCapMb ?? 500,
        // Historian interval preset (separate from actual logIntervalSeconds for custom entry)
        _historianIntervalPreset: (() => {
          const v = panel.logIntervalSeconds ?? 10;
          if ([1, 10, 60, 300, 600].includes(v)) return String(v);
          return 'custom';
        })()
      });
      setOptionsStr(initialOptionItems.map(o => `${o.label}:${o.value}`).join(', '));
    }
  }, [isOpen, panel]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev: any) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Re-clamp thresholds if Min/Max changes
      if (name === 'payloadMin' || name === 'payloadMax') {
        const newMin = Number(name === 'payloadMin' ? value : prev.payloadMin);
        const newMax = Number(name === 'payloadMax' ? value : prev.payloadMax);
        let low = Number(prev.lowThreshold ?? newMin);
        let high = Number(prev.highThreshold ?? newMax);

        low = Math.max(newMin, Math.min(newMax, low));
        high = Math.max(low, Math.min(newMax, high));

        updated.lowThreshold = low;
        updated.highThreshold = high;
      }

      return updated;
    });
  };

  const handleLowThresholdChange = (newLow: number) => {
    const pMin = Number(formData.payloadMin ?? 0);
    const pMax = Number(formData.payloadMax ?? 100);
    let low = Math.max(pMin, Math.min(pMax, newLow));
    let high = Number(formData.highThreshold ?? (pMin + (pMax - pMin) * 0.66));
    
    if (low >= high) {
      high = Math.min(pMax, low + 1);
    }
    setFormData((prev: any) => ({ ...prev, lowThreshold: low, highThreshold: high }));
  };

  const handleHighThresholdChange = (newHigh: number) => {
    const pMin = Number(formData.payloadMin ?? 0);
    const pMax = Number(formData.payloadMax ?? 100);
    let high = Math.max(pMin, Math.min(pMax, newHigh));
    let low = Number(formData.lowThreshold ?? (pMin + (pMax - pMin) * 0.33));
    
    if (high <= low) {
      low = Math.max(pMin, high - 1);
    }
    setFormData((prev: any) => ({ ...prev, lowThreshold: low, highThreshold: high }));
  };

  const handleOptionsChange = (str: string) => {
    setOptionsStr(str);
    const opts = str.split(',').map(s => s.trim()).filter(Boolean);
    const parsedItems = opts.map((opt, idx) => {
      if (opt.includes(':')) {
        const parts = opt.split(':');
        return { label: parts[0].trim(), value: parts.slice(1).join(':').trim() };
      }
      return { label: opt, value: opt };
    });
    setOptionItems(parsedItems);
    setFormData((prev: any) => ({ ...prev, options: opts, optionItems: parsedItems }));
  };

  const updateOptionItem = (index: number, key: 'label' | 'value', val: string) => {
    const updated = [...optionItems];
    updated[index] = { ...updated[index], [key]: val };
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
    const nextNum = optionItems.length + 1;
    const updated = [...optionItems, { label: `Selection ${nextNum}`, value: String(nextNum * 20) }];
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
    const updated = optionItems.filter((_, i) => i !== index);
    setOptionItems(updated);
    const optsStrArray = updated.map(o => `${o.label}:${o.value}`);
    setOptionsStr(optsStrArray.join(', '));
    setFormData((prev: any) => ({
      ...prev,
      optionItems: updated,
      options: optsStrArray
    }));
  };

  const isGauge = formData.type === PanelType.GAUGE || formData.type === PanelType.LINE_GRAPH || formData.type === PanelType.PROGRESS || formData.type === PanelType.TEXT_OUTPUT || formData.type === PanelType.LOG || formData.type === 'text_display' || formData.type === 'log' || formData.type === PanelType.LED || formData.type === PanelType.NODE_STATUS;
  const isLED = formData.type === PanelType.LED;
  const isSwitch = formData.type === PanelType.SWITCH;
  const isButton = formData.type === PanelType.BUTTON;
  const isSlider = formData.type === PanelType.SLIDER;
  const isTextInput = formData.type === PanelType.TEXT_INPUT;
  const isStaticText = formData.type === PanelType.STATIC_TEXT;
  const isScreenJump = formData.type === PanelType.SCREEN_JUMP;
  const isImage = formData.type === PanelType.IMAGE || formData.type === 'image';
  const isClock = formData.type === PanelType.CLOCK || (formData.type as string) === 'clock';
  const isPipe = formData.type === PanelType.PIPE || (formData.type as string) === 'pipe' || formData.shapeType === 'pipe';
  const isShape = formData.type === PanelType.SHAPE || (formData.type as string) === 'shape';
  const isAlarmLog = formData.type === PanelType.ALARM_LOG || (formData.type as string) === 'alarm_log';
  const isSetpointInput = isSlider || isTextInput;
  const isOptionsType = formData.type === PanelType.COMBO_BOX || formData.type === PanelType.RADIO_BUTTONS || formData.type === PanelType.MULTI_STATE;
  const isLineGraph = formData.type === PanelType.LINE_GRAPH;
  const isRadioButtons = formData.type === PanelType.RADIO_BUTTONS;
  const isComboBox = formData.type === PanelType.COMBO_BOX;

  const isActionable = [
    PanelType.TEXT_INPUT,
    PanelType.SLIDER,
    PanelType.BUTTON,
    PanelType.SWITCH,
    PanelType.COMBO_BOX,
    PanelType.MULTI_STATE,
    PanelType.COLOR_PICKER,
    PanelType.RADIO_BUTTONS
  ].includes(formData.type as PanelType);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#0a0a0a] overflow-hidden animate-in fade-in duration-150">
      <header className="h-16 flex items-center justify-between px-4 border-b border-[#222] bg-[#121212] shrink-0">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg">
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <h1 className="text-lg font-bold text-white">Configure Panel</h1>
        </div>
        <button 
          onClick={() => onSave(formData)} 
          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-md"
        >
          Save
        </button>
      </header>

      <form 
        className="flex-grow overflow-y-auto p-6 space-y-8 pb-32 max-w-2xl mx-auto w-full"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(formData);
        }}
      >
        <div className="space-y-6 bg-[#121212] p-6 rounded-xl border border-[#222]">
          <div className="relative border-b border-gray-700 py-2">
            <label className="text-xs text-amber-500 font-semibold absolute -top-2">Panel Name</label>
            <input 
              name="panelName"
              value={formData.panelName || ''}
              onChange={handleChange}
              className="w-full bg-transparent outline-none text-white py-2"
              placeholder="e.g. Temperature Sensor"
              required
            />
          </div>

          {/* Topic Configuration (Hidden for SCREEN_JUMP and STATIC_TEXT) */}
          {!isScreenJump && !isStaticText && (
            <>
              <div className={`grid grid-cols-1 ${isActionable ? 'sm:grid-cols-2' : ''} gap-4`}>
                <TopicAutocompleteInput
                  name="topic"
                  label="MQTT Subscribe Topic (Read) *"
                  direction="subscribe"
                  value={formData.topic || ''}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, topic: val }))}
                  appState={appState}
                  required
                  placeholder="e.g. myfactory123/v1/jay/sub"
                />

                {isActionable && (
                  <TopicAutocompleteInput
                    name="publishTopic"
                    label="MQTT Publish Topic (Write)"
                    direction="publish"
                    value={formData.publishTopic || ''}
                    onChange={(val) => setFormData((prev: any) => ({ ...prev, publishTopic: val }))}
                    appState={appState}
                    isPublishTopic
                    placeholder="Defaults to subscribe topic if blank"
                  />
                )}
              </div>

              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox"
                  id="disablePrefix"
                  name="disableDashboardPrefix"
                  checked={formData.disableDashboardPrefix || false}
                  onChange={handleChange}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="disablePrefix" className="text-sm text-gray-300">Disable dashboard topic prefix</label>
              </div>
            </>
          )}

          {/* Type Specific Fields */}
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
                    <span>{isStaticText ? 'Font Shadow / Text Glow Effect' : 'Shadow / Glow Effect'}</span>
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
                {/* Pipe Thickness / Diameter */}
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

                {/* Turning Radius / Corner Elbow Fillet */}
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

                {/* Pipe End Fittings */}
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

              {/* Particle Style, Flow Direction & Colors */}
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

              {/* Animation Condition & Tag Evaluation */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                  Fluid Animation Activation Condition
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      name="pipeAnimCondition"
                      value={formData.pipeAnimCondition || 'always'}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeAnimCondition: e.target.value }))}
                      className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold"
                    >
                      <option value="always">⚡ Animate Always (Regardless of Tag)</option>
                      <option value="tag_condition">🏷️ Animate on Tag Condition Match</option>
                    </select>
                  </div>

                  {(formData.pipeAnimCondition === 'tag_condition') && (
                    <div className="flex items-center space-x-2">
                      <select
                        name="pipeAnimOperator"
                        value={formData.pipeAnimOperator || '='}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeAnimOperator: e.target.value }))}
                        className="w-20 bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold text-center"
                      >
                        <option value="=">=</option>
                        <option value="!=">!=</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                      </select>

                      <input
                        type="text"
                        name="pipeAnimValue"
                        value={formData.pipeAnimValue !== undefined ? formData.pipeAnimValue : '1'}
                        onChange={handleChange}
                        placeholder="Target value (e.g. 1, ON, 50)"
                        className="flex-1 bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono"
                      />
                    </div>
                  )}
                </div>

                {formData.pipeAnimCondition === 'tag_condition' && (
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    Flow particles will animate only when received tag value on topic <span className="text-sky-300 font-mono">{formData.topic || 'configured topic'}</span> matches condition <span className="text-amber-300 font-mono">{formData.pipeAnimOperator || '='} {formData.pipeAnimValue || '1'}</span>.
                  </p>
                )}
              </div>
            </div>
          )}

          {isShape && (
            <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#141414] p-4 rounded-xl border border-purple-500/30">
              <span className="text-xs text-purple-400 font-bold uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-shapes text-purple-400"></i>
                <span>Vector Shape Options</span>
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Geometric Geometry</label>
                  <select
                    name="shapeType"
                    value={formData.shapeType || 'rectangle'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, shapeType: e.target.value }))}
                    className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700"
                  >
                    <option value="rectangle">Rectangle Box</option>
                    <option value="circle">Circle / Ellipse</option>
                    <option value="line">Connecting Line</option>
                    <option value="pipe">3D Pipe Segment</option>
                    <option value="polygon">Hexagon / Polygon</option>
                    <option value="arc">Curved Arc</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold block">Corner Radius (0-100px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="borderRadius"
                    value={formData.borderRadius ?? 8}
                    onChange={handleChange}
                    className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Symbol Equipment Motion, On/Off Start & Speed Controls */}
          {(isShape || formData.symbolId || formData.type === 'shape' || formData.type === PanelType.SHAPE) && (
            <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#141414] p-4 rounded-xl border border-sky-500/40 shadow-inner">
              <span className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <i className="fas fa-wand-magic-sparkles text-sky-400"></i>
                  <span>Equipment Motion & Speed Controls</span>
                </span>
                <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 font-mono">
                  {formData.symbolId || 'Symbol Library Asset'}
                </span>
              </span>

              {/* Equipment Motion Animation Controls (ON & OFF States) */}
              <div className="space-y-3 bg-black/30 p-3 rounded-lg border border-white/5">
                <div className="text-xs text-sky-300 font-bold flex items-center space-x-1.5 border-b border-slate-800 pb-1.5">
                  <i className="fas fa-arrows-rotate text-sky-400 text-xs"></i>
                  <span>Equipment Motion & Speed Controls</span>
                </div>

                {/* ON State Motion Config */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-500/5 p-2.5 rounded border border-emerald-500/20">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      name="rotateOn"
                      checked={formData.rotateOn !== false}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, rotateOn: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-xs text-emerald-300 font-bold flex items-center space-x-1">
                      <i className="fas fa-play text-emerald-400 text-[10px]"></i>
                      <span>Animate Motion when ON</span>
                    </span>
                  </label>

                  {formData.rotateOn !== false && (
                    <div className="flex items-center space-x-2">
                      <label className="text-[11px] text-emerald-200 font-semibold shrink-0">ON Speed:</label>
                      <select
                        name="animSpeedOn"
                        value={formData.animSpeedOn || 'medium'}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-emerald-500/50 text-xs text-emerald-300 font-bold px-2 py-1 rounded outline-none cursor-pointer"
                      >
                        <option value="slow">Slow (Low RPM)</option>
                        <option value="medium">Medium (Standard - Default)</option>
                        <option value="fast">Fast (High RPM)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* OFF State Motion Config */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-rose-500/5 p-2.5 rounded border border-rose-500/20">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      name="rotateOff"
                      checked={!!formData.rotateOff}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, rotateOff: e.target.checked }))}
                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 font-bold flex items-center space-x-1">
                      <i className="fas fa-stop text-rose-400 text-[10px]"></i>
                      <span>Animate Motion when OFF</span>
                    </span>
                  </label>

                  {formData.rotateOff && (
                    <div className="flex items-center space-x-2">
                      <label className="text-[11px] text-slate-400 font-semibold shrink-0">OFF Speed:</label>
                      <select
                        name="animSpeedOff"
                        value={formData.animSpeedOff || 'medium'}
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-300 font-bold px-2 py-1 rounded outline-none cursor-pointer"
                      >
                        <option value="slow">Slow (Low RPM)</option>
                        <option value="medium">Medium (Standard)</option>
                        <option value="fast">Fast (High RPM)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Start / Stop Motion Condition */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                  Equipment Motion Evaluation Trigger
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      name="pipeAnimCondition"
                      value={formData.pipeAnimCondition || 'on_state'}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeAnimCondition: e.target.value }))}
                      className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold"
                    >
                      <option value="on_state">🟢 Animate when ON / Running (Stop when OFF)</option>
                      <option value="always">⚡ Animate Always (Continuous Motion)</option>
                      <option value="tag_condition">🏷️ Animate when Custom Tag Condition matches</option>
                    </select>
                  </div>

                  {formData.pipeAnimCondition === 'tag_condition' && (
                    <div className="flex items-center space-x-2">
                      <select
                        name="pipeAnimOperator"
                        value={formData.pipeAnimOperator || '='}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, pipeAnimOperator: e.target.value }))}
                        className="w-20 bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold text-center"
                      >
                        <option value="=">=</option>
                        <option value="!=">!=</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                      </select>

                      <input
                        type="text"
                        name="pipeAnimValue"
                        value={formData.pipeAnimValue !== undefined ? formData.pipeAnimValue : '1'}
                        onChange={handleChange}
                        placeholder="Target value (e.g. 1, RUNNING, ON)"
                        className="flex-1 bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Equipment Trip Tag & Fault Alarm Controls */}
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
          </div>

          {isSetpointInput && (
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
          )}

          {isAlarmLog && (
            <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#121824] p-4 rounded-xl border border-indigo-500/30">
              <div className="flex items-center justify-between">
                <label className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center space-x-2">
                  <i className="fas fa-history text-xs text-indigo-400"></i>
                  <span>Alarm Historian Element Configuration</span>
                </label>
                <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded font-mono border border-indigo-500/20">
                  Live & Historian Log
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Configure default display view mode, window scroll behavior, and optimized paging system for this Alarm Historian element.
              </p>

              {/* Display Mode Selector */}
              <div>
                <label className="text-xs text-slate-200 font-bold block mb-1">
                  Default Display View Mode (Live vs Historian)
                </label>
                <select
                  name="alarmViewMode"
                  value={formData.alarmViewMode || 'live'}
                  onChange={handleChange}
                  className="w-full bg-slate-900 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-bold focus:border-indigo-400 focus:outline-none"
                >
                  <option value="live">🔴 Live Active Monitor (Active Unack & Active Ack Only)</option>
                  <option value="historian">📜 Full Historical Alarm Log (All Active & Resolved Events)</option>
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Operators can also toggle between Live and Historian modes dynamically on the element view.
                </span>
              </div>

              {/* Page Size & Max Display Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs text-slate-200 font-bold block mb-1">
                    Rows Per Page (Paging System)
                  </label>
                  <select
                    name="pageSize"
                    value={formData.pageSize ?? 5}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, pageSize: Number(e.target.value) }))}
                    className="w-full bg-slate-900 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value={3}>3 rows per page</option>
                    <option value={5}>5 rows per page (Default)</option>
                    <option value={10}>10 rows per page</option>
                    <option value={15}>15 rows per page</option>
                    <option value={25}>25 rows per page</option>
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Paging optimizes rendering performance for fast, responsive UI scrolling.
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-200 font-bold block mb-1">
                    Maximum Total Display Limit
                  </label>
                  <select
                    name="maxDisplayRows"
                    value={formData.maxDisplayRows ?? 100}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, maxDisplayRows: Number(e.target.value) }))}
                    className="w-full bg-slate-900 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value={25}>Latest 25 Events</option>
                    <option value={50}>Latest 50 Events</option>
                    <option value={100}>Latest 100 Events (Default)</option>
                    <option value={250}>Latest 250 Events</option>
                    <option value={500}>Latest 500 Events</option>
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Maximum total historical entries fetched for this element.
                  </span>
                </div>
              </div>
            </div>
          )}

          {isGauge && (
            <div className="space-y-6 pt-2 border-t border-[#262626]">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-amber-500 absolute -top-2">Min Value *</label>
                  <input type="number" name="payloadMin" value={formData.payloadMin ?? 0} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" />
                </div>
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-amber-500 absolute -top-2">Max Value *</label>
                  <input type="number" name="payloadMax" value={formData.payloadMax ?? 100} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-gray-400 absolute -top-2">Unit Symbol</label>
                  <input name="unit" value={formData.unit ?? ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" placeholder="e.g. °C, %, RPM, kW" />
                </div>
                <div className="relative border-b border-gray-700 py-2">
                  <label className="text-xs text-gray-400 absolute -top-2">Decimal Precision</label>
                  <input type="number" name="decimalPrecision" value={formData.decimalPrecision ?? 1} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" />
                </div>
              </div>

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
            </div>
          )}

          {/* Card Size / Layout Dimensions */}
          <div className="space-y-3 pt-4 border-t border-[#262626]">
            <label className="text-xs text-amber-500 font-semibold flex items-center space-x-1.5">
              <i className="fas fa-expand text-xs"></i>
              <span>Card Layout & Size (Bento Grid)</span>
            </label>
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

          {isSlider && (
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#262626]">
              <div className="relative border-b border-gray-700 py-2">
                <label className="text-xs text-amber-500 absolute -top-2">Min</label>
                <input type="number" name="payloadMin" value={formData.payloadMin ?? 0} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" />
              </div>
              <div className="relative border-b border-gray-700 py-2">
                <label className="text-xs text-amber-500 absolute -top-2">Max</label>
                <input type="number" name="payloadMax" value={formData.payloadMax ?? 100} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" />
              </div>
              <div className="relative border-b border-gray-700 py-2">
                <label className="text-xs text-gray-400 absolute -top-2">Step</label>
                <input type="number" name="sliderStep" value={formData.sliderStep ?? 1} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" />
              </div>
            </div>
          )}

          {isLineGraph && (
            <div className="space-y-5 pt-3 border-t border-[#262626] bg-[#161616] p-4 rounded-xl border border-sky-500/30">
              <div className="flex items-center justify-between">
                <label className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
                  <i className="fas fa-chart-line text-xs text-sky-400"></i>
                  <span>Industrial Trend & Multi-Pen Graph Settings</span>
                </label>
                <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded font-mono border border-sky-500/20">TASCTrendz SCADA Engine</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-amber-500 font-bold block mb-1">Graph Display Type</label>
                  <select
                    name="graphType"
                    value={formData.graphType || 'line'}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="line">📈 Line — Crisp linear trend</option>
                    <option value="curve">〰️ Curve — Smooth Bézier spline</option>
                    <option value="stepped">⬜ Stepped — SCADA digital step</option>
                    <option value="bar">📊 Bar — Vertical bar chart</option>
                    <option value="hbar">▬ H-Bar — Horizontal level gauge</option>
                    <option value="area">🏔 Area — Filled area chart</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-amber-500 font-bold block mb-1">Primary Pen Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      name="penColor"
                      value={formData.penColor || formData.firstColor || '#38bdf8'}
                      onChange={(e) => {
                        setFormData((prev: any) => ({ ...prev, penColor: e.target.value, firstColor: e.target.value }));
                      }}
                      className="w-10 h-8 bg-transparent cursor-pointer rounded border border-slate-700"
                    />
                    <input
                      type="text"
                      value={formData.penColor || formData.firstColor || '#38bdf8'}
                      onChange={(e) => {
                        setFormData((prev: any) => ({ ...prev, penColor: e.target.value, firstColor: e.target.value }));
                      }}
                      className="flex-grow bg-slate-900 border border-slate-700 text-white font-mono text-xs p-2 rounded-lg outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Pen Thickness ({formData.penThickness || 2}px)</label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    name="penThickness"
                    value={formData.penThickness || 2}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, penThickness: Number(e.target.value) }))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300 select-none">
                    <input
                      type="checkbox"
                      name="showGrid"
                      checked={formData.showGrid !== false}
                      onChange={handleChange}
                      className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                    />
                    <span>Show Grid Lines</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300 select-none">
                    <input
                      type="checkbox"
                      name="fillArea"
                      checked={formData.fillArea !== false}
                      onChange={handleChange}
                      className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                    />
                    <span>Area Fill (Filled vs Non-Filled)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-amber-300 font-semibold select-none" title="Show small dot markers at each data sample point on the trend line">
                    <input
                      type="checkbox"
                      name="showNodeMarkers"
                      checked={formData.showNodeMarkers === true}
                      onChange={handleChange}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span>Show Node Markers (sample dots)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-emerald-300 font-semibold select-none">
                  <input
                    type="checkbox"
                    name="showMonitoringTable"
                    checked={formData.showMonitoringTable !== false}
                    onChange={handleChange}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span>Enable Monitoring Window Table Below Chart</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-xs text-sky-300 font-semibold select-none">
                  <input
                    type="checkbox"
                    name="enableDualCursor"
                    checked={formData.enableDualCursor || false}
                    onChange={handleChange}
                    className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                  />
                  <span>Enable Dual Cursors by Default (Δt & Δv)</span>
                </label>
              </div>

              {/* Monitoring Window Column Customization */}
              {formData.showMonitoringTable !== false && (
                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <i className="fas fa-table-columns text-emerald-400 text-xs"></i>
                      <span>Monitoring Table Visible Columns</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Toggle columns on/off</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {[
                      { key: 'status', label: 'Signal Status', def: true },
                      { key: 'lastVal', label: 'Last Value', def: true },
                      { key: 'lastTime', label: 'Last Time', def: true },
                      { key: 'c1Val', label: 'C1 Value', def: true },
                      { key: 'c1Time', label: 'C1 Time', def: true },
                      { key: 'c2Val', label: 'C2 Value', def: true },
                      { key: 'c2Time', label: 'C2 Time', def: true },
                      { key: 'valDiff', label: 'Δv (Value Diff)', def: true },
                      { key: 'timeDiff', label: 'Δt (Time Diff)', def: true },
                      { key: 'minVal', label: 'Min (Time Frame)', def: true },
                      { key: 'maxVal', label: 'Max (Time Frame)', def: true },
                      { key: 'avgVal', label: 'Avg (Time Frame)', def: true }
                    ].map(col => {
                      const isChecked = formData.tableColumns?.[col.key] ?? col.def;
                      return (
                        <label key={col.key} className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white select-none bg-slate-950/50 p-1.5 rounded border border-slate-800/80">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev: any) => ({
                                ...prev,
                                tableColumns: {
                                  ...(prev.tableColumns || {}),
                                  [col.key]: checked
                                }
                              }));
                            }}
                            className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                          />
                          <span className="truncate">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Multi-Pen Configuration List */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <i className="fas fa-layer-group text-sky-400 text-xs"></i>
                    <span>Multi-Pen Configuration (TASCTrendz Multi-Topic Pens)</span>
                  </label>
                  {(() => {
                    const isCommunity = appState?.userRole === 'community' || appState?.productEdition === 'community';
                    const isPenLimitReached = isCommunity && (formData.pens?.length || 0) >= 2;
                    return (
                      <button
                        type="button"
                        disabled={isPenLimitReached}
                        onClick={() => {
                          if (isPenLimitReached) return;
                          const newPen = {
                            id: `pen_${Date.now()}`,
                            name: `Pen ${((formData.pens?.length || 0) + 1)}`,
                            topic: formData.topic || '',
                            jsonPath: '',
                            color: ['#38bdf8', '#f43f5e', '#10b981', '#f59e0b', '#a855f7'][(formData.pens?.length || 0) % 5],
                            thickness: 2,
                            unit: formData.unit || '',
                            showNodeMarkers: false
                          };
                          setFormData((prev: any) => ({
                            ...prev,
                            pens: [...(prev.pens || []), newPen]
                          }));
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center space-x-1 ${
                          isPenLimitReached
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                            : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 cursor-pointer'
                        }`}
                        title={isPenLimitReached ? "Free Demo Limit: Maximum 2 Pens allowed in Community Edition." : "Add a new trend pen"}
                      >
                        <i className={isPenLimitReached ? "fas fa-lock text-[10px]" : "fas fa-plus text-[10px]"}></i>
                        <span>{isPenLimitReached ? 'Max 2 Pens (Free Demo)' : '+ Add Pen'}</span>
                      </button>
                    );
                  })()}
                </div>

                {(appState?.userRole === 'community' || appState?.productEdition === 'community') && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] font-medium flex items-center space-x-2">
                    <i className="fas fa-crown text-amber-400 text-xs shrink-0"></i>
                    <span>Free Demo Active: Maximum <strong>2 Pens</strong> per Trend panel allowed. Upgrade to Engineering Studio for unlimited pens.</span>
                  </div>
                )}

                {formData.pens && formData.pens.length > 0 ? (
                  <div className="space-y-2.5">
                    {formData.pens.map((pen: any, idx: number) => (
                      <div key={pen.id || idx} className="bg-slate-900/80 rounded-xl border border-slate-700/60 overflow-hidden">
                        {/* Pen Header Row */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          {/* Color swatch */}
                          <input
                            type="color"
                            value={pen.color || '#38bdf8'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, color: val } : p)
                              }));
                            }}
                            className="w-7 h-7 bg-transparent rounded-md border border-slate-600 cursor-pointer shrink-0"
                            title="Pen Color"
                          />
                          {/* Pen name */}
                          <input
                            type="text"
                            value={pen.name || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, name: val } : p)
                              }));
                            }}
                            placeholder="Pen Name"
                            className="w-28 bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-sky-500 font-semibold"
                          />
                          {/* MQTT Topic */}
                          <input
                            type="text"
                            value={pen.topic || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, topic: val } : p)
                              }));
                            }}
                            placeholder="MQTT Topic (e.g. sensors/tank1/level)"
                            className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-sky-500 font-mono"
                          />
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev: any) => ({
                                ...prev,
                                pens: prev.pens.filter((_: any, i: number) => i !== idx)
                              }));
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer shrink-0 transition-colors"
                            title="Remove Pen"
                          >
                            <i className="fas fa-trash-can text-xs"></i>
                          </button>
                        </div>

                        {/* Per-Pen Advanced Settings Row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-3 border-t border-slate-800/60 pt-2">
                          {/* JSONPath Query — per pen */}
                          <div className="flex-1 min-w-[180px]">
                            <label className="text-[10px] text-sky-400 font-bold block mb-0.5 flex items-center gap-1">
                              <i className="fas fa-code text-[9px]"></i> JSONPath Query (this pen)
                            </label>
                            <input
                              type="text"
                              value={pen.jsonPath || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, jsonPath: val } : p)
                                }));
                              }}
                              placeholder="$.d.value or $.sensor[0] (blank = raw)"
                              className="w-full bg-slate-950 border border-slate-700/80 text-emerald-300 rounded-lg px-2 py-1 text-[11px] font-mono outline-none focus:border-sky-500 placeholder:text-slate-600"
                            />
                          </div>

                          {/* Thickness */}
                          <div className="flex items-center gap-2 shrink-0">
                            <label className="text-[10px] text-slate-400 font-bold whitespace-nowrap">Thickness</label>
                            <input
                              type="range" min="1" max="6" step="1"
                              value={pen.thickness ?? 2}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, thickness: val } : p)
                                }));
                              }}
                              className="w-20 accent-sky-500 cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 font-mono w-3">{pen.thickness ?? 2}</span>
                          </div>

                          {/* Unit */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <label className="text-[10px] text-slate-400 font-bold">Unit</label>
                            <input
                              type="text"
                              value={pen.unit || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, unit: val } : p)
                                }));
                              }}
                              placeholder="e.g. °C"
                              className="w-14 bg-slate-950 border border-slate-700 text-white rounded px-1.5 py-1 text-[11px] outline-none focus:border-sky-500 font-mono text-center"
                            />
                          </div>

                          {/* Node markers toggle */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-amber-300 select-none shrink-0">
                            <input
                              type="checkbox"
                              checked={pen.showNodeMarkers === true}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setFormData((prev: any) => ({
                                  ...prev,
                                  pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, showNodeMarkers: val } : p)
                                }));
                              }}
                              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                            />
                            <span>Show Dots</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                    <i className="fas fa-info-circle text-sky-400 text-sm mt-0.5 shrink-0"></i>
                    <p className="text-[11px] text-slate-400">
                      Single pen mode — uses the Primary MQTT Topic above. Click <strong className="text-sky-300">+ Add Pen</strong> to chart multiple telemetry tags simultaneously, each with its own MQTT topic and JSONPath query.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-sky-300 font-semibold select-none">
                    <input
                      type="checkbox"
                      name="autoScaleY"
                      checked={formData.autoScaleY || false}
                      onChange={handleChange}
                      className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                    />
                    <span>Auto Scale Y-Axis Ticks (Fit to live signal dynamic range)</span>
                  </label>
                  {formData.autoScaleY && (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      Manual limits disabled
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`relative border-b py-2 transition-opacity ${formData.autoScaleY ? 'border-gray-800 opacity-40 pointer-events-none' : 'border-gray-700'}`}>
                    <label className="text-xs text-amber-500 absolute -top-2 font-bold">Y-Axis Min Limit</label>
                    <input
                      type="number"
                      name="payloadMin"
                      disabled={formData.autoScaleY || false}
                      value={formData.payloadMin ?? 0}
                      onChange={handleChange}
                      className="w-full bg-transparent outline-none text-white py-1 font-mono text-xs disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className={`relative border-b py-2 transition-opacity ${formData.autoScaleY ? 'border-gray-800 opacity-40 pointer-events-none' : 'border-gray-700'}`}>
                    <label className="text-xs text-amber-500 absolute -top-2 font-bold">Y-Axis Max Limit</label>
                    <input
                      type="number"
                      name="payloadMax"
                      disabled={formData.autoScaleY || false}
                      value={formData.payloadMax ?? 100}
                      onChange={handleChange}
                      className="w-full bg-transparent outline-none text-white py-1 font-mono text-xs disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Historian Logging Section (LINE_GRAPH only) ── */}
          {isLineGraph && (
            <div className="space-y-0 border border-violet-500/40 rounded-xl overflow-hidden bg-[#0e0a1a]">
              {/* Header / Toggle */}
              <button
                type="button"
                onClick={() => setHistorianSectionOpen(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 bg-violet-900/20 hover:bg-violet-900/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-database text-violet-400 text-xs"></i>
                  <span className="text-xs text-violet-300 font-bold uppercase tracking-wider">📼 Historian & Persistent Trend Logging</span>
                  {formData.enableHistorianLogging && (
                    <span className="text-[9px] bg-violet-500 text-white px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
                  )}
                </div>
                <i className={`fas fa-chevron-${historianSectionOpen ? 'up' : 'down'} text-violet-400 text-xs`}></i>
              </button>

              {historianSectionOpen && (() => {
                // Live storage estimation
                const activePenList = formData.pens && formData.pens.length > 0 ? formData.pens.filter((p: any) => p.loggingEnabled !== false) : [];
                const pensCount = formData.pens && formData.pens.length > 0 ? Math.max(1, activePenList.length) : 1;
                const intervalSec = formData.logIntervalSeconds ?? 10;
                const retentionVal = formData.retentionValue ?? 7;

                const retentionUnit = formData.retentionUnit ?? 'DAYS';
                const isPersisted = getIsStoragePersisted(); // true when Android storage.persist() granted
                const estimate = estimateStorageFootprint(pensCount, intervalSec, retentionVal, retentionUnit, isPersisted);
                const oemWarning = detectOEMBrowserWarning();
                const tierColors = {
                  safe: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', text: 'text-emerald-300', icon: '🟢', label: isPersisted ? 'Safe — Android OS eviction protection active' : 'Safe for mobile & desktop' },
                  warn: { bg: 'bg-amber-900/30', border: 'border-amber-500/40', text: 'text-amber-300', icon: '🟡', label: 'Warning: May be evicted on iOS Safari (7-day inactivity rule)' },
                  critical: { bg: 'bg-rose-900/30', border: 'border-rose-500/40', text: 'text-rose-300', icon: '🔴', label: 'Critical: Use on PC/Industrial Panel only' },
                };
                const tc = tierColors[estimate.tier];

                return (
                  <div className="p-4 space-y-4">
                    {/* Android OEM Browser Warning */}
                    {oemWarning && (
                      <div className="flex items-start space-x-2 bg-rose-900/20 border border-rose-500/40 rounded-lg p-2.5">
                        <span className="text-sm shrink-0">⚠️</span>
                        <p className="text-[10px] text-rose-300 leading-relaxed">
                          <strong>Browser Compatibility Warning:</strong> {oemWarning}
                        </p>
                      </div>
                    )}
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs text-violet-200 font-semibold">Enable Persistent Local Historian Logging</label>
                        <p className="text-[10px] text-slate-400 mt-0.5">Stores telemetry to browser IndexedDB with FIFO auto-archiving</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((p: any) => ({ ...p, enableHistorianLogging: !p.enableHistorianLogging }))}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                          formData.enableHistorianLogging ? 'bg-violet-500' : 'bg-slate-700'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          formData.enableHistorianLogging ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>

                    {formData.enableHistorianLogging && (<>
                      {/* Log Sampling Frequency */}
                      <div className="space-y-2">
                        <label className="text-[11px] text-violet-300 font-semibold block">Log Sampling Frequency</label>
                        <div className="flex items-center space-x-2">
                          <select
                            value={formData._historianIntervalPreset || '10'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHistorianCustomIntervalError(null);
                              if (val !== 'custom') {
                                setFormData((p: any) => ({ ...p, _historianIntervalPreset: val, logIntervalSeconds: parseInt(val) }));
                              } else {
                                setFormData((p: any) => ({ ...p, _historianIntervalPreset: 'custom' }));
                              }
                            }}
                            className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-violet-500"
                          >
                            <option value="1">1 Second (High Resolution)</option>
                            <option value="10">10 Seconds</option>
                            <option value="60">1 Minute</option>
                            <option value="300">5 Minutes</option>
                            <option value="600">10 Minutes (Low Bandwidth)</option>
                            <option value="custom">Custom Interval...</option>
                          </select>
                          {formData._historianIntervalPreset === 'custom' && (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min={1}
                                placeholder="Seconds"
                                value={formData.logIntervalSeconds ?? ''}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value);
                                  if (isNaN(v) || v < 1) {
                                    setHistorianCustomIntervalError('⚠ Minimum 1 second allowed');
                                    setFormData((p: any) => ({ ...p, logIntervalSeconds: 1 }));
                                  } else {
                                    setHistorianCustomIntervalError(null);
                                    setFormData((p: any) => ({ ...p, logIntervalSeconds: v }));
                                  }
                                }}
                                className="w-20 bg-slate-900 border border-violet-600 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-violet-400 font-mono"
                              />
                              <span className="text-[10px] text-slate-400">sec</span>
                            </div>
                          )}
                        </div>
                        {historianCustomIntervalError && (
                          <p className="text-[10px] text-rose-400">{historianCustomIntervalError}</p>
                        )}
                      </div>

                      {/* Retention Period */}
                      <div className="space-y-2">
                        <label className="text-[11px] text-violet-300 font-semibold block">History Retention Period</label>
                        {(() => {
                          const isCommunity = appState?.userRole === 'community' || appState?.productEdition === 'community';
                          const unit = formData.retentionUnit || (isCommunity ? 'HOURS' : 'DAYS');
                          const maxVal = isCommunity ? (unit === 'MINUTES' ? 60 : 1) : 1000;

                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={maxVal}
                                  value={isCommunity ? Math.min(formData.retentionValue ?? 1, maxVal) : (formData.retentionValue ?? 7)}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    const clampedVal = isCommunity ? Math.min(val, maxVal) : val;
                                    setFormData((p: any) => ({ ...p, retentionValue: clampedVal }));
                                  }}
                                  className="w-16 bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-violet-500 font-mono text-center font-bold"
                                />
                                <select
                                  value={unit}
                                  onChange={(e) => {
                                    const newUnit = e.target.value;
                                    let newVal = formData.retentionValue ?? 1;
                                    if (isCommunity) {
                                      if (newUnit === 'MINUTES') newVal = Math.min(newVal, 60);
                                      if (newUnit === 'HOURS') newVal = Math.min(newVal, 1);
                                    }
                                    setFormData((p: any) => ({ ...p, retentionUnit: newUnit, retentionValue: newVal }));
                                  }}
                                  className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-violet-500 font-semibold"
                                >
                                  <option value="MINUTES">Minutes</option>
                                  <option value="HOURS">Hours</option>
                                  <option value="DAYS" disabled={isCommunity}>Days {isCommunity ? '🔒 (Pro)' : ''}</option>
                                  <option value="WEEKS" disabled={isCommunity}>Weeks {isCommunity ? '🔒 (Pro)' : ''}</option>
                                  <option value="MONTHS" disabled={isCommunity}>Months {isCommunity ? '🔒 (Pro)' : ''}</option>
                                  <option value="YEARS" disabled={isCommunity}>Years {isCommunity ? '🔒 (Pro)' : ''}</option>
                                </select>
                                <span className="text-[10px] text-slate-400">of history kept</span>
                              </div>

                              {isCommunity && (
                                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-300 flex items-center space-x-1.5 font-medium">
                                  <i className="fas fa-crown text-amber-400 text-xs shrink-0"></i>
                                  <span>Free Demo Active: Retention is limited to <strong>1 Hour max</strong> (e.g. 60 Mins / 1 Hour). Upgrade to Engineering Studio to keep data for Days/Weeks/Months.</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Per-Pen Logging Toggles */}
                      {formData.pens && formData.pens.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[11px] text-violet-300 font-semibold block">Per-Pen Logging</label>
                          <div className="space-y-1.5">
                            {formData.pens.map((pen: any, idx: number) => (
                              <label key={pen.id || idx} className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={pen.loggingEnabled !== false}
                                  onChange={(e) => {
                                    setFormData((p: any) => ({
                                      ...p,
                                      pens: p.pens.map((pp: any, i: number) => i === idx ? { ...pp, loggingEnabled: e.target.checked } : pp)
                                    }));
                                  }}
                                  className="w-3.5 h-3.5 accent-violet-500"
                                />
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pen.color || '#38bdf8' }}></span>
                                <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors">{pen.name || pen.topic || `Pen ${idx + 1}`}</span>
                                <span className="text-[9px] text-slate-500 font-mono">{pen.topic}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live Storage Estimator Badge */}
                      <div className={`rounded-lg p-3 border ${tc.bg} ${tc.border}`}>
                        <div className="flex items-start space-x-2">
                          <span className="text-sm leading-none mt-0.5">{tc.icon}</span>
                          <div className="flex-1">
                            <div className={`text-xs font-bold ${tc.text} flex items-center gap-2`}>
                              ⚡ Estimated Local Storage: {estimate.formattedSize}
                              {isPersisted && (
                                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                                  🤖 Android Protected
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {estimate.totalPoints.toLocaleString()} points · {pensCount} pen{pensCount > 1 ? 's' : ''} · {formData.logIntervalSeconds}s interval · {formData.retentionValue} {(formData.retentionUnit || 'DAYS').toLowerCase()}
                            </div>
                            <div className={`text-[10px] mt-1 ${tc.text} opacity-80`}>{tc.label}</div>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Advisory — iOS + Android */}
                      <div className="space-y-1.5">
                        <div className="flex items-start space-x-2 bg-slate-900/60 border border-slate-700 rounded-lg p-2.5">
                          <span className="text-sm shrink-0">📱</span>
                          <div className="text-[10px] text-slate-400 leading-relaxed space-y-1">
                            <p>
                              <strong className="text-slate-300">🍎 iOS Safari:</strong> Data cleared after 7 days inactivity.
                              Install TASC as PWA for better protection. Use PC for long-term retention.
                            </p>
                            <p>
                              <strong className="text-slate-300">🤖 Android Chrome:</strong> TASC requests OS-level <em>persistent storage</em> protection when logging is enabled.
                              Install as PWA (Add to Home Screen) to also enable background FIFO pruning sync.
                              Low-RAM OEM devices (MIUI/Huawei/ColorOS) may aggressively kill background tabs — use Chrome, not OEM browser.
                            </p>
                            <p className="text-slate-500">
                              Sub-second logging (&lt;1s) is disabled on all mobile devices to prevent storage thrashing.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>)}
                  </div>
                );
              })()}
            </div>
          )}
          {isOptionsType && (
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
          )}

          {/* Industrial Symbol Animation & Alarming Configuration */}
          {(formData.type === PanelType.IMAGE || formData.symbolId || formData.symbolAnimType) && (
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

              {/* Analog Level & Alarm Config with Interlocked Limits (Gauge Style) */}
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
          )}

          {/* JSONPath Payload Parser & JSON Publish Pattern */}
          {formData.type !== PanelType.LINE_GRAPH && (
            <div className="space-y-4 pt-4 border-t border-[#262626]">
              <div className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                id="isJSONPayload"
                name="isJSONPayload" 
                checked={formData.isJSONPayload || false} 
                onChange={handleChange} 
                className="w-4 h-4 accent-amber-500 rounded" 
              />
              <label htmlFor="isJSONPayload" className="text-sm text-gray-300 font-medium">Payload is JSON Data / Extract using JSONPath</label>
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
                  placeholder="e.g. $.d.data_vijay[0] or $.temperature"
                />
                <div className="text-[11px] text-gray-400 bg-gray-900/90 p-3 rounded-lg border border-gray-800/80 space-y-1">
                  <p className="font-semibold text-amber-400 flex items-center space-x-1">
                    <i className="fas fa-circle-info text-[10px]"></i>
                    <span>JSONPath Guidance for incoming JSON:</span>
                  </p>
                  <p className="text-gray-300 font-mono text-[10px] bg-black/40 px-2 py-1 rounded">
                    {`{"ID":"...", "d":{"data_vijay":[65]}}`}
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-300 text-[11px]">
                    <li>Array value: <code className="text-amber-300 font-mono">$.d.data_vijay[0]</code> → extracts <code className="text-emerald-400 font-bold">65</code></li>
                    <li>Nested property: <code className="text-amber-300 font-mono">$.d.data_vijay</code> → auto-unpacks <code className="text-emerald-400 font-bold">65</code></li>
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
                  placeholder='e.g. { "d": { "data_vijay": [<payload>] } }'
                />

                {/* Quick Template Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-400 font-medium mr-1">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, publishPattern: '{ "d": { "data_vijay": [<payload>] } }' }))}
                    className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-300 rounded text-[10px] font-mono hover:bg-sky-500/20"
                  >
                    {`{ "d": { "data_vijay": [<payload>] } }`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, publishPattern: '{ "value": <payload> }' }))}
                    className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-mono hover:bg-slate-700"
                  >
                    {`{ "value": <payload> }`}
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1">
                  <p className="font-semibold text-sky-400 flex items-center space-x-1">
                    <i className="fas fa-circle-question text-[10px]"></i>
                    <span>Wrap Outgoing Publish Messages in JSON Format:</span>
                  </p>
                  <p className="text-gray-300 text-[11px]">
                    Valid replaceable variables: <code className="text-amber-300 font-mono font-bold">&lt;payload&gt;</code>, <code className="text-amber-300 font-mono">&lt;timestamp&gt;</code>, <code className="text-amber-300 font-mono">&lt;client-id&gt;</code>, <code className="text-amber-300 font-mono">&lt;connection&gt;</code>, <code className="text-amber-300 font-mono">&lt;dashboard&gt;</code>, <code className="text-amber-300 font-mono">&lt;panel&gt;</code>
                  </p>
                </div>
              </div>
            )}
          </div>
          )}

          <div className={`grid grid-cols-1 ${isActionable ? 'sm:grid-cols-2' : ''} gap-4 pt-2 border-t border-[#262626]`}>
            <div className="flex items-center space-x-3">
              <input type="checkbox" id="showReceivedTimeStamp" name="showReceivedTimeStamp" checked={formData.showReceivedTimeStamp ?? true} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded" />
              <label htmlFor="showReceivedTimeStamp" className="text-gray-300 text-xs font-semibold flex items-center space-x-1">
                <i className="fas fa-clock text-emerald-400 text-[10px]"></i>
                <span>Show Subscribed (Rx) Time</span>
              </label>
            </div>
            {isActionable && (
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="showSentTimeStamp" name="showSentTimeStamp" checked={formData.showSentTimeStamp ?? true} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded" />
                <label htmlFor="showSentTimeStamp" className="text-gray-300 text-xs font-semibold flex items-center space-x-1">
                  <i className="fas fa-paper-plane text-amber-400 text-[10px]"></i>
                  <span>Show Published (Tx) Time</span>
                </label>
              </div>
            )}
          </div>

          {isActionable && (
            <>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" id="confirmPublish" name="confirmPublish" checked={formData.confirmPublish || false} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded" />
                  <label htmlFor="confirmPublish" className="text-gray-300 text-xs font-semibold">Confirm Before Publish</label>
                </div>
                {formData.type === PanelType.TEXT_INPUT && (
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="clearOnPublish" name="clearOnPublish" checked={formData.clearOnPublish || false} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded" />
                    <label htmlFor="clearOnPublish" className="text-gray-300 text-xs font-semibold">Clear Text on Publish</label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300 text-xs font-semibold">QoS Level</span>
                  <select name="qos" value={formData.qos ?? 0} onChange={handleChange} className="bg-[#1a1a1a] text-white border border-gray-700 outline-none rounded p-1 text-xs">
                    <option value="0">QoS 0 (At most once)</option>
                    <option value="1">QoS 1 (At least once)</option>
                    <option value="2">QoS 2 (Exactly once)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" id="retain" name="retain" checked={formData.retain || false} onChange={handleChange} className="w-4 h-4 accent-amber-500 rounded" />
                  <label htmlFor="retain" className="text-gray-300 text-xs font-semibold">Retain Message</label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex space-x-4">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 font-bold uppercase rounded-lg text-xs">Cancel</button>
          <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase rounded-lg text-xs shadow-lg">Save Changes</button>
        </div>
      </form>

      {/* Overlays */}
      <IconPicker 
        isOpen={!!pickingIconFor} 
        onClose={() => setPickingIconFor(null)} 
        currentIcon={pickingIconFor === 'on' ? formData.iconOn : formData.iconOff}
        onSelect={(icon) => setFormData((prev: any) => ({ ...prev, [pickingIconFor === 'on' ? 'iconOn' : 'iconOff']: icon }))}
      />

      <ColorPicker 
        isOpen={!!pickingColorFor} 
        onClose={() => setPickingColorFor(null)} 
        initialColor={formData[pickingColorFor === 'first' ? 'firstColor' : pickingColorFor === 'second' ? 'secondColor' : pickingColorFor === 'third' ? 'thirdColor' : pickingColorFor === 'iconOn' ? 'iconColorOn' : 'iconColorOff']}
        onSelect={(color) => setFormData((prev: any) => ({ 
          ...prev, 
          [pickingColorFor === 'first' ? 'firstColor' : 
           pickingColorFor === 'second' ? 'secondColor' : 
           pickingColorFor === 'third' ? 'thirdColor' : 
           pickingColorFor === 'iconOn' ? 'iconColorOn' : 'iconColorOff']: color 
        }))}
      />
    </div>
  );
};

export default EditPanelModal;
