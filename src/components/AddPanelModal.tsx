import React from 'react';
import { PANEL_ICONS } from '../constants';
import { PanelType } from '../types';

interface AddPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
}

const AddPanelModal: React.FC<AddPanelModalProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  const panelTypes = [
    { id: PanelType.GAUGE, label: 'Gauge', desc: 'Analog circular dial display for scalar values' },
    { id: PanelType.LINE_GRAPH, label: 'Line Graph', desc: 'Real-time sparkline graph over time' },
    { id: PanelType.LED, label: 'LED Indicator', desc: 'Status light with customizable icons & glowing aura' },
    { id: PanelType.SWITCH, label: 'Toggle Switch', desc: 'Binary switch to publish ON/OFF states' },
    { id: PanelType.BUTTON, label: 'Action Button', desc: 'Trigger button to send custom MQTT payloads' },
    { id: PanelType.SLIDER, label: 'Range Slider', desc: 'Continuous value adjustment slider' },
    { id: PanelType.PROGRESS, label: 'Progress Bar', desc: 'Visual progress or battery level bar' },
    { id: PanelType.LOG, label: 'Text Display', desc: 'Formatted numeric or textual sensor readout' },
    { id: PanelType.NODE_STATUS, label: 'Node Status', desc: 'Device heartbeat status (Online / Offline)' },
    { id: PanelType.TEXT_INPUT, label: 'Text Input', desc: 'Send text commands or configuration parameters' },
    { id: PanelType.TEXT_OUTPUT, label: 'Text Output', desc: 'Multi-line log or plain text message receiver' },
    { id: PanelType.COLOR_PICKER, label: 'Color Picker', desc: 'RGB color swatches for smart lighting' },
    { id: PanelType.COMBO_BOX, label: 'Combo Box', desc: 'Dropdown menu to choose preset mode payloads' },
    { id: PanelType.RADIO_BUTTONS, label: 'Radio Buttons', desc: 'Group of option buttons for device modes' },
    { id: PanelType.MULTI_STATE, label: 'Multi-State', desc: 'Multi-state indicator badge' },
    { id: PanelType.STATIC_TEXT, label: 'Static Text / Label', desc: 'Custom header label or title for HMI screen layout' },
    { id: PanelType.CLOCK, label: 'Live Date & Clock Display', desc: 'Real-time clock and calendar display with customizable format' },
    { id: PanelType.SCREEN_JUMP, label: 'Screen Jump Button', desc: 'HMI button to navigate between different screen pages' },
    { id: PanelType.IMAGE, label: 'Media / Animated Graphic', desc: 'Import JPG, transparent PNG, animated GIF, or SVG' },
    { id: PanelType.ALARM_LOG, label: 'Alarm Historian Log', desc: 'Live & historical industrial alarm log viewer' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-slate-800">
        <div className="p-4 px-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <i className="fas fa-plus-circle text-sky-400 text-lg"></i>
            <h2 className="text-lg font-bold text-white">Select Panel Component</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        
        <div className="overflow-y-auto flex-grow p-4 space-y-2">
          {panelTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800/80 rounded-2xl transition-all border border-slate-800/80 hover:border-sky-500/50 group text-left shadow-sm"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                  {PANEL_ICONS[type.id] || <i className="fas fa-square"></i>}
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-100 font-semibold text-sm group-hover:text-sky-400 transition-colors">{type.label}</span>
                  <span className="text-slate-400 text-xs">{type.desc}</span>
                </div>
              </div>
              <i className="fas fa-chevron-right text-slate-600 group-hover:text-sky-400 text-xs transition-colors"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddPanelModal;
