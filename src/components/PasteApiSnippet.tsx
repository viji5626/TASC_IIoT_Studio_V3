import React, { useState } from 'react';
import { parseApiSnippet, ParsedSnippet } from '../utils/aiSnippetParser';

interface Props {
  onApply: (parsed: ParsedSnippet) => void;
}

export const PasteApiSnippet: React.FC<Props> = ({ onApply }) => {
  const [snippetText, setSnippetText] = useState('');
  const [parsed, setParsed] = useState<ParsedSnippet | null>(null);

  const handleParse = () => {
    if (!snippetText.trim()) return;
    const res = parseApiSnippet(snippetText);
    setParsed(res);
  };

  const handleApply = () => {
    if (!parsed) return;
    onApply(parsed);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-4 mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <i className="fas fa-paste text-indigo-400"></i>
          <span>Auto-Configure from Code Snippet (Python / curl / JS)</span>
        </label>
      </div>

      <textarea
        value={snippetText}
        onChange={(e) => {
          setSnippetText(e.target.value);
          setParsed(null);
        }}
        placeholder={`Paste your Python, curl, or JS snippet here, e.g.:\nopenai.OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key="nvapi-...")`}
        rows={4}
        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleParse}
          disabled={!snippetText.trim()}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5"
        >
          <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
          <span>Parse Snippet</span>
        </button>

        {parsed && (
          <button
            type="button"
            onClick={handleApply}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <i className="fas fa-check"></i>
            <span>Apply Config</span>
          </button>
        )}
      </div>

      {parsed && (
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-3 text-xs space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Extracted Parameters:</div>
          {parsed.baseUrl && (
            <div className="text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Base URL:</span>
              <span className="font-mono text-emerald-400 truncate max-w-xs">{parsed.baseUrl}</span>
            </div>
          )}
          {parsed.model && (
            <div className="text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Model:</span>
              <span className="font-mono text-sky-400">{parsed.model}</span>
            </div>
          )}
          {parsed.apiKey && (
            <div className="text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">API Key:</span>
              <span className="font-mono text-amber-400">••••••••{parsed.apiKey.slice(-4)}</span>
            </div>
          )}
          {parsed.temperature !== undefined && (
            <div className="text-slate-300 flex items-center justify-between">
              <span className="text-slate-400">Temperature:</span>
              <span className="font-mono text-slate-200">{parsed.temperature}</span>
            </div>
          )}

          {parsed.warnings.map((w, idx) => (
            <div key={idx} className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-[11px] flex items-center space-x-1.5 mt-2">
              <i className="fas fa-triangle-exclamation"></i>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
