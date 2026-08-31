import React, { useState } from 'react';
import { CodeTarget, generateIndustrialCode, GeneratedCodeResult } from '../services/ai/aiRadCodeGenerator';
import { transpileLegacyScript, TranspileResult } from '../services/ai/legacyScriptTranspiler';

interface AiAutomationWorkbenchViewProps {
  onBack?: () => void;
}

export const AiAutomationWorkbenchView: React.FC<AiAutomationWorkbenchViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'transpile'>('generate');
  const [target, setTarget] = useState<CodeTarget>('ignition_jython');
  const [prompt, setPrompt] = useState('Generate a 3-pump duty assist standby script with run-hour wear leveling and safety trip interlocks');
  const [generatedResult, setGeneratedResult] = useState<GeneratedCodeResult>(() =>
    generateIndustrialCode({
      target: 'ignition_jython',
      prompt: 'Generate a 3-pump duty assist standby script'
    })
  );

  // Transpile State
  const [legacyScript, setLegacyScript] = useState(`import system
def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    temp = currentValue.value
    flow = system.tag.readBlocking(["[default]Chiller/WaterFlow"])[0].value
    if temp > 85.0 and flow < 20.0:
        system.tag.writeBlocking(["[default]Alarms/ChillerTrip"], [True])
`);
  const [transpileResult, setTranspileResult] = useState<TranspileResult | null>(() =>
    transpileLegacyScript(`import system\ndef valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):\n    temp = currentValue.value\n    flow = system.tag.readBlocking(["[default]Chiller/WaterFlow"])[0].value\n    if temp > 85.0 and flow < 20.0:\n        system.tag.writeBlocking(["[default]Alarms/ChillerTrip"], [True])`)
  );

  const handleGenerate = () => {
    const res = generateIndustrialCode({
      target,
      prompt
    });
    setGeneratedResult(res);
  };

  const handleTranspile = () => {
    const res = transpileLegacyScript(legacyScript);
    setTranspileResult(res);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Code copied to clipboard!');
  };

  const handleDownload = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full text-slate-100">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 transition-colors"
            >
              <i className="fas fa-arrow-left text-sm" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <i className="fas fa-microchip text-white text-lg" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white">AI Automation Code Workbench</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300">
                RAD Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Rapid Multi-Vendor PLC & SCADA Code Generator (Ignition Jython, Siemens SCL, Rockwell ST, TASC AST)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'generate' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-code mr-1.5" />
            Code Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transpile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'transpile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-arrows-rotate mr-1.5" />
            Legacy Transpiler
          </button>
        </div>
      </div>

      {/* ── TAB 1: CODE GENERATOR ────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                1. Target SCADA / PLC Architecture
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ignition_jython', label: 'Ignition Jython', sub: 'Ignition 8.1+ system.*', icon: 'fa-cube' },
                  { id: 'siemens_scl', label: 'Siemens SCL', sub: 'S7-1200 / 1500 FB', icon: 'fa-microchip' },
                  { id: 'rockwell_st', label: 'Rockwell ST', sub: 'Studio 5000 AOI', icon: 'fa-gears' },
                  { id: 'tasc_ast', label: 'TASC AST Rules', sub: 'FDD & HMI Logic', icon: 'fa-bolt' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTarget(item.id as CodeTarget);
                      setGeneratedResult(generateIndustrialCode({ target: item.id as CodeTarget, prompt }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      target === item.id
                        ? 'bg-sky-600/15 border-sky-500/60 text-white shadow-md'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <i className={`fas ${item.icon} text-sky-400 text-xs`} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>
                  </button>
                ))}
              </div>

              {/* Natural Language Prompt */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  2. Describe Automation Logic
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. Generate a duty/assist pump alternator with wear leveling, debounce timing, and low suction safety interlock..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-semibold">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '3-Pump Lead/Lag Alternation',
                    'Rate of Change (dP/dt) Surge Alarm',
                    'Chiller Temperature Overheat AST Rule',
                    'Modbus Power Meter THD Ingestion'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setPrompt(preset);
                        setGeneratedResult(generateIndustrialCode({ target, prompt: preset }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center space-x-2"
              >
                <i className="fas fa-wand-magic-sparkles" />
                <span>Generate Production Logic</span>
              </button>
            </div>
          </div>

          {/* Right Editor & Safety Audit */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white">{generatedResult.title}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                    .{generatedResult.fileExtension}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(generatedResult.code)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1"
                  >
                    <i className="fas fa-copy text-xs" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        `tasc_${generatedResult.target}_logic.${generatedResult.fileExtension}`,
                        generatedResult.code
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center space-x-1"
                  >
                    <i className="fas fa-download text-xs" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Code Display */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed whitespace-pre">
                {generatedResult.code}
              </div>

              {/* Industrial Safety Audit Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-shield-halved text-emerald-400 text-xs" />
                    <span className="text-xs font-bold text-slate-200">Industrial Safety & Linter Audit</span>
                  </div>
                  {generatedResult.safetyCheck.passed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                      ✓ Safety Rules Passed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      ⚠ Advisory Found
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">{generatedResult.explanation}</p>

                {generatedResult.safetyCheck.warnings.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    {generatedResult.safetyCheck.warnings.map((w, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-[11px] text-amber-300">
                        <i className="fas fa-triangle-exclamation text-[10px]" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: LEGACY SCRIPT TRANSPILER ────────────────────────────────────────── */}
      {activeTab === 'transpile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Paste Legacy SCADA Script (Ignition Jython / InTouch / WinCC VBS)
              </label>
              <textarea
                rows={12}
                value={legacyScript}
                onChange={e => setLegacyScript(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 focus:outline-none focus:border-indigo-500/60"
              />
              <button
                type="button"
                onClick={handleTranspile}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <i className="fas fa-arrows-rotate" />
                <span>Transpile to Modern TASC AST Expression</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            {transpileResult && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Transpilation Breakdown & Logic Summary</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono">
                    Detected: {transpileResult.sourceType.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-300 uppercase">Logic Explanation</span>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    {transpileResult.explanation}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Generated TASC AST Expression</span>
                  <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl font-mono text-xs text-emerald-300">
                    {transpileResult.tascAstRule.expression}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-sky-400 uppercase">Modern TypeScript Hook</span>
                  <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl font-mono text-xs text-sky-300 whitespace-pre overflow-x-auto">
                    {transpileResult.modernTypeScriptEquivalent}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
