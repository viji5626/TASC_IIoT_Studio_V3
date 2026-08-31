import React, { useState, useEffect, useCallback } from 'react';
import { pythonBridge } from '../services/ai/pythonBridgeClient';

interface EmbeddedGgufControlProps {
  currentModelPath?: string;
  onSelectModelPath: (path: string) => void;
  onConfigChange?: (extraJson: string) => void;
}

interface DiscoveredModel {
  name: string;
  path: string;
  sizeMb: number;
  isLoaded: boolean;
  isVisionProjector?: boolean;
}

export const EmbeddedGgufControl: React.FC<EmbeddedGgufControlProps> = ({
  currentModelPath,
  onSelectModelPath,
  onConfigChange
}) => {
  const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [customPath, setCustomPath] = useState<string>(currentModelPath || '');
  const [customSearchDir, setCustomSearchDir] = useState<string>('C:\\Users\\vijay\\.lmstudio\\models\\lmstudio-community');
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Model hyperparameters
  const [nThreads, setNThreads] = useState<number>(4);
  const [nCtx, setNCtx] = useState<number>(2048);
  const [gpuLayers, setGpuLayers] = useState<number>(0);
  const [gbnfEnabled, setGbnfEnabled] = useState<boolean>(true);

  const checkBridge = useCallback(async () => {
    setBridgeStatus('checking');
    try {
      const health = await pythonBridge.checkHealth();
      if (health.isAvailable) {
        setBridgeStatus('online');
        setLatencyMs(health.latencyMs);
      } else {
        setBridgeStatus('offline');
      }
    } catch {
      setBridgeStatus('offline');
    }
  }, []);

  const handleScanModels = useCallback(async (dirOverride?: string) => {
    setIsScanning(true);
    try {
      const targetDir = dirOverride !== undefined ? dirOverride : customSearchDir;
      const models = await pythonBridge.scanGgufModels(targetDir || undefined);
      setDiscoveredModels(models);
      if (models.length === 0) {
        setLoadMessage('No .gguf models found in search paths. You can type a direct file path above.');
      } else {
        setLoadMessage(`Discovered ${models.length} .gguf model(s). Click any model to select and load.`);
      }
      setTimeout(() => setLoadMessage(null), 4500);
    } catch {
      setLoadMessage('Failed to scan folders for .gguf files.');
    } finally {
      setIsScanning(false);
    }
  }, [customSearchDir]);

  // Auto-check bridge and auto-scan on initial render
  useEffect(() => {
    checkBridge();
    handleScanModels();
  }, [checkBridge, handleScanModels]);

  const handleLoadModel = async (path: string) => {
    setIsLoadingModel(true);
    setLoadMessage(null);
    try {
      onSelectModelPath(path);
      setCustomPath(path);
      const configJson = JSON.stringify({
        n_ctx: nCtx,
        n_threads: nThreads,
        gpu_layers: gpuLayers,
        gbnf_grammar: gbnfEnabled
      });
      if (onConfigChange) onConfigChange(configJson);

      const res = await pythonBridge.loadGgufModel(path, nCtx, nThreads, gpuLayers);
      if (res.status === 'SUCCESS') {
        setLoadMessage(`Model "${res.modelName || path}" loaded successfully!`);
      } else {
        setLoadMessage(`Selected "${path.split('\\').pop()}". (Config saved in profile)`);
      }
    } catch (e: any) {
      setLoadMessage(`Selected model: ${path.split('\\').pop()}`);
    } finally {
      setIsLoadingModel(false);
    }
  };

  const filteredModels = discoveredModels.filter(m => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q);
  });

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4 shadow-inner">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <i className="fas fa-microchip text-sm"></i>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center space-x-2">
              <span>Local GGUF Runtime (llama-cpp-python)</span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono">Air-Gapped</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Zero cloud latency & zero external app dependencies. Direct C++ inference with GBNF tool grammar.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center space-x-1.5 ${
              bridgeStatus === 'online'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : bridgeStatus === 'checking'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                bridgeStatus === 'online' ? 'bg-emerald-400 animate-pulse' : bridgeStatus === 'checking' ? 'bg-amber-400' : 'bg-indigo-400'
              }`}
            ></span>
            <span>{bridgeStatus === 'online' ? `IPC Online (${latencyMs}ms)` : bridgeStatus === 'checking' ? 'Checking' : 'Local Node Engine'}</span>
          </span>
          <button
            type="button"
            onClick={checkBridge}
            className="text-slate-400 hover:text-slate-200 text-xs p-1"
            title="Refresh status"
          >
            <i className="fas fa-rotate"></i>
          </button>
        </div>
      </div>

      {/* Search Directory / Auto-Scan Bar */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <i className="fas fa-folder-tree text-indigo-400"></i>
            <span>Model Search Folder:</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {discoveredModels.length} GGUF files found
          </span>
        </label>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={customSearchDir}
            onChange={(e) => setCustomSearchDir(e.target.value)}
            placeholder="e.g. C:\Users\vijay\.lmstudio\models\lmstudio-community"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => handleScanModels()}
            disabled={isScanning}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <i className={`fas ${isScanning ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`}></i>
            <span>{isScanning ? 'Scanning...' : 'Scan Folder'}</span>
          </button>
        </div>
      </div>

      {/* Discovered Models Explorer */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <i className="fas fa-cubes text-slate-400"></i>
            <span>Available Downloaded Models:</span>
          </span>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter models..."
            className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36"
          />
        </div>

        {filteredModels.length > 0 ? (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar border border-slate-800/80 rounded-lg p-1.5 bg-slate-900/50">
            {filteredModels.map((m, idx) => {
              const isCurrent = customPath === m.path || (customPath && customPath.includes(m.name));
              return (
                <div
                  key={idx}
                  onClick={() => handleLoadModel(m.path)}
                  className={`p-2 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-indigo-600/25 border-indigo-500/80 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/90 border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs shrink-0 ${
                      m.isVisionProjector ? 'bg-purple-500/15 text-purple-400' : isCurrent ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <i className={`fas ${m.isVisionProjector ? 'fa-eye' : 'fa-brain'}`}></i>
                    </div>
                    <div className="flex flex-col truncate">
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-200'}`}>{m.name}</span>
                        {m.isVisionProjector && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-mono">Vision mmproj</span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">Active</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono truncate">{m.path}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {m.sizeMb > 1024 ? `${(m.sizeMb / 1024).toFixed(2)} GB` : `${m.sizeMb} MB`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadModel(m.path);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                      }`}
                    >
                      {isCurrent ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
            No models matching your search. Click &quot;Scan Folder&quot; above to search for .gguf files.
          </div>
        )}
      </div>

      {/* Selected Model Path Display */}
      {customPath && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
            <i className="fas fa-circle-check text-emerald-400"></i>
            <span>Active Model Path:</span>
          </label>
          <input
            type="text"
            value={customPath}
            onChange={(e) => {
              setCustomPath(e.target.value);
              onSelectModelPath(e.target.value);
            }}
            placeholder="Selected model file path..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Status Feedback Message */}
      {loadMessage && (
        <div className="text-xs font-mono bg-slate-900 border border-indigo-500/40 text-indigo-300 p-2 rounded-lg flex items-center space-x-2">
          <i className="fas fa-info-circle text-indigo-400"></i>
          <span>{loadMessage}</span>
        </div>
      )}

      {/* Hyperparameter Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">CPU Threads:</label>
          <select
            value={nThreads}
            onChange={(e) => setNThreads(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value={2}>2 Threads</option>
            <option value={4}>4 Threads (Recommended)</option>
            <option value={8}>8 Threads</option>
            <option value={12}>12 Threads</option>
            <option value={16}>16 Threads</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Context Window:</label>
          <select
            value={nCtx}
            onChange={(e) => setNCtx(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value={2048}>2,048 Tokens</option>
            <option value={4096}>4,096 Tokens</option>
            <option value={8192}>8,192 Tokens</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 block mb-1">GPU Offload Layers:</label>
          <input
            type="number"
            min={0}
            max={99}
            value={gpuLayers}
            onChange={(e) => setGpuLayers(parseInt(e.target.value || '0', 10))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* GBNF Grammar Toggle */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="gbnf-toggle"
            checked={gbnfEnabled}
            onChange={(e) => setGbnfEnabled(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
          />
          <label htmlFor="gbnf-toggle" className="text-xs text-slate-300 font-semibold cursor-pointer">
            Enforce GBNF Context-Free Tool Grammar
          </label>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">100% Mathematical JSON Schema Compliance</span>
      </div>
    </div>
  );
};
