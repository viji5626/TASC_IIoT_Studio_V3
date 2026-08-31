import React, { useState } from 'react';
import { Panel, SmartObjectTemplate } from '../types';
import { generateCanvasFromPrompt, CanvasGenerationResult } from '../services/ai/textToCanvasEngine';
import { SmartRootSourceType } from '../utils/smartObjectResolver';

interface AiCanvasBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPanelsToCanvas: (panels: Partial<Panel>[]) => void;
  onSaveTemplate?: (template: SmartObjectTemplate) => void;
  activeDashboardId?: string;
}

export const AiCanvasBuilderModal: React.FC<AiCanvasBuilderModalProps> = ({
  isOpen,
  onClose,
  onAddPanelsToCanvas,
  onSaveTemplate,
  activeDashboardId = 'dashboard-1'
}) => {
  const [prompt, setPrompt] = useState('Create a faceplate for a motor with start stop button, speed input, speed reference PV, and trip indicator');
  const [rootSourceType, setRootSourceType] = useState<SmartRootSourceType>('driver_tag');
  const [rootPath, setRootPath] = useState('Motor_01_');

  const [previewResult, setPreviewResult] = useState<CanvasGenerationResult>(() =>
    generateCanvasFromPrompt({
      prompt: 'Create a faceplate for a motor with start stop button, speed input, speed reference PV, and trip indicator',
      dashboardId: activeDashboardId,
      rootSourceType: 'driver_tag',
      rootPath: 'Motor_01_'
    })
  );

  if (!isOpen) return null;

  const handleGenerate = (customPrompt?: string, customSource?: SmartRootSourceType, customRoot?: string) => {
    const activePrompt = customPrompt !== undefined ? customPrompt : prompt;
    const activeSource = customSource !== undefined ? customSource : rootSourceType;
    const activeRoot = customRoot !== undefined ? customRoot : rootPath;

    const res = generateCanvasFromPrompt({
      prompt: activePrompt,
      dashboardId: activeDashboardId,
      rootSourceType: activeSource,
      rootPath: activeRoot
    });
    setPreviewResult(res);
  };

  const handleApply = () => {
    onAddPanelsToCanvas(previewResult.panels);
    onClose();
  };

  const handleSaveToLibrary = () => {
    if (!onSaveTemplate) return;
    const tpl: SmartObjectTemplate = {
      id: `template_${Date.now()}`,
      name: previewResult.title || 'Custom Smart Faceplate',
      category: 'Smart Objects',
      description: `Auto-generated faceplate with root path: ${rootPath}`,
      rootSourceType,
      defaultRootPath: rootPath,
      w: 420,
      h: 260,
      panels: previewResult.panels,
      createdAt: new Date().toISOString()
    };
    onSaveTemplate(tpl);
    alert(`Saved "${tpl.name}" into Smart Object Template Library!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <i className="fas fa-wand-magic-sparkles text-white text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Text-to-SCADA Smart Faceplate Builder</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300">
                  AI Parameterized
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generate grouped smart objects. Bind a single root tag or prefix to automatically map all internal child controls.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Prompt Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Describe Faceplate / Equipment Requirements
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Motor faceplate with start stop button, speed input and speed reference section..."
                className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/60 font-mono"
              />
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shrink-0 flex items-center space-x-1.5"
              >
                <i className="fas fa-bolt" />
                <span>Generate</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Presets:</span>
            {[
              { label: 'VFD Motor Station (Start, Stop, Speed SP/PV, Trip)', p: 'motor faceplate start stop speed input speed reference trip', root: 'Motor_01_' },
              { label: 'Chiller Plant (Temp, COP, Run/Stop)', p: 'chiller plant with temp gauges and run switch', root: 'Chiller_01_' },
              { label: 'Boiler Tank & Steam Distribution', p: 'boiler tank level and steam flow rate', root: 'Boiler_01_' }
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPrompt(preset.p);
                  setRootPath(preset.root);
                  handleGenerate(preset.p, rootSourceType, preset.root);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Parameterized Root Tag Source & Path Inspector */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <i className="fas fa-link text-sky-400" />
                <span>Root Tag Binding Configuration</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Maps 1 Root Path $\rightarrow$ All Child Tags
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Source Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">Root Source</label>
                <select
                  value={rootSourceType}
                  onChange={e => {
                    const src = e.target.value as SmartRootSourceType;
                    setRootSourceType(src);
                    const sampleRoot = src === 'driver_tag' ? 'Motor_01_' : src === 'asset' ? 'Plant/Pumps/Pump_01' : 'factory/line1/motor1';
                    setRootPath(sampleRoot);
                    handleGenerate(undefined, src, sampleRoot);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="driver_tag">Driver Tags (Prefix Matching)</option>
                  <option value="asset">Asset Hierarchy (ISA-95 Path)</option>
                  <option value="mqtt">MQTT Topics (Topic Tree)</option>
                </select>
              </div>

              {/* 2. Root Path / Prefix Input */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                  {rootSourceType === 'driver_tag' ? 'Tag Prefix (e.g. Motor_01_ or Motor_01)' : 'Folder / Topic Path'}
                </label>
                <input
                  type="text"
                  value={rootPath}
                  onChange={e => {
                    setRootPath(e.target.value);
                    handleGenerate(undefined, rootSourceType, e.target.value);
                  }}
                  placeholder={rootSourceType === 'driver_tag' ? 'e.g. Motor_01_ or Motor_01' : 'e.g. Plant/Pumps/Pump_01'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Preview Canvas Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                <i className="fas fa-layer-group text-sky-400" />
                <span>Generated Smart Components ({previewResult.panels.length} controls)</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                {previewResult.connectionsSummary}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl">
              {previewResult.panels.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-1 shadow-sm hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-[11px] text-white truncate">{p.panelName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-sky-400 uppercase">
                      {p.type}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {p.relativeTagBinding && (
                      <div className="text-[10px] text-indigo-300 font-mono">
                        Sub-tag: <code className="bg-indigo-950/80 px-1 rounded">.{p.relativeTagBinding}</code>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      Resolved: <span className="text-emerald-400">{p.topic}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          {onSaveTemplate ? (
            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <i className="fas fa-bookmark text-amber-400" />
              <span>Save as Template</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/20 flex items-center space-x-1.5"
            >
              <i className="fas fa-plus" />
              <span>Drop Smart Faceplate onto Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
