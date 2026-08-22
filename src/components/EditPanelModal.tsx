import React, { useState, useEffect } from 'react';
import { Panel, PanelType, AppState, HistorianTag } from '../types';
import IconPicker from './IconPicker';
import ColorPicker from './ColorPicker';
import { useAppStore } from '../store/useAppStore';

// Modular Sections
import { PanelDataSourceSection } from './editPanel/sections/PanelDataSourceSection';
import { PanelDynamicsSection } from './editPanel/sections/PanelDynamicsSection';
import { PanelAlarmsSection } from './editPanel/sections/PanelAlarmsSection';
import { PanelTrendSection } from './editPanel/sections/PanelTrendSection';
import { PanelOptionsEditor } from './editPanel/sections/PanelOptionsEditor';
import { PanelControlsSection } from './editPanel/sections/PanelControlsSection';
import { PanelMediaAndPipeSection } from './editPanel/sections/PanelMediaAndPipeSection';
import { PanelSetpointSection } from './editPanel/sections/PanelSetpointSection';
import { PanelSymbolSection } from './editPanel/sections/PanelSymbolSection';
import { PanelAppearanceSection } from './editPanel/sections/PanelAppearanceSection';
import { PanelAlarmLogConfigSection } from './editPanel/sections/PanelAlarmLogConfigSection';
import { PanelTASCGridConfigSection } from './editPanel/sections/PanelTASCGridConfigSection';

interface EditPanelModalProps {
  panel: Partial<Panel>;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedPanel: any) => void;
  appState?: AppState;
  onAddHistorianTag?: (tag: HistorianTag) => void;
}

const EditPanelModal: React.FC<EditPanelModalProps> = ({ 
  panel, 
  isOpen, 
  onClose, 
  onSave: onSaveProp, 
  appState: appStateProp, 
  onAddHistorianTag: onAddHistorianTagProp 
}) => {
  const store = useAppStore();
  const appState = appStateProp ?? store.appState;
  const onSave = onSaveProp ?? store.handleSavePanel;
  const onAddHistorianTag = onAddHistorianTagProp ?? ((newTag: HistorianTag) => {
    store.setAppState(prev => ({
      ...prev,
      historianTags: [...(prev.historianTags || []).filter(t => t.id !== newTag.id), newTag]
    }));
  });

  const [formData, setFormData] = useState<any>(panel);
  const [pickingIconFor, setPickingIconFor] = useState<'on' | 'off' | null>(null);
  const [pickingColorFor, setPickingColorFor] = useState<'iconOn' | 'iconOff' | 'first' | 'second' | 'third' | null>(null);
  const [optionsStr, setOptionsStr] = useState('');
  const [optionItems, setOptionItems] = useState<{ label: string; value: string }[]>([]);
  const [dataSourceMode, setDataSourceMode] = useState<'mqtt' | 'driver'>(
    panel.dataSourceMode ?? 'mqtt'
  );

  useEffect(() => {
    if (isOpen) {
      setDataSourceMode(panel.dataSourceMode ?? 'mqtt');
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
        fontSize: panel.fontSize ?? 18,
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

        // Tag-Based Motion Dynamics
        enableMotionDynamics: panel.enableMotionDynamics ?? false,
        motionTagMode: panel.motionTagMode ?? 'same',
        motionDataSourceMode: panel.motionDataSourceMode ?? 'mqtt',
        motionTopic: panel.motionTopic ?? '',
        motionDriverTagId: panel.motionDriverTagId ?? '',
        motionTagMin: panel.motionTagMin !== undefined ? Number(panel.motionTagMin) : pMin,
        motionTagMax: panel.motionTagMax !== undefined ? Number(panel.motionTagMax) : pMax,
        motionStartX: panel.motionStartX !== undefined ? Number(panel.motionStartX) : 0,
        motionStartY: panel.motionStartY !== undefined ? Number(panel.motionStartY) : 0,
        motionEndX: panel.motionEndX !== undefined ? Number(panel.motionEndX) : 150,
        motionEndY: panel.motionEndY !== undefined ? Number(panel.motionEndY) : 0,

        // Tag-Based Rotation Dynamics
        enableRotationDynamics: panel.enableRotationDynamics ?? false,
        rotationMode: panel.rotationMode ?? 'continuous',
        rotationTagMode: panel.rotationTagMode ?? 'same',
        rotationDataSourceMode: panel.rotationDataSourceMode ?? 'mqtt',
        rotationTopic: panel.rotationTopic ?? '',
        rotationDriverTagId: panel.rotationDriverTagId ?? '',
        rotationDirection: panel.rotationDirection ?? 'cw',
        rotationSpeed: panel.rotationSpeed ?? 'medium',
        rotationDurationSeconds: panel.rotationDurationSeconds !== undefined ? Number(panel.rotationDurationSeconds) : 2,
        rotationTriggerType: panel.rotationTriggerType ?? 'digital',
        rotationOperator: panel.rotationOperator ?? '>',
        rotationTriggerValue: panel.rotationTriggerValue ?? '0',
        rotationTagMin: panel.rotationTagMin !== undefined ? Number(panel.rotationTagMin) : pMin,
        rotationTagMax: panel.rotationTagMax !== undefined ? Number(panel.rotationTagMax) : pMax,
        rotationAngleMin: panel.rotationAngleMin !== undefined ? Number(panel.rotationAngleMin) : 0,
        rotationAngleMax: panel.rotationAngleMax !== undefined ? Number(panel.rotationAngleMax) : 360,

        // Equipment Trip Tag & Alarms
        enableTrip: panel.enableTrip ?? false,
        tripTopic: panel.tripTopic ?? '',
        tripJsonPath: panel.tripJsonPath ?? '',
        payloadTrip: panel.payloadTrip ?? '1',
        tripMessage: panel.tripMessage ?? 'EQUIPMENT TRIP / FAULT DETECTED',
        tripColor: panel.tripColor ?? '#ef4444',
        tripAnimStyle: panel.tripAnimStyle ?? 'flash_strobe'
      });
      setOptionsStr(initialOptionItems.map(o => `${o.label}:${o.value}`).join(', '));
    }
  }, [isOpen, panel]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === 'checkbox') {
      val = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      val = value === '' ? '' : Number(value);
    }

    setFormData((prev: any) => {
      const next = { ...prev, [name]: val };
      if (name === 'payloadMin' || name === 'payloadMax') {
        const pMin = name === 'payloadMin' ? Number(val) : Number(prev.payloadMin ?? 0);
        const pMax = name === 'payloadMax' ? Number(val) : Number(prev.payloadMax ?? 100);
        if (pMin < pMax) {
          const range = pMax - pMin;
          next.lowThreshold = Math.max(pMin, Math.min(Number(prev.lowThreshold ?? pMin + range * 0.33), pMax));
          next.highThreshold = Math.max(next.lowThreshold, Math.min(Number(prev.highThreshold ?? pMin + range * 0.66), pMax));
        }
      }
      return next;
    });
  };

  const handleLowThresholdChange = (newLow: number) => {
    setFormData((prev: any) => {
      const pMin = Number(prev.payloadMin ?? 0);
      const pMax = Number(prev.payloadMax ?? 100);
      const clampedLow = Math.max(pMin, Math.min(newLow, pMax));
      const clampedHigh = Math.max(clampedLow, Number(prev.highThreshold ?? pMax));
      return {
        ...prev,
        lowThreshold: clampedLow,
        highThreshold: clampedHigh
      };
    });
  };

  const handleHighThresholdChange = (newHigh: number) => {
    setFormData((prev: any) => {
      const pMin = Number(prev.payloadMin ?? 0);
      const pMax = Number(prev.payloadMax ?? 100);
      const clampedHigh = Math.max(pMin, Math.min(newHigh, pMax));
      const clampedLow = Math.min(Number(prev.lowThreshold ?? pMin), clampedHigh);
      return {
        ...prev,
        lowThreshold: clampedLow,
        highThreshold: clampedHigh
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      dataSourceMode,
      options: optionItems.map(o => `${o.label}:${o.value}`),
      optionItems
    });
    onClose();
  };

  const isActionable = [
    PanelType.BUTTON,
    PanelType.SWITCH,
    PanelType.SLIDER,
    PanelType.TEXT_INPUT,
    PanelType.COMBO_BOX,
    PanelType.RADIO_BUTTONS
  ].includes(formData.type);

  const isGauge = [
    PanelType.GAUGE,
    PanelType.PROGRESS,
    PanelType.TEXT_OUTPUT
  ].includes(formData.type);

  const isLED = formData.type === PanelType.LED;
  const isSwitch = formData.type === PanelType.SWITCH;
  const isButton = formData.type === PanelType.BUTTON;
  const isSlider = formData.type === PanelType.SLIDER;
  const isTextInput = formData.type === PanelType.TEXT_INPUT;
  const isStaticText = formData.type === PanelType.STATIC_TEXT;
  const isScreenJump = formData.type === PanelType.SCREEN_JUMP;
  const isImage = formData.type === PanelType.IMAGE;
  const isClock = formData.type === PanelType.CLOCK;
  const isPipe = formData.type === PanelType.PIPE;
  const isShape = formData.type === PanelType.SHAPE;
  const isLineGraph = formData.type === PanelType.LINE_GRAPH;
  const isAlarmLog = formData.type === PanelType.ALARM_LOG;
  const isTascGrid = formData.type === PanelType.TASC_GRID || formData.type === 'tasc_grid';
  const isOptionsType = formData.type === PanelType.COMBO_BOX || formData.type === PanelType.RADIO_BUTTONS || formData.type === PanelType.MULTI_STATE;
  const isRadioButtons = formData.type === PanelType.RADIO_BUTTONS;
  const isComboBox = formData.type === PanelType.COMBO_BOX;
  const isSetpointInput = isSlider || isTextInput;
  const isStaticOrDecorative = isStaticText || isClock || isScreenJump || isPipe || isShape;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#262626] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
              <i className="fas fa-sliders"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Configure Panel</h2>
              <p className="text-xs text-gray-400">Customize telemetry data bindings, alarms, and appearance</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-white flex items-center justify-center transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Panel Name & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-amber-500 absolute -top-2">Panel Name *</label>
              <input name="panelName" value={formData.panelName || ''} onChange={handleChange} required className="w-full bg-transparent outline-none text-white py-2" placeholder="e.g. Tank Level" />
            </div>
            <div className="relative border-b border-gray-700 py-2">
              <label className="text-xs text-gray-400 absolute -top-2">Description</label>
              <input name="description" value={formData.description || ''} onChange={handleChange} className="w-full bg-transparent outline-none text-white py-2" placeholder="Optional notes" />
            </div>
          </div>

          {/* If TASCGrid: ONLY render TASCGrid dedicated multi-source & table configuration */}
          {isTascGrid ? (
            <PanelTASCGridConfigSection
              formData={formData}
              setFormData={setFormData}
              handleChange={handleChange}
            />
          ) : (
            <>
              {/* 1. Data Source Section (MQTT & Driver Tags) */}
              <PanelDataSourceSection
                formData={formData}
                setFormData={setFormData}
                dataSourceMode={dataSourceMode}
                setDataSourceMode={setDataSourceMode}
                appState={appState}
                handleChange={handleChange}
                isActionable={isActionable}
                isStaticText={isStaticText}
                isClock={isClock}
                isScreenJump={isScreenJump}
                isLineGraph={isLineGraph}
              />

              {/* 2. Media, Pipe, Clock, ScreenJump, StaticText */}
              <PanelMediaAndPipeSection
                formData={formData}
                setFormData={setFormData}
                handleChange={handleChange}
                isStaticText={isStaticText}
                isScreenJump={isScreenJump}
                isImage={isImage}
                isClock={isClock}
                isPipe={isPipe}
              />

              {/* 3. Controls (Buttons, Switches, LEDs) */}
              <PanelControlsSection
                formData={formData}
                setFormData={setFormData}
                handleChange={handleChange}
                setPickingIconFor={setPickingIconFor}
                setPickingColorFor={setPickingColorFor}
                isLED={isLED}
                isSwitch={isSwitch}
                isButton={isButton}
              />

              {/* 4. Setpoint Input Limits */}
              {isSetpointInput && (
                <PanelSetpointSection
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                  isSlider={isSlider}
                  isTextInput={isTextInput}
                />
              )}

              {/* 5. Options Editor (Combo Box & Radio Buttons) */}
              {isOptionsType && (
                <PanelOptionsEditor
                  formData={formData}
                  setFormData={setFormData}
                  optionItems={optionItems}
                  setOptionItems={setOptionItems}
                  optionsStr={optionsStr}
                  setOptionsStr={setOptionsStr}
                  isRadioButtons={isRadioButtons}
                  isComboBox={isComboBox}
                />
              )}

              {/* 6. Industrial Symbol Animation & Alarming */}
              <PanelSymbolSection
                formData={formData}
                setFormData={setFormData}
                handleChange={handleChange}
                handleLowThresholdChange={handleLowThresholdChange}
                handleHighThresholdChange={handleHighThresholdChange}
                setPickingColorFor={setPickingColorFor}
              />

              {/* 7. Alarm Log Configuration */}
              {isAlarmLog && (
                <PanelAlarmLogConfigSection
                  formData={formData}
                  setFormData={setFormData}
                  handleChange={handleChange}
                />
              )}

              {/* 8. Industrial Trend & Multi-Pen Graph */}
              {isLineGraph && (
                <PanelTrendSection
                  formData={formData}
                  setFormData={setFormData}
                  appState={appState}
                  dataSourceMode={dataSourceMode}
                  handleChange={handleChange}
                  onAddHistorianTag={onAddHistorianTag}
                />
              )}

              {/* 9. Equipment Trip & Multi-Zone Alarms */}
              <PanelAlarmsSection
                formData={formData}
                setFormData={setFormData}
                appState={appState}
                handleChange={handleChange}
                handleLowThresholdChange={handleLowThresholdChange}
                handleHighThresholdChange={handleHighThresholdChange}
                setPickingColorFor={setPickingColorFor}
                isGauge={isGauge}
                isStaticOrDecorative={isStaticOrDecorative}
                isLineGraph={isLineGraph}
              />

              {/* 10. Motion & Rotation Dynamics */}
              <PanelDynamicsSection
                formData={formData}
                setFormData={setFormData}
                appState={appState}
                handleChange={handleChange}
                isStaticOrDecorative={isStaticOrDecorative}
                isLineGraph={isLineGraph}
              />

              {/* 11. Appearance, Layout & Publish Behavior */}
              <PanelAppearanceSection
                formData={formData}
                setFormData={setFormData}
                appState={appState}
                handleChange={handleChange}
                isActionable={isActionable}
                isStaticText={isStaticText}
                isImage={isImage}
                isClock={isClock}
                isPipe={isPipe}
                isShape={isShape}
                isScreenJump={isScreenJump}
                dataSourceMode={dataSourceMode}
              />
            </>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex space-x-4 pt-4 border-t border-[#262626]">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-[#1e1e1e] hover:bg-[#282828] text-gray-300 font-bold uppercase rounded-lg text-xs cursor-pointer transition-colors">
            Cancel
          </button>
          <button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase rounded-lg text-xs shadow-lg cursor-pointer transition-colors">
            Save Changes
          </button>
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
