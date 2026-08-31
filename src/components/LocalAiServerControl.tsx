import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LocalAiServerControlProps {
  provider: 'ollama' | 'lmstudio';
  baseUrl?: string;
  currentModel?: string;
  contextLength?: number;
  gpuOffload?: string | number;
  cpuThreads?: number;
  temperature?: number;
  maxTokens?: number;
  onSelectModel?: (model: string) => void;
  onChangeSettings?: (settings: {
    contextLength?: number;
    gpuOffload?: string | number;
    cpuThreads?: number;
    temperature?: number;
    maxTokens?: number;
  }) => void;
}

interface HardwareSpecs {
  cpu: { model: string; threads: number };
  ram: { totalMb: number; freeMb: number; totalGb: string };
  gpu: { hasGpu: boolean; name: string; totalVramMb: number; freeVramMb: number; usedVramMb: number };
}

export interface ModelRecommendationInfo {
  sizeGb: string;
  parameterSize: string;
  quantization: string;
  family: string;
  supportsTools: boolean;
  supportsVision: boolean;
  trainContext: number;
  recommendations: {
    contextLength: number;
    gpuOffload: string | number;
    cpuThreads: number;
    temperature: number;
    maxTokens: number;
    fitAssessment: string;
    explanation: string;
  };
}

export const LocalAiServerControl: React.FC<LocalAiServerControlProps> = ({
  provider,
  baseUrl,
  currentModel,
  contextLength = 4096,
  gpuOffload = 'max',
  cpuThreads = 8,
  temperature = 0.3,
  maxTokens = 4096,
  onSelectModel,
  onChangeSettings
}) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'starting' | 'stopping'>('checking');
  const [models, setModels] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCliHelp, setShowCliHelp] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [loadResult, setLoadResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [hwSpecs, setHwSpecs] = useState<HardwareSpecs | null>(null);
  const [recommendation, setRecommendation] = useState<ModelRecommendationInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fastPollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastCalculatedModelRef = useRef<string | null>(null);
  const onChangeSettingsRef = useRef(onChangeSettings);
  onChangeSettingsRef.current = onChangeSettings;

  const isOllama = provider === 'ollama';

  // Parse active port from baseUrl or fallback to default
  const targetPort = (() => {
    try {
      if (baseUrl) {
        const u = new URL(baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`);
        if (u.port) return parseInt(u.port, 10);
      }
    } catch (e) {}
    return isOllama ? 11434 : 1234;
  })();

  const title = isOllama ? 'Ollama Local Edge Server' : 'LM Studio Local Server';
  const cmdHint = isOllama
    ? `set OLLAMA_ORIGINS=* && ollama serve`
    : `lms server start --cors --port ${targetPort}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  // Fetch hardware specs
  const fetchHwSpecs = useCallback(async () => {
    try {
      const res = await fetch('/api/local-ai/hardware-specs');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHwSpecs(data);
        }
      }
    } catch (e) {}
  }, []);

  // Auto-Calculate Optimal Hardware Settings for current model
  const calculateOptimalSettings = useCallback(async (modelName?: string, autoApply = true) => {
    const targetModel = (modelName || currentModel || '').trim();
    if (!targetModel) return;

    lastCalculatedModelRef.current = `${provider}:${targetModel}`;
    setIsCalculating(true);
    try {
      const res = await fetch(`/api/local-ai/recommend-settings?provider=${provider}&model=${encodeURIComponent(targetModel)}&port=${targetPort}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.recommendations) {
          setRecommendation({
            ...data.modelDetails,
            recommendations: data.recommendations
          });

          if (autoApply && onChangeSettingsRef.current) {
            onChangeSettingsRef.current({
              contextLength: data.recommendations.contextLength,
              gpuOffload: data.recommendations.gpuOffload,
              cpuThreads: data.recommendations.cpuThreads,
              temperature: data.recommendations.temperature,
              maxTokens: data.recommendations.maxTokens
            });
          }
        }
      }
    } catch (err) {
      console.error('[LocalAI] Error calculating recommendations:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [currentModel, provider, targetPort]);

  // Auto-calculate on model switch only when model or provider actually changes
  useEffect(() => {
    if (currentModel && lastCalculatedModelRef.current !== `${provider}:${currentModel}`) {
      calculateOptimalSettings(currentModel, true);
    }
  }, [currentModel, provider, calculateOptimalSettings]);

  const checkStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setStatus(prev => (prev === 'starting' || prev === 'stopping' ? prev : 'checking'));
    try {
      const res = await fetch(`/api/local-ai/status?type=${provider}&port=${targetPort}`);
      const data = await res.json();

      if (data.running) {
        setStatus('online');
        setErrorMessage(null);
        if (Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
        }
      } else {
        setStatus('offline');
        setModels([]);
      }
    } catch (err: any) {
      setStatus('offline');
      setModels([]);
    }
  }, [provider, targetPort]);

  // Initial and regular polling
  useEffect(() => {
    checkStatus();
    fetchHwSpecs();
    pollingRef.current = setInterval(() => {
      checkStatus(true);
    }, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (fastPollingRef.current) clearInterval(fastPollingRef.current);
    };
  }, [checkStatus, fetchHwSpecs]);

  // Handle Start Server
  const handleStartServer = async () => {
    setStatus('starting');
    setActionMessage(`Opening terminal & starting ${isOllama ? 'Ollama' : 'LM Studio'} on port ${targetPort}...`);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/local-ai/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: provider, port: targetPort })
      });
      const data = await res.json();

      if (data.success) {
        setActionMessage('Command dispatched! Waiting for local server to initialize...');
        let attempts = 0;
        if (fastPollingRef.current) clearInterval(fastPollingRef.current);

        fastPollingRef.current = setInterval(async () => {
          attempts++;
          try {
            const probeRes = await fetch(`/api/local-ai/status?type=${provider}&port=${targetPort}`);
            const probeData = await probeRes.json();
            if (probeData.running) {
              setStatus('online');
              if (Array.isArray(probeData.models)) setModels(probeData.models);
              setActionMessage(`Server is now online on port ${targetPort}!`);
              if (fastPollingRef.current) clearInterval(fastPollingRef.current);
              setTimeout(() => setActionMessage(null), 4000);
            } else if (attempts >= 15) {
              if (fastPollingRef.current) clearInterval(fastPollingRef.current);
              setStatus('offline');
              setActionMessage(null);
              setErrorMessage('Server took longer than expected to report online. Please check the opened CMD terminal window.');
            }
          } catch (e) {
            if (attempts >= 15 && fastPollingRef.current) {
              clearInterval(fastPollingRef.current);
              setStatus('offline');
            }
          }
        }, 1200);
      } else {
        setStatus('offline');
        setErrorMessage(data.error || 'Failed to dispatch start command');
      }
    } catch (err: any) {
      setStatus('offline');
      setErrorMessage(err.message || 'Network error while calling start API');
    }
  };

  // Handle Stop Server
  const handleStopServer = async () => {
    setStatus('stopping');
    setActionMessage(`Stopping ${isOllama ? 'Ollama' : 'LM Studio'} server...`);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/local-ai/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: provider, port: targetPort })
      });
      const data = await res.json();

      if (data.success) {
        setTimeout(async () => {
          await checkStatus();
          setActionMessage('Server stopped.');
          setTimeout(() => setActionMessage(null), 3000);
        }, 1500);
      } else {
        setErrorMessage(data.error || 'Failed to stop server');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error stopping server');
      checkStatus();
    }
  };

  // Explicit Load Model with Hardware Offload & Context Length
  // Explicit Load Model with Hardware Offload & Context Length
  const handleLoadModel = async () => {
    if (!currentModel) {
      setErrorMessage('Please select a model identifier first.');
      return;
    }
    setIsLoadingModel(true);
    setLoadResult(null);
    setActionMessage(`Applying hardware offload & loading "${currentModel}" into ${isOllama ? 'Ollama' : 'LM Studio'}...`);

    try {
      const res = await fetch('/api/local-ai/load-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: currentModel,
          contextLength,
          gpuOffload,
          cpuThreads,
          temperature,
          port: targetPort,
          ttl: 3600
        })
      });
      const data = await res.json();
      if (data.success) {
        setLoadResult({ ok: true, message: data.message || `Model loaded successfully in ${isOllama ? 'Ollama' : 'LM Studio'}!` });
        setActionMessage(null);
      } else {
        setLoadResult({ ok: false, message: data.error || `Failed to load model in ${isOllama ? 'Ollama' : 'LM Studio'}.` });
        setActionMessage(null);
      }
    } catch (err: any) {
      setLoadResult({ ok: false, message: err.message || 'Network error loading model.' });
      setActionMessage(null);
    } finally {
      setIsLoadingModel(false);
    }
  };

  // Unload All Models to free VRAM
  const handleUnloadAll = async () => {
    try {
      setActionMessage(`Freeing VRAM and unloading models from ${isOllama ? 'Ollama' : 'LM Studio'}...`);
      const res = await fetch('/api/local-ai/unload-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model: currentModel })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || 'VRAM freed successfully!');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage('Failed to unload models');
    }
  };

  const contextPresets = [2048, 4096, 8192, 16384, 32768, 65536];

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-3.5">
      {/* Header & Live LED Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Server Name + LED Indicator */}
        <div className="flex items-center space-x-3">
          {/* LED Bulb */}
          <div className="flex items-center justify-center">
            {status === 'online' && (
              <div className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_12px_#10b981]"></span>
              </div>
            )}
            {status === 'starting' && (
              <div className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 shadow-[0_0_12px_#f59e0b]"></span>
              </div>
            )}
            {status === 'stopping' && (
              <div className="h-3.5 w-3.5 rounded-full bg-rose-500/50 animate-pulse shadow-[0_0_8px_#f43f5e]"></div>
            )}
            {(status === 'offline' || status === 'checking') && (
              <div className="h-3.5 w-3.5 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-600"></div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-200">{title}</span>
              {status === 'online' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ONLINE (Port :{targetPort})
                </span>
              )}
              {status === 'starting' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  STARTING IN CMD...
                </span>
              )}
              {status === 'stopping' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  STOPPING...
                </span>
              )}
              {status === 'offline' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  OFFLINE / STOPPED
                </span>
              )}
              {status === 'checking' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  CHECKING...
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono truncate">
              CMD: {cmdHint}
            </span>
          </div>
        </div>

        {/* Right: Start / Stop / Refresh Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {status !== 'online' ? (
            <button
              type="button"
              disabled={status === 'starting'}
              onClick={handleStartServer}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer ${
                status === 'starting'
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 active:scale-95'
              }`}
            >
              {status === 'starting' ? (
                <>
                  <i className="fas fa-spinner fa-spin text-xs"></i>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-play text-[10px]"></i>
                  <span>Start Server</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={status === 'stopping'}
              onClick={handleStopServer}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer ${
                status === 'stopping'
                  ? 'bg-rose-900/50 text-rose-300 cursor-not-allowed'
                  : 'bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 active:scale-95'
              }`}
            >
              {status === 'stopping' ? (
                <>
                  <i className="fas fa-spinner fa-spin text-xs"></i>
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-stop text-[10px]"></i>
                  <span>Stop Server</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            title="Check server status"
            onClick={() => checkStatus(false)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
          >
            <i className={`fas fa-rotate-right ${status === 'checking' ? 'fa-spin text-indigo-400' : ''}`}></i>
          </button>

          <button
            type="button"
            title="Toggle CLI Commands Guide"
            onClick={() => setShowCliHelp(!showCliHelp)}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
              showCliHelp
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
          >
            <i className="fas fa-terminal"></i>
          </button>
        </div>
      </div>

      {/* Hardware Specs Badge */}
      {hwSpecs && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-lg px-2.5 py-1.5 font-mono">
          <div className="flex items-center space-x-1">
            <i className="fas fa-microchip text-indigo-400"></i>
            <span>CPU: {hwSpecs.cpu.threads} Threads</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1">
            <i className="fas fa-memory text-purple-400"></i>
            <span>RAM: {hwSpecs.ram.totalGb} GB</span>
          </div>
          {hwSpecs.gpu.hasGpu && (
            <>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1 text-emerald-400">
                <i className="fas fa-bolt"></i>
                <span>GPU: {hwSpecs.gpu.name} ({(hwSpecs.gpu.totalVramMb / 1024).toFixed(1)} GB VRAM)</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Dynamic Status / Action Toast */}
      {actionMessage && (
        <div className="px-2.5 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-[11px] text-indigo-300 flex items-center space-x-2">
          <i className="fas fa-info-circle text-indigo-400 text-xs shrink-0"></i>
          <span className="truncate">{actionMessage}</span>
        </div>
      )}

      {/* Load Result Alert */}
      {loadResult && (
        <div
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center space-x-2 ${
            loadResult.ok
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
          }`}
        >
          <i className={`fas ${loadResult.ok ? 'fa-check-circle text-emerald-400' : 'fa-triangle-exclamation text-rose-400'} text-xs shrink-0`}></i>
          <span className="truncate">{loadResult.message}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="px-2.5 py-1.5 rounded-lg bg-rose-950/50 border border-rose-500/30 text-[11px] text-rose-300 flex items-center space-x-2">
          <i className="fas fa-triangle-exclamation text-rose-400 text-xs shrink-0"></i>
          <span className="truncate">{errorMessage}</span>
        </div>
      )}

      {/* CLI Commands Reference Sheet */}
      {showCliHelp && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <i className="fas fa-terminal text-indigo-400 text-[11px]"></i>
              <span>{isOllama ? 'Ollama CLI Server Commands' : 'LM Studio (lms) CLI Commands'}</span>
            </span>
            <span className="text-[10px] text-slate-500">Click any command to copy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            {isOllama ? (
              <>
                <div
                  onClick={() => copyToClipboard('set OLLAMA_ORIGINS=* && ollama serve')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Start Server (with CORS):</span>
                    <span className="text-emerald-400">set OLLAMA_ORIGINS=* && ollama serve</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'set OLLAMA_ORIGINS=* && ollama serve' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard(`ollama run ${currentModel || 'model'}`)}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Run / Chat via CLI:</span>
                    <span className="text-amber-300">ollama run {currentModel || 'model'}</span>
                  </div>
                  <i className={`fas ${copiedCmd?.includes('ollama run') ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard('ollama ps')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Check Running Models & VRAM:</span>
                    <span className="text-sky-300">ollama ps</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'ollama ps' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard(`ollama stop ${currentModel || 'model'}`)}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Unload Model from Memory:</span>
                    <span className="text-rose-400">ollama stop {currentModel || 'model'}</span>
                  </div>
                  <i className={`fas ${copiedCmd?.includes('ollama stop') ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>
              </>
            ) : (
              <>
                <div
                  onClick={() => copyToClipboard('lms server start --cors')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Start Server with CORS:</span>
                    <span className="text-emerald-400">lms server start --cors</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'lms server start --cors' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard(`lms load "${currentModel || 'model'}" --gpu max -c ${contextLength}`)}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Load Model with Custom VRAM/Context:</span>
                    <span className="text-amber-300">lms load "{currentModel || 'model'}" --gpu max -c {contextLength}</span>
                  </div>
                  <i className={`fas ${copiedCmd?.includes('lms load') ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard('lms unload --all')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Unload All from VRAM:</span>
                    <span className="text-rose-400">lms unload --all</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'lms unload --all' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Discovered Models List Pills */}
      {status === 'online' && models.length > 0 && (
        <div className="pt-1 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-semibold flex items-center space-x-1">
              <i className="fas fa-layer-group text-indigo-400 text-[10px]"></i>
              <span>Available Local Models ({models.length}):</span>
            </span>
            <span className="text-[10px] text-indigo-400 font-medium">Click to select & auto-calibrate</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                if (onSelectModel) onSelectModel('auto');
              }}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border flex items-center space-x-1.5 ${
                currentModel === 'auto' || currentModel === 'auto-adaptive'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white border-purple-300 shadow-md ring-1 ring-purple-400'
                  : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border-purple-700/60 hover:border-purple-500'
              }`}
            >
              <i className="fas fa-wand-magic-sparkles text-[9px] text-amber-300 animate-pulse"></i>
              <span>✨ Auto-Adaptive Mode</span>
            </button>

            {models.map((m, idx) => {
              const isSelected = currentModel === m;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (onSelectModel) onSelectModel(m);
                    calculateOptimalSettings(m, true);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <i className="fas fa-cube text-[9px] opacity-70"></i>
                  <span>{m}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-Adaptive Mode Active Banner */}
      {(currentModel === 'auto' || currentModel === 'auto-adaptive') && (
        <div className="p-3 bg-gradient-to-r from-purple-950/40 via-indigo-950/50 to-slate-900/60 border border-purple-500/40 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-purple-200 flex items-center space-x-1.5">
                <i className="fas fa-wand-magic-sparkles text-amber-300"></i>
                <span className="font-mono text-purple-300">Auto-Adaptive Multi-Model Router</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 font-mono text-[10px] border border-purple-700/60">
                ACTIVE
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center space-x-1">
              <i className="fas fa-check-double text-[9px]"></i>
              <span>Dual Relevancy Guard ON</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            The studio dynamically analyzes each user prompt and attaches a lightweight model (<span className="text-amber-300 font-mono font-semibold">Tier 1</span>) for fast telemetry lookups, or automatically switches to deep reasoning (<span className="text-indigo-300 font-mono font-semibold">Tier 2/3</span>) for root cause analysis & visual blueprints.
          </p>
        </div>
      )}

      {/* Dynamic Model Calibration & Recommendation Card */}
      {currentModel && currentModel !== 'auto' && currentModel !== 'auto-adaptive' && recommendation && (
        <div className="p-3 bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-900/60 border border-indigo-500/30 rounded-xl space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-100 flex items-center space-x-1.5">
                <i className="fas fa-microchip text-indigo-400"></i>
                <span className="font-mono text-indigo-300">{currentModel}</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                {recommendation.parameterSize} • {recommendation.sizeGb} GB • {recommendation.quantization}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
                  recommendation.recommendations.fitAssessment.includes('100% Full GPU')
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                    : recommendation.recommendations.fitAssessment.includes('Hybrid')
                    ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                    : 'bg-sky-950/70 border-sky-500/40 text-sky-300'
                }`}
              >
                <i className={`fas ${recommendation.recommendations.fitAssessment.includes('Full GPU') ? 'fa-bolt text-emerald-400' : 'fa-sliders text-amber-400'} text-[9px]`}></i>
                <span>{recommendation.recommendations.fitAssessment}</span>
              </span>

              <button
                type="button"
                title="Recalculate and auto-tune optimal settings for this model"
                onClick={() => calculateOptimalSettings(currentModel, true)}
                disabled={isCalculating}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white border border-indigo-400/50 text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 shadow-sm"
              >
                <i className={`fas fa-calculator ${isCalculating ? 'fa-spin text-amber-300' : 'text-indigo-200'} text-[10px]`}></i>
                <span>{isCalculating ? 'Calculating...' : 'Recalculate Profile'}</span>
              </button>
            </div>
          </div>

          {/* Capabilities & Diagnostics */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className={`px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1 ${
                recommendation.supportsTools
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700'
              }`}
            >
              <i className={`fas ${recommendation.supportsTools ? 'fa-wrench text-emerald-400' : 'fa-comment-dots text-slate-400'} text-[9px]`}></i>
              <span>{recommendation.supportsTools ? 'Native Tool Calling' : 'Direct Prompt Mode'}</span>
            </span>

            <span
              className={`px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1 ${
                recommendation.supportsVision
                  ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700'
              }`}
            >
              <i className={`fas ${recommendation.supportsVision ? 'fa-eye text-purple-400' : 'fa-font text-slate-400'} text-[9px]`}></i>
              <span>{recommendation.supportsVision ? 'Vision Ready' : 'Text Only'}</span>
            </span>

            <span className="text-slate-400 text-[10px] italic">
              Auto-Applied: Context {contextLength} • GPU {typeof gpuOffload === 'number' ? `${gpuOffload} Layers` : gpuOffload === 'max' ? 'Full GPU' : gpuOffload} • Threads {cpuThreads}
            </span>
          </div>

          {/* Recommendation Explanation */}
          <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
            <i className="fas fa-lightbulb text-amber-400 mr-1.5"></i>
            {recommendation.recommendations.explanation}
          </p>
        </div>
      )}

      {/* Hardware & Inference Offload Controls Section */}
      <div className="border-t border-slate-800/80 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <i className={`fas fa-chevron-${showAdvanced ? 'down' : 'right'} text-[10px] text-indigo-400`}></i>
            <i className="fas fa-sliders text-indigo-400 text-xs"></i>
            <span>{isOllama ? 'Ollama Hardware & Context Configuration' : 'LM Studio Hardware Offload & Context'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              title={`Unload all models to free VRAM/RAM in ${isOllama ? 'Ollama' : 'LM Studio'}`}
              onClick={handleUnloadAll}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-[10px] font-mono font-semibold transition-all cursor-pointer"
            >
              <i className="fas fa-trash-can mr-1"></i>
              Free VRAM
            </button>

            <button
              type="button"
              disabled={isLoadingModel || !currentModel}
              onClick={handleLoadModel}
              className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-sm ${
                isLoadingModel
                  ? 'bg-indigo-800 text-indigo-200 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
              }`}
            >
              {isLoadingModel ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-bolt"></i>
                  <span>Apply & Load in {isOllama ? 'Ollama' : 'LM Studio'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 text-xs">
            {/* 1. Context Length */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center space-x-1">
                  <i className="fas fa-brain text-indigo-400 text-[11px]"></i>
                  <span>Context Length (Tokens):</span>
                </span>
                <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                  {contextLength.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="2048"
                max="65536"
                step="2048"
                value={contextLength}
                onChange={(e) => onChangeSettings && onChangeSettings({ contextLength: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {contextPresets.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChangeSettings && onChangeSettings({ contextLength: p })}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer border ${
                      contextLength === p
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {p >= 1024 ? `${p / 1024}K` : p}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. GPU Offload Mode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center space-x-1">
                  <i className="fas fa-microchip text-emerald-400 text-[11px]"></i>
                  <span>GPU Offload Mode:</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 uppercase">
                  {String(gpuOffload)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Full GPU', val: 'max', desc: '100% VRAM' },
                  { label: '50% Hybrid', val: '0.5', desc: 'VRAM+RAM' },
                  { label: 'CPU Only', val: 'off', desc: '0% GPU' }
                ].map((mode) => (
                  <button
                    key={mode.val}
                    type="button"
                    onClick={() => onChangeSettings && onChangeSettings({ gpuOffload: mode.val })}
                    className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      String(gpuOffload) === mode.val
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{mode.label}</div>
                    <div className="text-[9px] text-slate-500">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. CPU Thread Pool */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center space-x-1">
                  <i className="fas fa-layer-group text-sky-400 text-[11px]"></i>
                  <span>CPU Thread Pool Size:</span>
                </span>
                <span className="font-mono text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                  {cpuThreads} Threads
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={hwSpecs?.cpu.threads || 16}
                step="1"
                value={cpuThreads}
                onChange={(e) => onChangeSettings && onChangeSettings({ cpuThreads: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>1 Thread</span>
                <span>Recommended: {Math.max(2, Math.floor((hwSpecs?.cpu.threads || 8) * 0.75))} Threads</span>
                <span>Max: {hwSpecs?.cpu.threads || 16}</span>
              </div>
            </div>

            {/* 4. Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center space-x-1">
                  <i className="fas fa-fire text-amber-400 text-[11px]"></i>
                  <span>Temperature (Sampling):</span>
                </span>
                <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={temperature}
                onChange={(e) => onChangeSettings && onChangeSettings({ temperature: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  { label: '0.10 Precise', val: 0.1 },
                  { label: '0.30 SCADA', val: 0.3 },
                  { label: '0.70 Balanced', val: 0.7 },
                  { label: '0.90 Creative', val: 0.9 }
                ].map(t => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => onChangeSettings && onChangeSettings({ temperature: t.val })}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer border ${
                      Math.abs(temperature - t.val) < 0.02
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
