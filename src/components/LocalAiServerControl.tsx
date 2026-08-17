import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LocalAiServerControlProps {
  provider: 'ollama' | 'lmstudio';
  baseUrl?: string;
  currentModel?: string;
  onSelectModel?: (model: string) => void;
}

export const LocalAiServerControl: React.FC<LocalAiServerControlProps> = ({
  provider,
  baseUrl,
  currentModel,
  onSelectModel
}) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'starting' | 'stopping'>('checking');
  const [models, setModels] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCliHelp, setShowCliHelp] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fastPollingRef = useRef<NodeJS.Timeout | null>(null);

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
    : `lms server start --cors=true --port ${targetPort}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

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
    pollingRef.current = setInterval(() => {
      checkStatus(true);
    }, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (fastPollingRef.current) clearInterval(fastPollingRef.current);
    };
  }, [checkStatus]);

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
        // Start fast polling every 1.2s for up to 15 attempts
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

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-3">
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

      {/* Dynamic Status / Action Toast */}
      {actionMessage && (
        <div className="px-2.5 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-[11px] text-indigo-300 flex items-center space-x-2">
          <i className="fas fa-info-circle text-indigo-400 text-xs shrink-0"></i>
          <span className="truncate">{actionMessage}</span>
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
                  onClick={() => copyToClipboard('ollama ps')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Check Running Models:</span>
                    <span className="text-sky-300">ollama ps</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'ollama ps' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard('ollama list')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">List Installed Models:</span>
                    <span className="text-purple-300">ollama list</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'ollama list' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard('taskkill /IM ollama.exe /F')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Stop Service Process:</span>
                    <span className="text-rose-400">taskkill /IM ollama.exe /F</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'taskkill /IM ollama.exe /F' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>
              </>
            ) : (
              <>
                <div
                  onClick={() => copyToClipboard('lms server start')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Start Server (Default Port 1234):</span>
                    <span className="text-emerald-400">lms server start</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'lms server start' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard('lms server stop')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Stop Server:</span>
                    <span className="text-rose-400">lms server stop</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'lms server stop' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard('lms server status')}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Check Server Status:</span>
                    <span className="text-sky-300">lms server status</span>
                  </div>
                  <i className={`fas ${copiedCmd === 'lms server status' ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
                </div>

                <div
                  onClick={() => copyToClipboard(`lms server start --cors=true --port ${targetPort}`)}
                  className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-slate-500 text-[9px] block">Start with Custom Port & CORS:</span>
                    <span className="text-amber-300">lms server start --port {targetPort}</span>
                  </div>
                  <i className={`fas ${copiedCmd === `lms server start --cors=true --port ${targetPort}` ? 'fa-check text-emerald-400' : 'fa-copy text-slate-500'} text-[10px] ml-2`}></i>
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
            <span className="text-slate-400 font-semibold">
              Available Local Models ({models.length}):
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Click to select model</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {models.map((m, idx) => {
              const isSelected = currentModel === m;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectModel && onSelectModel(m)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <i className="fas fa-cube text-[9px] mr-1 opacity-70"></i>
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
