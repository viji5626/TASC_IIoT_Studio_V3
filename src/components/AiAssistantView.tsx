import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, ActiveAlarm, ProductEdition } from '../types';
import { saveApiKey, loadApiKey, deleteApiKey } from '../utils/aiKeyVault';
import { createGeminiAdapter } from '../utils/aiProviders/googleGemini';
import { createOpenAiAdapter } from '../utils/aiProviders/openai';
import { createGroqAdapter } from '../utils/aiProviders/groq';
import { createOllamaAdapter } from '../utils/aiProviders/ollama';
import { createLmStudioAdapter } from '../utils/aiProviders/lmstudio';
import { createCustomAdapter } from '../utils/aiProviders/customEndpoint';
import { AiProviderAdapter } from '../utils/aiProviders/types';
import { setAiToolsContext } from '../utils/aiTools';
import { chatSession, clearChatSession, runAiTurn } from '../utils/aiOrchestrator';
import { getCommunityAiQuotaStatus, recordCommunityPromptUsed, COMMUNITY_AI_QUOTA_EVENT, CommunityAiQuotaStatus } from '../utils/aiQuotaManager';
import { AiChatPanel } from './AiChatPanel';
import { PasteApiSnippet } from './PasteApiSnippet';
import { ParsedSnippet } from '../utils/aiSnippetParser';
import { LocalAiServerControl } from './LocalAiServerControl';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';

interface Props {
  onBack?: () => void;
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
  appState: AppState;
  activeAlarms: ActiveAlarm[];
  initialTab?: 'chat' | 'settings';
  isDrawer?: boolean;
  onClose?: () => void;
  onOpenFullAssistant?: () => void;
}

export type AiProviderType = 'google_gemini' | 'openai' | 'groq' | 'ollama' | 'lmstudio' | 'custom';

interface ProviderConfig {
  model: string;
  baseUrl: string;
  temperature: number;
  extraBodyJson: string;
}

const DEFAULT_PROVIDER_CONFIGS: Record<AiProviderType, ProviderConfig> = {
  google_gemini: {
    model: 'gemini-2.0-flash',
    baseUrl: '',
    temperature: 0.3,
    extraBodyJson: ''
  },
  openai: {
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.3,
    extraBodyJson: ''
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    temperature: 0.3,
    extraBodyJson: ''
  },
  ollama: {
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
    temperature: 0.3,
    extraBodyJson: ''
  },
  lmstudio: {
    model: 'local-model',
    baseUrl: 'http://localhost:1234',
    temperature: 0.3,
    extraBodyJson: ''
  },
  custom: {
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    temperature: 0.1,
    extraBodyJson: '{"chat_template_kwargs":{"enable_thinking":true},"reasoning_budget":16384}'
  }
};

function getProviderConfig(p: AiProviderType): ProviderConfig {
  const saved = localStorage.getItem(`tasc_ai_config_${p}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_PROVIDER_CONFIGS[p],
        ...parsed
      };
    } catch {}
  }
  return DEFAULT_PROVIDER_CONFIGS[p];
}

function saveProviderConfig(p: AiProviderType, config: ProviderConfig): void {
  localStorage.setItem(`tasc_ai_config_${p}`, JSON.stringify(config));
}

export const AiAssistantView: React.FC<Props> = ({
  onBack,
  latestValues,
  appState,
  activeAlarms,
  initialTab = 'chat',
  isDrawer = false,
  onClose,
  onOpenFullAssistant
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>(initialTab);

  // Settings State - loaded per provider
  const [provider, setProvider] = useState<AiProviderType>(() => {
    return (localStorage.getItem('tasc_ai_provider') as AiProviderType) || 'google_gemini';
  });

  const initialConfig = getProviderConfig((localStorage.getItem('tasc_ai_provider') as AiProviderType) || 'google_gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(initialConfig.model);
  const [baseUrl, setBaseUrl] = useState<string>(initialConfig.baseUrl);
  const [temperature, setTemperature] = useState<number>(initialConfig.temperature);
  const [extraBodyJson, setExtraBodyJson] = useState<string>(initialConfig.extraBodyJson);

  // Vision capability detection: auto-identify if current model can understand images
  const supportsVision = React.useMemo(() => {
    const modelLower = (model || '').toLowerCase();
    const providerLower = provider;
    const visionPatterns = [
      'gemini',
      'gpt-4o',
      'gpt-4-vision',
      'claude-3',
      'claude-4',
      'llava',
      'pixtral',
      'vision',
      'llama-3.2-11b-vision',
      'llama-3.2-90b-vision'
    ];
    if (providerLower === 'google_gemini') return true;
    return visionPatterns.some(pattern => modelLower.includes(pattern));
  }, [model, provider]);

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isKeySaved, setIsKeySaved] = useState(false);

  // Chat Execution State
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [sessionRevision, setSessionRevision] = useState(0);
  const [isAiTourOpen, setIsAiTourOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isTourSuppressed('ai_assistant')) {
      setIsAiTourOpen(true);
    }
  }, []);

  // Always keep tools context updated with live telemetry
  useEffect(() => {
    setAiToolsContext({ latestValues, appState, activeAlarms });
  }, [latestValues, appState, activeAlarms]);

  // Load API key from encrypted vault whenever provider changes
  useEffect(() => {
    let isMounted = true;
    loadApiKey(provider).then(savedKey => {
      if (!isMounted) return;
      if (savedKey) {
        setApiKey(savedKey);
        setIsKeySaved(true);
      } else {
        setApiKey('');
        setIsKeySaved(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [provider]);

  // Switch Provider Tab without losing previous settings
  const handleSelectProvider = (newProvider: AiProviderType) => {
    // 1. Auto-save current provider state before switching
    saveProviderConfig(provider, {
      model,
      baseUrl,
      temperature,
      extraBodyJson
    });

    // 2. Set new provider
    setProvider(newProvider);
    localStorage.setItem('tasc_ai_provider', newProvider);

    // 3. Restore newly selected provider's profile
    const cfg = getProviderConfig(newProvider);
    setModel(cfg.model);
    setBaseUrl(cfg.baseUrl);
    setTemperature(cfg.temperature);
    setExtraBodyJson(cfg.extraBodyJson);
    setTestResult(null);
  };

  // Create Provider Adapter Instance
  const getAdapter = useCallback((): AiProviderAdapter => {
    switch (provider) {
      case 'google_gemini':
        return createGeminiAdapter(apiKey, model || 'gemini-2.0-flash');
      case 'groq':
        return createGroqAdapter(apiKey, model || 'llama-3.3-70b-versatile');
      case 'ollama':
        return createOllamaAdapter(baseUrl || 'http://localhost:11434', model || 'llama3.2');
      case 'lmstudio':
        return createLmStudioAdapter(baseUrl || 'http://localhost:1234', model || 'local-model');
      case 'custom':
        return createCustomAdapter({
          baseUrl,
          apiKey,
          model: model || 'default',
          temperature,
          extraBodyJson
        });
      case 'openai':
      default: {
        let parsedExtraBody: Record<string, unknown> | undefined = undefined;
        if (extraBodyJson) {
          try {
            parsedExtraBody = JSON.parse(extraBodyJson);
          } catch {}
        }
        return createOpenAiAdapter({
          id: 'openai',
          label: baseUrl.includes('nvidia') ? 'NVIDIA NIM' : 'OpenAI Compatible',
          baseUrl: baseUrl || 'https://api.openai.com/v1',
          apiKey,
          model: model || 'gpt-4o-mini',
          temperature,
          extraBody: parsedExtraBody
        });
      }
    }
  }, [provider, apiKey, model, baseUrl, temperature, extraBodyJson]);

  // Fetch Available Models when provider or key changes
  useEffect(() => {
    const adapter = getAdapter();
    if (adapter.listModels) {
      adapter.listModels().then(models => {
        if (models && models.length > 0) {
          setAvailableModels(models);
        }
      }).catch(() => {});
    }
  }, [getAdapter]);

  const handleSaveSettings = async () => {
    // 1. Save provider-specific config
    const currentConfig: ProviderConfig = {
      model,
      baseUrl,
      temperature,
      extraBodyJson
    };
    saveProviderConfig(provider, currentConfig);

    // 2. Save active provider selection
    localStorage.setItem('tasc_ai_provider', provider);

    // 3. Backward-compatible global keys
    localStorage.setItem('tasc_ai_model', model);
    localStorage.setItem('tasc_ai_base_url', baseUrl);
    localStorage.setItem('tasc_ai_temp', temperature.toString());
    localStorage.setItem('tasc_ai_extra_body', extraBodyJson);

    // 4. Save API Key securely
    if (apiKey) {
      await saveApiKey(provider, apiKey);
      setIsKeySaved(true);
    }

    const providerNames: Record<AiProviderType, string> = {
      google_gemini: 'Google Gemini',
      openai: 'OpenAI',
      groq: 'Groq Cloud',
      ollama: 'Ollama (Local)',
      lmstudio: 'LM Studio (Local)',
      custom: 'Custom Endpoint (NVIDIA NIM)'
    };
    const name = providerNames[provider] || provider;

    setTestResult({ ok: true, message: `Configuration for "${name}" saved successfully!` });
    setTimeout(() => setTestResult(null), 3500);
  };

  const handleDeleteKey = async () => {
    await deleteApiKey(provider);
    setApiKey('');
    setIsKeySaved(false);
    setTestResult({ ok: true, message: 'API Key deleted from secure vault.' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const adapter = getAdapter();
      if (adapter.testConnection) {
        const res = await adapter.testConnection();
        if (res.ok) {
          setTestResult({ ok: true, message: 'Connection successful! Provider is ready.' });
        } else {
          setTestResult({ ok: false, message: res.error || 'Connection failed.' });
        }
      } else {
        setTestResult({ ok: true, message: 'Provider configured.' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApplySnippet = (parsed: ParsedSnippet) => {
    let activeTargetProvider = provider;
    if (parsed.baseUrl && parsed.baseUrl.includes('nvidia') && provider !== 'custom' && provider !== 'openai') {
      activeTargetProvider = 'custom';
      setProvider('custom');
    }

    let targetBaseUrl = baseUrl;
    let targetModel = model;
    let targetTemp = temperature;
    let targetExtraBody = extraBodyJson;

    if (parsed.baseUrl) {
      setBaseUrl(parsed.baseUrl);
      targetBaseUrl = parsed.baseUrl;
    }
    if (parsed.model) {
      setModel(parsed.model);
      targetModel = parsed.model;
    }
    if (parsed.apiKey) {
      setApiKey(parsed.apiKey);
      saveApiKey(activeTargetProvider, parsed.apiKey);
      setIsKeySaved(true);
    }
    if (parsed.temperature !== undefined) {
      setTemperature(parsed.temperature);
      targetTemp = parsed.temperature;
    }
    if (parsed.extraBodyJson) {
      setExtraBodyJson(parsed.extraBodyJson);
      targetExtraBody = parsed.extraBodyJson;
    }

    // Auto-save parsed snippet into target provider configuration
    saveProviderConfig(activeTargetProvider, {
      baseUrl: targetBaseUrl,
      model: targetModel,
      temperature: targetTemp,
      extraBodyJson: targetExtraBody
    });

    const providerNames: Record<AiProviderType, string> = {
      google_gemini: 'Google Gemini',
      openai: 'OpenAI',
      groq: 'Groq Cloud',
      ollama: 'Ollama (Local)',
      lmstudio: 'LM Studio (Local)',
      custom: 'Custom Endpoint (NVIDIA NIM)'
    };
    const name = providerNames[activeTargetProvider] || activeTargetProvider;
    setTestResult({ ok: true, message: `Applied and saved configuration to ${name}!` });
    setTimeout(() => setTestResult(null), 3500);
  };

  // Edition Quota Tracking (Community Edition is limited to 5 prompts per 24-hour rolling window)
  const isCommunity = 
    appState.userRole === 'community' ||
    appState.productEdition === ProductEdition.COMMUNITY ||
    appState.packageOrigin === 'community';

  const [quotaStatus, setQuotaStatus] = useState<CommunityAiQuotaStatus>(() => getCommunityAiQuotaStatus());

  useEffect(() => {
    const updateQuota = () => setQuotaStatus(getCommunityAiQuotaStatus());
    window.addEventListener(COMMUNITY_AI_QUOTA_EVENT, updateQuota);
    window.addEventListener('storage', updateQuota);

    const interval = setInterval(updateQuota, quotaStatus.isLocked ? 1000 : 10000);
    return () => {
      window.removeEventListener(COMMUNITY_AI_QUOTA_EVENT, updateQuota);
      window.removeEventListener('storage', updateQuota);
      clearInterval(interval);
    };
  }, [quotaStatus.isLocked]);

  const handleSendMessage = async (text: string, images?: Array<{ dataUrl: string; mimeType: string; name?: string }>) => {
    if ((!text.trim() && (!images || images.length === 0)) || isLoading) return;

    // Interlock: enforce 5-prompt daily limit for Community Edition
    if (isCommunity) {
      const currentQuota = getCommunityAiQuotaStatus();
      if (currentQuota.isLocked) {
        setErrorMessage(
          `Community Edition is limited to 5 AI prompts per 24 hours. Your daily quota will reset in ${currentQuota.formattedTimeUntilReset}. Upgrade to Engineering Studio for unlimited AI copilot.`
        );
        return;
      }
      const recordResult = recordCommunityPromptUsed();
      setQuotaStatus(recordResult.status);
    }

    if (provider !== 'ollama' && provider !== 'lmstudio' && !apiKey) {
      setErrorMessage('Please configure and save your API Key in the Settings tab first.');
      setActiveTab('settings');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStreamingText('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const adapter = getAdapter();
      await runAiTurn(
        text,
        adapter,
        (deltaText) => {
          setStreamingText(deltaText);
        },
        (toolName) => {
          setActiveToolName(toolName);
        },
        controller.signal,
        images
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[AiAssistantView] Turn error:', err);
        setErrorMessage(err.message || 'An error occurred during AI processing.');
      }
    } finally {
      setIsLoading(false);
      setActiveToolName(null);
      setStreamingText('');
      setSessionRevision(r => r + 1);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setActiveToolName(null);
    setStreamingText('');
  };

  const handleClear = () => {
    clearChatSession();
    setErrorMessage(null);
    setStreamingText('');
    setSessionRevision(r => r + 1);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      {isDrawer ? (
        /* Sleek, Compact Floating Drawer Header */
        <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs shadow-md shrink-0">
              <i className="fas fa-wand-magic-sparkles"></i>
            </div>
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-xs font-bold text-white tracking-tight">AI Copilot</span>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono font-medium truncate">
                {provider === 'google_gemini' ? 'Gemini Flash' : provider}
              </span>
              {isCommunity && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                  quotaStatus.isLocked 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {quotaStatus.remainingCount}/5 Left
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={handleClear}
              title="Clear Conversation"
              className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
            >
              <i className="fas fa-trash-can"></i>
            </button>

            {onOpenFullAssistant && (
              <button
                type="button"
                onClick={onOpenFullAssistant}
                title="Open in Full AI Assistant Page"
                className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
              >
                <i className="fas fa-up-right-from-square"></i>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close Drawer"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
              >
                <i className="fas fa-xmark text-sm"></i>
              </button>
            )}
          </div>
        </header>
      ) : (
        /* Full Workstation View Header for Side Menu AI Assistant */
        <header data-tour="ai-header" className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer mr-0.5"
                title="Back to Dashboard"
              >
                <i className="fas fa-arrow-left text-base"></i>
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-base shadow-md shrink-0">
              <i className="fas fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h1 className="text-base font-bold text-white tracking-tight">Industrial AI Assistant</h1>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-mono font-medium">
                  {provider === 'google_gemini' ? 'Gemini 2.0 Flash' : provider}
                </span>
                
                {/* Community Quota Status Badge vs Engineering Badge */}
                {isCommunity ? (
                  quotaStatus.isLocked ? (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 animate-pulse shadow-sm">
                      <i className="fas fa-lock text-amber-400"></i>
                      <span>Quota Reached (5/5) • Resets in {quotaStatus.formattedTimeUntilReset}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 shadow-sm">
                      <i className="fas fa-bolt text-emerald-400"></i>
                      <span>Community Quota: <strong className="font-mono text-white">{quotaStatus.remainingCount}/5</strong> left today</span>
                    </span>
                  )
                ) : (
                  <span className="text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 shadow-sm">
                    <i className="fas fa-infinity text-sky-400"></i>
                    <span>Engineering • Unlimited AI</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">SCADA & IIoT real-time copilot</p>
            </div>
          </div>

          {/* Right Section: Clear Chat Button & Tab Switcher */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setIsAiTourOpen(true)}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
              title="Launch AI Copilot Guided Tour"
            >
              <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
              <span>Tour</span>
            </button>

            {activeTab === 'chat' && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear Conversation History"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-700/60 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <i className="fas fa-trash-can text-slate-400 text-xs"></i>
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}

            <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <i className="fas fa-comments"></i>
                <span>Chat Copilot</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <i className="fas fa-sliders"></i>
                <span>AI Settings & Providers</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {(isDrawer || activeTab === 'chat') ? (
          <AiChatPanel
            messages={chatSession}
            isLoading={isLoading}
            activeToolName={activeToolName}
            errorMessage={errorMessage}
            streamingText={streamingText}
            onSendMessage={handleSendMessage}
            onClearSession={handleClear}
            onCancelRequest={handleCancel}
            supportsVision={supportsVision}
            isCommunity={isCommunity}
            quotaStatus={quotaStatus}
          />
        ) : (
          /* Settings Tab */
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <i className="fas fa-microchip text-indigo-400"></i>
                    <span>LLM Provider & Model Selection</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect directly to cloud providers or local edge models. Keys are encrypted client-side using WebCrypto AES-GCM.
                  </p>
                </div>
              </div>

              {/* Provider Radio Cards */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2">
                  Select Provider:
                </label>
                <div data-tour="ai-provider-tabs" className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'google_gemini', label: 'Google Gemini', desc: 'Flash 2.0 / Pro', icon: 'fa-google' },
                    { id: 'openai', label: 'OpenAI', desc: 'GPT-4o / Mini', icon: 'fa-cube' },
                    { id: 'groq', label: 'Groq Cloud', desc: 'Llama 3.3 Ultra Fast', icon: 'fa-bolt' },
                    { id: 'ollama', label: 'Ollama (Local)', desc: 'Edge localhost:11434', icon: 'fa-server' },
                    { id: 'lmstudio', label: 'LM Studio (Local)', desc: 'Edge localhost:1234', icon: 'fa-laptop-code' },
                    { id: 'custom', label: 'Custom Endpoint', desc: 'NVIDIA NIM / vLLM / etc.', icon: 'fa-network-wired' }
                  ].map((p) => {
                    const isSelected = provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProvider(p.id as AiProviderType)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <i className={`fas ${p.icon} ${isSelected ? 'text-indigo-400' : 'text-slate-400'} text-sm`}></i>
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{p.label}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Local AI Server Controller (Start/Stop Server with CMD & Live Status LED) */}
              {(provider === 'ollama' || provider === 'lmstudio') && (
                <LocalAiServerControl
                  provider={provider}
                  baseUrl={baseUrl}
                  currentModel={model}
                  onSelectModel={(selected) => setModel(selected)}
                />
              )}

              {/* Base URL (if custom or local) */}
              {(provider === 'custom' || provider === 'ollama' || provider === 'lmstudio' || provider === 'openai') && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                    API Base URL:
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* API Key Input */}
              {provider !== 'ollama' && provider !== 'lmstudio' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                      <i className="fas fa-key text-amber-400"></i>
                      <span>API Key ({provider.replace('_', ' ').toUpperCase()}):</span>
                    </label>
                    {isKeySaved && (
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <i className="fas fa-shield-halved"></i>
                        <span>Vault Encrypted</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={provider === 'google_gemini' ? 'AIzaSy...' : 'sk-...'}
                      className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    {isKeySaved && (
                      <button
                        type="button"
                        onClick={handleDeleteKey}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-medium rounded-xl transition-colors"
                      >
                        Delete Key
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Model Picker */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Model Identifier:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. gemini-2.0-flash, gpt-4o-mini"
                    className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {availableModels.length > 0 && (
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select from discovered...</option>
                      {availableModels.map((m, idx) => (
                        <option key={idx} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">Temperature (Creativity):</span>
                  <span className="font-mono text-indigo-400">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Extra Body / Payload Parameters for Custom or OpenAI Compatible models */}
              {(provider === 'custom' || provider === 'openai') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                      <i className="fas fa-sliders text-indigo-400"></i>
                      <span>Extra Body / Payload Parameters (JSON):</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                  </div>
                  <textarea
                    rows={2}
                    value={extraBodyJson}
                    onChange={(e) => setExtraBodyJson(e.target.value)}
                    placeholder='{"chat_template_kwargs": {"enable_thinking": true}, "reasoning_budget": 16384}'
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>
              )}

              {/* Paste & Parse Snippet for Custom or OpenAI Compatible Providers */}
              {(provider === 'custom' || provider === 'openai') && (
                <PasteApiSnippet onApply={handleApplySnippet} />
              )}

              {/* Action Buttons & Status Alert */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-2"
                >
                  {isTesting ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin text-indigo-400"></i>
                      <span>Testing Connection...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plug text-emerald-400"></i>
                      <span>Test Connection</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <i className="fas fa-floppy-disk"></i>
                  <span>
                    Save {
                      provider === 'custom'
                        ? 'NVIDIA NIM / Custom'
                        : provider === 'lmstudio'
                        ? 'LM Studio'
                        : provider === 'ollama'
                        ? 'Ollama'
                        : provider === 'openai'
                        ? 'OpenAI'
                        : provider === 'groq'
                        ? 'Groq'
                        : 'Gemini'
                    } Settings
                  </span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    testResult.ok
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border border-red-500/40 text-red-300'
                  }`}
                >
                  <i className={`fas ${testResult.ok ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-red-400'} mt-0.5 shrink-0`}></i>
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Guided Tour Screen Overlay */}
      <CoachMarkOverlay
        tourId="ai_assistant"
        isOpen={isAiTourOpen}
        onClose={() => setIsAiTourOpen(false)}
      />
    </div>
  );
};

export default AiAssistantView;
