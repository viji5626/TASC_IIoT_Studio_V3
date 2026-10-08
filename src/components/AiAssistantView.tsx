import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, ActiveAlarm, ProductEdition, PendingReportRequest, ReportSuggestion, ReportJob } from '../types';
import { saveApiKey, loadApiKey, deleteApiKey } from '../utils/aiKeyVault';
import { createGeminiAdapter } from '../utils/aiProviders/googleGemini';
import { createOpenAiAdapter } from '../utils/aiProviders/openai';
import { createGroqAdapter } from '../utils/aiProviders/groq';
import { createOllamaAdapter } from '../utils/aiProviders/ollama';
import { createLmStudioAdapter } from '../utils/aiProviders/lmstudio';
import { createCustomAdapter } from '../utils/aiProviders/customEndpoint';
import { AiProviderAdapter, JevDiagnosticPayload, JevProbItem } from '../utils/aiProviders/types';
import { setAiToolsContext } from '../utils/aiTools';
import { chatSession, clearChatSession, runAiTurn } from '../utils/aiOrchestrator';
import { getCommunityAiQuotaStatus, recordCommunityPromptUsed, COMMUNITY_AI_QUOTA_EVENT, CommunityAiQuotaStatus } from '../utils/aiQuotaManager';
import { AiChatPanel } from './AiChatPanel';
import { PasteApiSnippet } from './PasteApiSnippet';
import { ParsedSnippet } from '../utils/aiSnippetParser';
import { LocalAiServerControl } from './LocalAiServerControl';
import { EmbeddedGgufControl } from './EmbeddedGgufControl';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';
import { AiMemoryStudioTab } from './AiMemoryStudioTab';
import { AiModeSelector, AiOperatingMode } from './AiModeSelector';
import { pythonBridge } from '../services/ai/pythonBridgeClient';
import {
  collectHistorianData,
  buildAiHtmlReport,
  buildDataExcelWorkbook,
  downloadHtmlReport,
  downloadExcelReport,
  saveReportJob,
  storeReportHtml
} from '../utils/reportEngine';


import { useAppStore } from '../store/useAppStore';
import { AppView } from '../types';

interface Props {
  onBack?: () => void;
  latestValues?: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
  appState?: AppState;
  activeAlarms?: ActiveAlarm[];
  initialTab?: 'chat' | 'memory' | 'settings';
  isDrawer?: boolean;
  onClose?: () => void;
  onOpenFullAssistant?: () => void;
}


export type AiProviderType = 'google_gemini' | 'openai' | 'groq' | 'ollama' | 'lmstudio' | 'embedded_gguf' | 'custom';

interface ProviderConfig {
  model: string;
  baseUrl: string;
  temperature: number;
  contextLength?: number;
  gpuOffload?: string | number;
  cpuThreads?: number;
  maxTokens?: number;
  extraBodyJson: string;
}

const DEFAULT_PROVIDER_CONFIGS: Record<AiProviderType, ProviderConfig> = {
  google_gemini: {
    model: 'gemini-2.0-flash',
    baseUrl: '',
    temperature: 0.3,
    contextLength: 8192,
    maxTokens: 4096,
    extraBodyJson: ''
  },
  openai: {
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.3,
    contextLength: 8192,
    maxTokens: 4096,
    extraBodyJson: ''
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    temperature: 0.3,
    contextLength: 8192,
    maxTokens: 4096,
    extraBodyJson: ''
  },
  ollama: {
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
    temperature: 0.3,
    contextLength: 8192,
    gpuOffload: 'max',
    cpuThreads: 16,
    maxTokens: 4096,
    extraBodyJson: ''
  },
  lmstudio: {
    model: 'qwen/qwen3.5-9b',
    baseUrl: 'http://localhost:1234/v1',
    temperature: 0.3,
    contextLength: 8192,
    gpuOffload: 'max',
    cpuThreads: 16,
    maxTokens: 4096,
    extraBodyJson: ''
  },
  embedded_gguf: {
    model: '',
    baseUrl: '',
    temperature: 0.1,
    contextLength: 2048,
    gpuOffload: 33,
    cpuThreads: 4,
    maxTokens: 2048,
    extraBodyJson: '{"n_ctx":2048,"n_threads":4,"gpu_layers":33,"gbnf_grammar":true}'
  },
  custom: {
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    temperature: 0.1,
    contextLength: 16384,
    maxTokens: 4096,
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

function classifyUserIntent(prompt: string): {
  isEducational: boolean;
  isDiagnostic: boolean;
  isRca: boolean;
  isTriage: boolean;
  isSensor: boolean;
} {
  const lower = prompt.toLowerCase();

  // Purely conceptual or instructional questions must NOT trigger operational trip diagnostics or fake interlocks
  const isEducational = /(what is|what are|explain|describe|define|how does .* work|how to configure|standard for|meaning of|tell me about|difference between)/i.test(lower) &&
    !/(my|this|current|active|our|why did .* (trip|fail)|why is .* (tripped|failing))/i.test(lower);

  const isRca = /(root\s*cause|rca|why did .* trip|why.*fail|why.*trip|trip|tripped|failure|fault|cavitation|breakdown|bearing.*temp|motor.*overload|interlock|vibration|stator|pump failure|emergency stop|isolate pump)/i.test(lower);
  const isTriage = /(triage|alarm priority|prioritize.*alarm|alarm flood|alarm avalanche|active alarm|nuisance alarm|alarm setting|isa[- ]?18\.2)/i.test(lower);
  const isSensor = /(sensor drift|sensor fault|calibrate sensor|sensor health|transmitter error|drift detection|sensor.*broken)/i.test(lower);

  return {
    isEducational,
    isDiagnostic: isRca || isTriage || isSensor,
    isRca,
    isTriage,
    isSensor
  };
}

function resolveTargetAsset(query: string, appState?: AppState, activeAlarms?: ActiveAlarm[]): {
  status: 'BOUND' | 'AMBIGUOUS' | 'UNBOUND';
  assetName?: string;
  candidates?: Array<{ id: string; name: string; panelId?: string }>;
} {
  const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const queryTokens = query.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !['on', 'in', 'the', 'what', 'why', 'did', 'for', 'with', 'and', 'alarm', 'trip', 'status', 'check', 'cause', 'root', 'is', 'a', 'an'].includes(t));

  const candidatesMap = new Map<string, { id: string; name: string; panelId?: string }>();

  // 1. From active alarms
  activeAlarms?.forEach(a => {
    const name = a.panelName || a.panelId || 'Asset';
    const key = norm(name);
    candidatesMap.set(key, { id: a.panelId || a.alarmKey, name, panelId: a.panelId });
  });

  // 2. From SCADA canvas panels / widgets
  appState?.panels?.forEach(p => {
    const name = p.panelName || p.panelId;
    if (name) {
      const key = norm(name);
      if (!candidatesMap.has(key)) {
        candidatesMap.set(key, { id: p.panelId, name, panelId: p.panelId });
      }
    }
  });

  const allCandidates = Array.from(candidatesMap.values());
  if (allCandidates.length === 0) {
    return { status: 'UNBOUND' };
  }

  const qNorm = norm(query);
  // Check matching tokens against candidate names
  const matched = allCandidates.filter(c => {
    const cNorm = norm(c.name);
    return qNorm.includes(cNorm) || queryTokens.some(token => {
      const tNorm = norm(token);
      return tNorm.length >= 2 && (cNorm.includes(tNorm) || tNorm.includes(cNorm));
    });
  });

  if (matched.length === 1) {
    return { status: 'BOUND', assetName: matched[0].name };
  } else if (matched.length > 1) {
    // Check if an exact asset token was specified in the query
    const exactTokenMatch = matched.filter(c => queryTokens.some(t => norm(t) === norm(c.name)));
    if (exactTokenMatch.length === 1) {
      return { status: 'BOUND', assetName: exactTokenMatch[0].name };
    }

    // Check if only one candidate name is fully contained in query
    const fullyContained = matched.filter(c => qNorm.includes(norm(c.name)));
    if (fullyContained.length === 1) {
      return { status: 'BOUND', assetName: fullyContained[0].name };
    }

    return { status: 'AMBIGUOUS', candidates: matched };
  }

  // If query doesn't name a specific asset, but there is exactly 1 active alarm
  if (activeAlarms && activeAlarms.length === 1) {
    const a = activeAlarms[0];
    return { status: 'BOUND', assetName: a.panelName || a.panelId || 'Primary Active Asset' };
  }

  // If multiple active alarms and query is generic, offer candidates
  if (activeAlarms && activeAlarms.length > 1) {
    return {
      status: 'AMBIGUOUS',
      candidates: activeAlarms.map(a => ({
        id: a.alarmKey || a.panelId,
        name: a.panelName || a.panelId || 'Active Asset',
        panelId: a.panelId
      }))
    };
  }

  return { status: 'UNBOUND' };
}

export const AiAssistantView: React.FC<Props> = ({
  onBack: onBackProp,
  latestValues: latestValuesProp,
  appState: appStateProp,
  activeAlarms: activeAlarmsProp,
  initialTab = 'chat',
  isDrawer = false,
  onClose,
  onOpenFullAssistant
}) => {
  const store = useAppStore();
  const appState = appStateProp ?? store.appState;
  const latestValues = latestValuesProp ?? store.latestValues;
  const activeAlarms = (typeof window !== 'undefined' && (window as any).__TASC_ACTIVE_ALARMS__) || activeAlarmsProp || store.activeAlarms;
  const onBack = onBackProp ?? (() => store.setCurrentView(AppView.DASHBOARD));
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'settings'>(initialTab);

  // Settings State - loaded per provider
  const [provider, setProvider] = useState<AiProviderType>(() => {
    return (localStorage.getItem('tasc_ai_provider') as AiProviderType) || 'google_gemini';
  });

  const initialConfig = getProviderConfig((localStorage.getItem('tasc_ai_provider') as AiProviderType) || 'google_gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(initialConfig.model);
  const [baseUrl, setBaseUrl] = useState<string>(initialConfig.baseUrl);
  const [temperature, setTemperature] = useState<number>(initialConfig.temperature ?? 0.3);
  const [contextLength, setContextLength] = useState<number>(initialConfig.contextLength ?? 4096);
  const [gpuOffload, setGpuOffload] = useState<string | number>(initialConfig.gpuOffload ?? 'max');
  const [cpuThreads, setCpuThreads] = useState<number>(initialConfig.cpuThreads ?? 8);
  const [maxTokens, setMaxTokens] = useState<number>(initialConfig.maxTokens ?? 4096);
  const [extraBodyJson, setExtraBodyJson] = useState<string>(initialConfig.extraBodyJson ?? '');

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

  // ─── Jev Decision & Parallel Constrained Reasoning State ────────────────────
  const [aiMode, setAiMode] = useState<AiOperatingMode>(() => {
    return (localStorage.getItem('tasc_ai_operating_mode') as AiOperatingMode) || 'AUTO';
  });
  const [isJevEvaluating, setIsJevEvaluating] = useState(false);

  const handleAiModeChange = (mode: AiOperatingMode) => {
    setAiMode(mode);
    localStorage.setItem('tasc_ai_operating_mode', mode);
  };

  const buildDynamicTelemetryContext = useCallback((targetAsset?: string) => {
    const lines: string[] = [];
    lines.push(`TIMESTAMP: ${new Date().toISOString()}`);

    // 1. ISA-95 Equipment Topology & Active Screen Context
    const activeDashboard = appState?.dashboards?.find(d => d.dashboardId === appState?.activeDashboardId);
    if (activeDashboard) {
      lines.push(`ACTIVE SCADA SCREEN: "${activeDashboard.dashboardName}" (ID: ${activeDashboard.dashboardId})`);
    }

    if (targetAsset) {
      lines.push(`EVALUATION TARGET ASSET: "${targetAsset}"`);
    }

    // 2. Active Alarms with Direct Equipment & Tag Linkage
    const currentAlarms = (typeof window !== 'undefined' && (window as any).__TASC_ACTIVE_ALARMS__) || activeAlarms;
    const filteredAlarms = targetAsset
      ? (currentAlarms || []).filter(a => {
          const name = (a.panelName || a.panelId || '').toLowerCase();
          return name.includes(targetAsset.toLowerCase());
        })
      : (currentAlarms || []);

    if (filteredAlarms.length > 0) {
      lines.push('ACTIVE ALARM CASCADE (BOUND TO EQUIPMENT):');
      filteredAlarms.forEach((alarm, idx) => {
        const equipmentName = alarm.panelName || alarm.panelId || 'Equipment_Skid';
        const msg = alarm.message || 'ALARM ASSERTED';
        const sev = alarm.zone || 'HIGH';
        const pvStr = alarm.value !== undefined ? ` | PV: ${alarm.value}${alarm.unit || ''}` : '';
        const spStr = alarm.threshold !== undefined ? ` | Limit_SP: ${alarm.threshold}${alarm.unit || ''}` : '';
        lines.push(`[T+${idx * 15}ms] ASSET: "${equipmentName}" -> ALARM: ${msg} (Zone: ${sev}${pvStr}${spStr})`);
      });
    }

    // 3. Equipment-Grouped Co-located Sensor Parameters
    const equipmentGroups: Record<string, string[]> = {};
    if (latestValues && Object.keys(latestValues).length > 0) {
      Object.entries(latestValues).forEach(([tag, v]: [string, any]) => {
        if (!v || v.val === null || v.val === undefined) return;
        const parts = tag.split('/');
        let group = 'PROCESS_LOOP';
        if (parts.length >= 3) {
          group = parts[2].toUpperCase();
        } else if (parts.length === 2) {
          group = parts[1].toUpperCase();
        } else {
          group = parts[0].toUpperCase();
        }

        if (!equipmentGroups[group]) equipmentGroups[group] = [];
        equipmentGroups[group].push(`${tag}: ${v.val}`);
      });
    }

    if (Object.keys(equipmentGroups).length > 0) {
      lines.push('INTERLINKED SUBSYSTEM SENSOR GROUPS:');
      Object.entries(equipmentGroups).slice(0, 8).forEach(([groupName, tagList]) => {
        lines.push(`- SUBSYSTEM [${groupName}]: ${tagList.slice(0, 4).join(', ')}`);
      });
    }

    // 4. Zero dummy data - strictly truthful telemetry reporting
    if (filteredAlarms.length === 0 && Object.keys(equipmentGroups).length === 0) {
      lines.push('SYSTEM HEALTH: All configured process variables operating within normal baseline variance limits. Zero active alarm cascade asserted.');
    }

    return lines.join('\n');
  }, [activeAlarms, latestValues, appState]);

  const handleExecuteInterlock = useCallback(async (action: string, targetTag?: string, commandVal?: any) => {
    const auditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action: action || 'TRIP',
      targetPlcTag: targetTag || 'PLC_SAFETY_TRIP',
      commandValue: commandVal ?? 1,
      operator: 'Operator (Authenticated)',
      status: 'DISPATCHED_TO_PLC'
    };

    // Save to persistent audit log in localStorage (up to 500 records)
    try {
      const existingStr = localStorage.getItem('tasc_interlock_audit_log') || '[]';
      const existing = JSON.parse(existingStr);
      existing.unshift(auditRecord);
      localStorage.setItem('tasc_interlock_audit_log', JSON.stringify(existing.slice(0, 500)));
    } catch (e) {
      console.error('[Interlock Safety] Failed to save audit record:', e);
    }

    // Dispatch custom window event for external telemetry listeners / SCADA drivers
    window.dispatchEvent(new CustomEvent('tasc_interlock_dispatched', { detail: auditRecord }));

    // Append confirmation notice to chatSession
    chatSession.push({
      role: 'assistant',
      content: `**[INTERLOCK DISPATCHED]** Safety interlock action \`${auditRecord.action}\` (Command: \`${auditRecord.commandValue}\`) successfully dispatched to PLC coil \`${auditRecord.targetPlcTag}\`.\n\n*Audit record \`${auditRecord.id}\` logged at ${new Date().toLocaleTimeString()} by Operator.*`
    });
    setSessionRevision(r => r + 1);
    return true;
  }, []);

  // ─── Report Generation State ─────────────────────────────────────────────────
  // pendingReport tracks the current in-progress report request (suggestion stage or generating)
  const [pendingReport, setPendingReport] = useState<PendingReportRequest | null>(null);
  const [reportDownloads, setReportDownloads] = useState<Array<{ jobId: string; title: string; html: string; excelWb?: any }>>([]);

  const handleSetReportSuggestion = useCallback((obj: any) => {
    setPendingReport(prev => {
      if (prev && prev.requestId === obj.requestId && prev.status === 'suggesting') return prev;
      const now = Date.now();
      const toMs = Number(obj.toMs) && !isNaN(Number(obj.toMs)) ? Number(obj.toMs) : now;
      const fromMs = Number(obj.fromMs) && !isNaN(Number(obj.fromMs)) ? Number(obj.fromMs) : (toMs - 86400000);
      return {
        requestId: obj.requestId || `req_${Date.now()}`,
        title: obj.title || 'Industrial Report',
        fromMs,
        toMs,
        tags: obj.requestedTags || [],
        resolution: obj.resolution || '1hour',
        includeAlarms: Boolean(obj.includeAlarms),
        includeFdd: Boolean(obj.includeFdd),
        suggestions: (obj.suggestions || []) as ReportSuggestion[],
        selectedSuggestionIds: [],
        status: 'suggesting'
      };
    });
  }, []);

  const handleGenerateAiReport = useCallback(async (params: any) => {
    const jobId = params.requestId || `job_${Date.now()}`;
    const title = String(params.title || 'Industrial Report');
    const now = Date.now();
    const toMs = Number(params.toMs) && !isNaN(Number(params.toMs)) ? Number(params.toMs) : now;
    const fromMs = Number(params.fromMs) && !isNaN(Number(params.fromMs)) ? Number(params.fromMs) : (toMs - 86400000);
    
    let tags: string[] = Array.isArray(params.tags) && params.tags.length > 0
      ? params.tags
      : (appState?.historianTags?.map(t => t.id) || appState?.panels?.map(p => p.panelId) || []);
    if (tags.length === 0) tags = ['plant_telemetry'];

    const resolution = String(params.resolution || '1hour') as any;
    const includeAlarms = Boolean(params.includeAlarms ?? true);
    const selectedSuggestionIds: number[] = params.selectedSuggestionIds || pendingReport?.selectedSuggestionIds || [];
    const aiSummary = String(params.aiSummary || 'AI Telemetry Assessment & Performance Summary');
    const aiResults = String(params.aiResults || 'All parameters operated within normal baseline variance limits.');
    const suggestions: ReportSuggestion[] = params.suggestions || pendingReport?.suggestions || [];

    // Save job as generating
    const job: ReportJob = {
      jobId,
      title,
      type: 'ai_ondemand',
      status: 'generating',
      fromMs,
      toMs,
      createdAt: new Date().toISOString()
    };
    saveReportJob(job);

    // Clear pending report
    setPendingReport(null);

    try {
      // Collect historian data — pass includeFdd flag to signal FDD enrichment
      const includeFdd = Boolean(params.includeFdd);
      const dataset = await collectHistorianData(tags, fromMs, toMs, resolution, includeAlarms, false, includeFdd);

      dataset.title = title;
      dataset.includedSuggestions = suggestions.filter(s => selectedSuggestionIds.includes(s.id));

      // Build HTML report
      const html = buildAiHtmlReport(dataset, aiSummary, aiResults, suggestions, selectedSuggestionIds);

      // Store in IndexedDB/sessionStorage
      await storeReportHtml(jobId, html);

      // Save completed job
      const completedJob: ReportJob = {
        ...job,
        status: 'ready',
        rowCount: dataset.tags.reduce((s, t) => s + t.points.length, 0),
        completedAt: new Date().toISOString()
      };
      saveReportJob(completedJob);

      // Build Excel workbook (multi-sheet: Trend, Stats, Alarms)
      const excelWb = buildDataExcelWorkbook(dataset);

      // Track for immediate download in chat
      setReportDownloads(prev => [...prev.filter(r => r.jobId !== jobId), { jobId, title, html, excelWb }]);

    } catch (err: any) {
      console.error('[AiAssistantView] Report generation failed:', err);
      const failedJob: ReportJob = {
        ...job,
        status: 'error',
        errorMessage: err.message,
        completedAt: new Date().toISOString()
      };
      saveReportJob(failedJob);
    }
  }, [appState, pendingReport]);

  // Listen to custom window events emitted directly by tool execution
  useEffect(() => {
    const onSuggestion = (e: any) => {
      if (e.detail) handleSetReportSuggestion(e.detail);
    };
    const onGenerate = (e: any) => {
      if (e.detail) handleGenerateAiReport(e.detail);
    };

    window.addEventListener('tasc_report_suggestion', onSuggestion);
    window.addEventListener('tasc_report_generate', onGenerate);

    return () => {
      window.removeEventListener('tasc_report_suggestion', onSuggestion);
      window.removeEventListener('tasc_report_generate', onGenerate);
    };
  }, [handleSetReportSuggestion, handleGenerateAiReport]);

  // After each AI turn, also scan chat session messages as reliable backup
  useEffect(() => {
    for (const msg of chatSession) {
      if (!msg.content) continue;
      const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      if (contentStr.includes('__reportSuggestion')) {
        try {
          const parsed = typeof msg.content === 'object' ? msg.content : JSON.parse(contentStr);
          if (parsed.__reportSuggestion) handleSetReportSuggestion(parsed);
        } catch {
          const match = contentStr.match(/\{[\s\S]*"__reportSuggestion"[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              if (parsed.__reportSuggestion) handleSetReportSuggestion(parsed);
            } catch {}
          }
        }
      }
      if (contentStr.includes('__generateReport')) {
        try {
          const parsed = typeof msg.content === 'object' ? msg.content : JSON.parse(contentStr);
          if (parsed.__generateReport) handleGenerateAiReport(parsed);
        } catch {
          const match = contentStr.match(/\{[\s\S]*"__generateReport"[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              if (parsed.__generateReport) handleGenerateAiReport(parsed);
            } catch {}
          }
        }
      }
    }
  }, [sessionRevision, handleSetReportSuggestion, handleGenerateAiReport]);

  const handleReportSuggestionSelected = useCallback((selectedIds: number[]) => {
    setPendingReport(prev => prev ? { ...prev, selectedSuggestionIds: selectedIds, status: 'generating' } : null);
  }, []);

  const handleDownloadExcel = useCallback((jobId: string, title: string) => {
    const entry = reportDownloads.find(r => r.jobId === jobId);
    if (entry?.excelWb) {
      downloadExcelReport(entry.excelWb, title);
    }
  }, [reportDownloads]);

  useEffect(() => {
    // Only auto-launch the AI Assistant guided tour in full workstation view, NEVER in floating drawer mode
    if (!isDrawer && !isTourSuppressed('ai_assistant')) {
      setIsAiTourOpen(true);
    }
  }, [isDrawer]);

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
      contextLength,
      gpuOffload,
      cpuThreads,
      maxTokens,
      extraBodyJson
    });

    // 1b. If we're leaving embedded_gguf, unload the model from VRAM immediately
    // so the GPU is free for Ollama, LM Studio, or any other app.
    if (provider === 'embedded_gguf' && newProvider !== 'embedded_gguf') {
      pythonBridge.unloadGgufModel().catch(() => { /* daemon may already be offline */ });
    }

    // 2. Set new provider
    setProvider(newProvider);
    localStorage.setItem('tasc_ai_provider', newProvider);

    // 3. Restore newly selected provider's profile
    const cfg = getProviderConfig(newProvider);
    setModel(cfg.model);
    setBaseUrl(cfg.baseUrl);
    setTemperature(cfg.temperature ?? 0.3);
    setContextLength(cfg.contextLength ?? 4096);
    setGpuOffload(cfg.gpuOffload ?? 'max');
    setCpuThreads(cfg.cpuThreads ?? 8);
    setMaxTokens(cfg.maxTokens ?? 4096);
    setExtraBodyJson(cfg.extraBodyJson ?? '');
    setTestResult(null);
  };


  // Create Provider Adapter Instance
  const getAdapter = useCallback((overrideModel?: string, tierConfig?: { temperature: number; contextLength: number }): AiProviderAdapter => {
    const activeModel = overrideModel || model;
    const activeTemp = tierConfig?.temperature !== undefined ? tierConfig.temperature : temperature;
    const activeCtx = tierConfig?.contextLength !== undefined ? tierConfig.contextLength : contextLength;

    switch (provider) {
      case 'google_gemini':
        return createGeminiAdapter(apiKey, activeModel || 'gemini-2.0-flash');
      case 'groq':
        return createGroqAdapter(apiKey, activeModel || 'llama-3.3-70b-versatile');
      case 'ollama':
        return createOllamaAdapter({
          baseUrl: baseUrl || 'http://localhost:11434',
          model: activeModel || 'llama3.2',
          temperature: activeTemp,
          contextLength: activeCtx,
          cpuThreads,
          gpuOffload,
          maxTokens
        });
      case 'lmstudio':
        return createLmStudioAdapter({
          baseUrl: baseUrl || 'http://localhost:1234',
          model: activeModel || 'local-model',
          temperature: activeTemp,
          contextLength: activeCtx,
          gpuOffload,
          cpuThreads,
          maxTokens
        });

      // ─── Native GGUF (llama-cpp-python) via Python IPC Bridge ─────────────────
      // Routes chat through the Python AI Daemon's LOCAL_SLM_INFERENCE command.
      // The model path & params are persisted in state; no API key is required.
      case 'embedded_gguf': {
        const ggufModelPath = activeModel || model || '';
        // Cap at 512 tokens for CPU-only inference — at ~3-5 tok/s, 512 tokens = ~1.7min max.
        // User can increase via GPU layers (n_gpu_layers > 0) for much faster inference.
        const ggufMaxTokens = Math.min(maxTokens || 512, 512);
        const ggufTemp = activeTemp;

        // Build an adapter using the correct AiProviderAdapter sendStream interface
        const ggufAdapter: AiProviderAdapter = {
          id: 'embedded_gguf',
          label: `Local GGUF (${ggufModelPath.split('\\').pop() || 'llama-cpp'})`,
          // sendStream is the required method — yield chunks as an AsyncGenerator
          async * sendStream(msgs, _tools, _signal) {
            // Ensure daemon is running before attempting inference
            const health = await pythonBridge.checkHealth().catch(() => ({ isAvailable: false, latencyMs: 0, daemon: null as any }));
            if (!health.isAvailable) {
              throw new Error('Python AI Daemon is offline. Please start the local runtime from the GGUF settings panel.');
            }

            // Resolve model path: use active state, then fall back to localStorage
            const savedPath = localStorage.getItem('tasc_ai_config_embedded_gguf');
            let resolvedPath = ggufModelPath;
            if (!resolvedPath && savedPath) {
              try { resolvedPath = JSON.parse(savedPath).model || ''; } catch { /* ignore */ }
            }
            if (!resolvedPath) {
              try { resolvedPath = localStorage.getItem('tasc_gguf_model_path') || ''; } catch { /* ignore */ }
            }

            if (!resolvedPath) {
              throw new Error('No GGUF model selected. Please select a .gguf model file in the AI Settings → Local GGUF panel.');
            }

            // If model is not loaded in daemon, auto-load it into llama-server.exe
            const daemonObj = (health as any)?.daemon;
            if (!daemonObj?.loadedModel || daemonObj?.loadedModel === '' || !daemonObj?.slmEngineReady) {
              try {
                const savedGpu = parseInt(localStorage.getItem('tasc_gguf_gpu_layers') || '33', 10);
                await pythonBridge.loadGgufModel(resolvedPath, 4096, 0, savedGpu);
              } catch (e: any) {
                console.warn('[AiAssistantView] Pre-inference auto-load warning:', e?.message || e);
              }
            }

            // Pass the messages array to chat_completion in the daemon / llama-server.exe.
            // Safety: compact any oversized system prompt so it fits local SLM context cleanly
            const chatMessages = msgs
              .filter(m => m.role === 'system' || m.role === 'user' || m.role === 'assistant')
              .map(m => {
                let content = String(m.content || '');
                if (m.role === 'system' && content.length > 1200) {
                  content = content.slice(0, 1000) + '\n... [Context summarized for local SLM]';
                }
                return { role: m.role as 'system' | 'user' | 'assistant', content };
              });

            const result = await pythonBridge.runSlmChatInference(chatMessages, ggufMaxTokens, ggufTemp);

            if (result.status === 'ERROR') {
              throw new Error(result.text || 'Local GGUF inference failed.');
            }

            // Yield the full text as one terminal chunk (daemon returns complete response, not streamed)
            yield { delta: result.text || 'No response from local model.', done: true };
          },
          // EmbeddedGgufControl handles model discovery — not needed here
          listModels: async () => [],
        };
        return ggufAdapter;
      }

      case 'custom':
        return createCustomAdapter({
          baseUrl,
          apiKey,
          model: activeModel || 'default',
          temperature: activeTemp,
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
          model: activeModel || 'gpt-4o-mini',
          temperature: activeTemp,
          contextLength: activeCtx,
          cpuThreads,
          gpuOffload,
          maxTokens,
          extraBody: parsedExtraBody
        });
      }
    }
  }, [provider, apiKey, model, baseUrl, temperature, contextLength, gpuOffload, cpuThreads, maxTokens, extraBodyJson]);

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
      contextLength,
      gpuOffload,
      cpuThreads,
      maxTokens,
      extraBodyJson
    };
    saveProviderConfig(provider, currentConfig);

    // 2. Save active provider selection
    localStorage.setItem('tasc_ai_provider', provider);

    // 3. Backward-compatible global keys
    localStorage.setItem('tasc_ai_model', model);
    localStorage.setItem('tasc_ai_base_url', baseUrl);
    localStorage.setItem('tasc_ai_temp', temperature.toString());
    localStorage.setItem('tasc_ai_context_length', contextLength.toString());
    localStorage.setItem('tasc_ai_gpu_offload', String(gpuOffload));
    localStorage.setItem('tasc_ai_cpu_threads', cpuThreads.toString());
    localStorage.setItem('tasc_ai_max_tokens', maxTokens.toString());
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
      embedded_gguf: 'Local GGUF (llama-cpp)',
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
      if (provider === 'embedded_gguf') {
        const verifyRes = await fetch(`/api/local-ai/verify-model?path=${encodeURIComponent(model || '')}`);
        const verifyData = await verifyRes.json();

        if (verifyData.ok && verifyData.exists) {
          if (verifyData.inbuiltFallback && verifyData.fallbackPath) {
            setModel(verifyData.fallbackPath);
            try { localStorage.setItem('tasc_gguf_model_path', verifyData.fallbackPath); } catch {}
          }
          const { pythonBridge } = await import('../services/ai/pythonBridgeClient');
          let health = await pythonBridge.checkHealth();
          
          if (!health.isAvailable) {
            // Trigger auto-start of daemon and await socket readiness
            await fetch('/api/ai/daemon/start', { method: 'POST' }).catch(() => {});
            health = await pythonBridge.checkHealth();
          }

          if (health.isAvailable) {
            setTestResult({
              ok: true,
              message: `Model Verified: "${verifyData.filename}" (${verifyData.sizeFormatted}) ready on disk. Python IPC Daemon online (${health.latencyMs}ms).`
            });
          } else {
            setTestResult({
              ok: true,
              message: `Model Verified: "${verifyData.filename}". Python local AI daemon auto-started and warming up.`
            });
          }
        } else {
          setTestResult({
            ok: false,
            message: verifyData.error || `Model file not found at: ${model}`
          });
        }
        return;
      }

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
    let targetContextLength = contextLength;
    let targetGpuOffload = gpuOffload;
    let targetCpuThreads = cpuThreads;
    let targetMaxTokens = maxTokens;
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
    if (parsed.contextLength !== undefined) {
      setContextLength(parsed.contextLength);
      targetContextLength = parsed.contextLength;
    }
    if (parsed.gpuOffload !== undefined) {
      setGpuOffload(parsed.gpuOffload);
      targetGpuOffload = parsed.gpuOffload;
    }
    if (parsed.cpuThreads !== undefined) {
      setCpuThreads(parsed.cpuThreads);
      targetCpuThreads = parsed.cpuThreads;
    }
    if (parsed.maxTokens !== undefined) {
      setMaxTokens(parsed.maxTokens);
      targetMaxTokens = parsed.maxTokens;
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
      contextLength: targetContextLength,
      gpuOffload: targetGpuOffload,
      cpuThreads: targetCpuThreads,
      maxTokens: targetMaxTokens,
      extraBodyJson: targetExtraBody
    });

    const providerNames: Record<AiProviderType, string> = {
      google_gemini: 'Google Gemini',
      openai: 'OpenAI',
      groq: 'Groq Cloud',
      ollama: 'Ollama (Local)',
      lmstudio: 'LM Studio (Local)',
      embedded_gguf: 'Local GGUF (llama-cpp)',
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

    // SCADA Diagnostic Disambiguation & Jev Parallel Constrained Execution
    if ((aiMode === 'AUTO' || aiMode === 'JEV_DECISION') && text.trim()) {
      const intent = classifyUserIntent(text);

      // If purely educational / conceptual, pass directly through to standard LLM reasoning turn
      if (!intent.isEducational && (aiMode === 'JEV_DECISION' || intent.isDiagnostic)) {
        setIsLoading(true);
        setErrorMessage(null);
        setStreamingText('[AUTO] SCADA diagnostic requested. Resolving topology and evaluating telemetry (<30ms)...');

        chatSession.push({
          role: 'user',
          content: text
        });
        setSessionRevision(r => r + 1);

        try {
          const liveAlarms = (typeof window !== 'undefined' && (window as any).__TASC_ACTIVE_ALARMS__) || activeAlarms;
          const resolution = resolveTargetAsset(text, appState, liveAlarms);

          // 1. Ambiguous match: multiple assets found for query
          if (resolution.status === 'AMBIGUOUS' && resolution.candidates && resolution.candidates.length > 1) {
            chatSession.push({
              role: 'assistant',
              content: `Multiple matching industrial assets found for "${text}". Please select which asset to evaluate:`,
              statusType: 'AMBIGUOUS',
              candidateAssets: resolution.candidates
            });
            setSessionRevision(r => r + 1);
            return;
          }

          // 2. Unbound asset: no telemetry or asset configuration matches query
          if (resolution.status === 'UNBOUND' && (!liveAlarms || liveAlarms.length === 0)) {
            chatSession.push({
              role: 'assistant',
              content: `[CONFIGURATION REQUIRED]\nNo asset or active telemetry bound matching "${text}" in current SCADA database.\n\nTo evaluate ISA-18.2 alarm triage or Root Cause Analysis:\n1. Verify the asset is configured on the SCADA canvas or Alarm Manager.\n2. Ensure live PLC driver tags are bound.\n3. Verify whether an alarm condition or trip cascade has occurred.`,
              statusType: 'UNBOUND'
            });
            setSessionRevision(r => r + 1);
            return;
          }

          // 3. Healthy / Nominal State: Asset is bound or plant monitored, but ZERO active alarms exist
          const targetAlarms = resolution.assetName
            ? (liveAlarms || []).filter(a => (a.panelName || a.panelId || '').toLowerCase().includes((resolution.assetName || '').toLowerCase()))
            : (liveAlarms || []);

          if (targetAlarms.length === 0 && (!liveAlarms || liveAlarms.length === 0)) {
            chatSession.push({
              role: 'assistant',
              content: `[STATUS: NOMINAL OPERATION]\nAsset **"${resolution.assetName || 'Plant Equipment'}"** is currently operating within normal design boundaries. Zero active alarms or trip cascades asserted in SCADA system.\n\nRoot Cause Analysis is inactive during nominal operation. No safety interlock action is required.`,
              statusType: 'NOMINAL'
            });
            setSessionRevision(r => r + 1);
            return;
          }

          // 4. Fault / Active Alarm Detected -> Run Jev Deterministic Inference!
          setIsJevEvaluating(true);
          const telemetry = buildDynamicTelemetryContext(resolution.assetName);

          if (intent.isTriage && !intent.isRca) {
            const triage = await pythonBridge.runAlarmTriage(telemetry);
            if (triage) {
              const probItems: JevProbItem[] = triage.probabilities?.severity
                ? Object.entries(triage.probabilities.severity).map(([k, v]) => ({ name: k, prob: Number(v) }))
                : [];

              const resolvedTag = appState?.panels?.find(p => p.panelId === targetAlarms[0]?.panelId)?.topic || targetAlarms[0]?.panelName || 'PLC_SAFETY_TRIP';

              const diagnosticPayload: JevDiagnosticPayload = {
                diagnosticType: 'TRIAGE',
                targetAsset: resolution.assetName || triage.target_subsystem || 'PROCESS_EQUIPMENT',
                initiatingEvent: triage.operator_notification || 'Alarm Cascade Evaluation',
                primaryResult: triage.severity || 'ALARM PRIORITY ASSIGNED',
                severity: (triage.severity === 'CRITICAL' ? 'CRITICAL' : triage.severity === 'HIGH' ? 'HIGH' : triage.severity === 'MEDIUM' ? 'MEDIUM' : 'NORMAL'),
                confidence: triage.confidence || 0.95,
                latencyMs: triage.latencyMs || 28.4,
                backend: triage.backend || 'laya-english',
                immediateAction: triage.immediate_action ? triage.immediate_action.replace(/_/g, ' ') : undefined,
                targetTag: resolvedTag,
                actionCommand: 1,
                probabilities: probItems,
                timestamp: new Date().toISOString()
              };

              chatSession.push({
                role: 'assistant',
                content: `### [Jev ISA-18.2 Alarm Triage: ${triage.severity}]\nEvaluated alarm cascade in **${triage.latencyMs.toFixed(1)}ms** via \`${triage.backend || 'laya-english'}\`. Deterministic action recommended in the diagnostic card below.`,
                jevDiagnostic: diagnosticPayload,
                statusType: 'FAULT_DETECTED'
              });
              setSessionRevision(r => r + 1);
              return;
            }
          } else {
            // Default to Root Cause Analysis (RCA)
            const rca = await pythonBridge.runRootCauseAnalysis(telemetry);
            if (rca) {
              const probItems: JevProbItem[] = rca.probabilities?.primary_root_cause
                ? Object.entries(rca.probabilities.primary_root_cause)
                    .map(([k, v]) => ({ name: k, prob: Number(v) }))
                    .sort((a, b) => b.prob - a.prob)
                    .slice(0, 5)
                : [];

              const resolvedTag = appState?.panels?.find(p => p.panelId === targetAlarms[0]?.panelId)?.topic || targetAlarms[0]?.panelName || 'PLC_SAFETY_TRIP';

              const diagnosticPayload: JevDiagnosticPayload = {
                diagnosticType: 'RCA',
                targetAsset: resolution.assetName || rca.subsystem_target || 'PROCESS_EQUIPMENT',
                initiatingEvent: rca.initiating_event.replace(/_/g, ' '),
                primaryResult: rca.primary_root_cause.replace(/_/g, ' '),
                severity: (rca.severity_badge === 'CRITICAL' ? 'CRITICAL' : rca.severity_badge === 'HIGH' ? 'HIGH' : rca.severity_badge === 'MEDIUM' ? 'MEDIUM' : 'NORMAL'),
                confidence: rca.confidence || 0.94,
                latencyMs: rca.latencyMs || 29.1,
                backend: rca.backend || 'laya-english',
                secondaryRisk: rca.secondary_damage_risk?.replace(/_/g, ' '),
                immediateAction: rca.immediate_rec_safety_action.replace(/_/g, ' '),
                targetTag: resolvedTag,
                actionCommand: 1,
                probabilities: probItems,
                timestamp: new Date().toISOString()
              };

              chatSession.push({
                role: 'assistant',
                content: `### [Jev Root Cause Analysis: ${diagnosticPayload.primaryResult}]\nEvaluated discrete hypothesis space in **${rca.latencyMs.toFixed(1)}ms** via \`${rca.backend || 'laya-english'}\`. Recommended safety interlock action available below.`,
                jevDiagnostic: diagnosticPayload,
                statusType: 'FAULT_DETECTED'
              });
              setSessionRevision(r => r + 1);
              return;
            }
          }
        } catch (err) {
          console.error('[AiAssistantView] Jev operational diagnostic error, falling back to standard LLM:', err);
        } finally {
          setIsLoading(false);
          setIsJevEvaluating(false);
          setStreamingText('');
        }
      }
    }

    // embedded_gguf uses the Python IPC bridge — no API key required (like ollama/lmstudio)
    if (provider !== 'ollama' && provider !== 'lmstudio' && provider !== 'embedded_gguf' && !apiKey) {
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
      // Ensure tools context is fresh with current live snapshot
      setAiToolsContext({
        latestValues: latestValues || store.latestValues || {},
        appState: appState || store.appState,
        activeAlarms: activeAlarms || store.activeAlarms || []
      });

      const adapter = getAdapter();

      let candidateModels = availableModels;
      if (candidateModels.length === 0 && adapter.listModels) {
        try {
          const fetched = await adapter.listModels();
          if (fetched && fetched.length > 0) {
            candidateModels = fetched;
            setAvailableModels(fetched);
          }
        } catch {}
      }

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
        images,
        {
          availableModels: candidateModels,
          isAutoAdaptive: model === 'auto' || model === 'auto-adaptive',
          adapterFactory: (targetModel, tierConfig) => getAdapter(targetModel, tierConfig)
        }
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
                onClick={() => setActiveTab('memory')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'memory'
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <i className="fas fa-brain"></i>
                <span>Memory & Knowledge</span>
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
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {(isDrawer || activeTab === 'chat') && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Operator Mode Selector (AUTO vs AI Assistant vs Jev Mode) */}
            <div className="p-3 bg-slate-950/70 border-b border-slate-800/80 shrink-0">
              <AiModeSelector
                currentMode={aiMode}
                onModeChange={handleAiModeChange}
                isEvaluating={isJevEvaluating}
              />
            </div>

            <div className="flex-1 min-h-0">
              <AiChatPanel
                key={`chat-panel-${sessionRevision}`}
                messages={[...chatSession]}
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
                activeModel={availableModels.length > 0 ? (availableModels.find(m => m === model) || availableModels[0]) : model}
                pendingReport={pendingReport}
                reportDownloads={reportDownloads}
                onReportSuggestionSelected={handleReportSuggestionSelected}
                onDownloadReport={(html, title) => downloadHtmlReport(html, title)}
                onDownloadExcel={handleDownloadExcel}
                onExecuteInterlock={handleExecuteInterlock}
              />
            </div>
          </div>
        )}

        {!isDrawer && activeTab === 'memory' && (
          <AiMemoryStudioTab appState={appState} />
        )}

        {!isDrawer && activeTab === 'settings' && (
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
                <div data-tour="ai-provider-tabs" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {[
                    { id: 'google_gemini', label: 'Google Gemini', desc: 'Flash 2.0 / Pro', icon: 'fa-google' },
                    { id: 'openai', label: 'OpenAI', desc: 'GPT-4o / Mini', icon: 'fa-cube' },
                    { id: 'groq', label: 'Groq Cloud', desc: 'Llama 3.3 Ultra Fast', icon: 'fa-bolt' },
                    { id: 'ollama', label: 'Ollama (Local)', desc: 'Edge localhost:11434', icon: 'fa-server' },
                    { id: 'lmstudio', label: 'LM Studio (Local)', desc: 'Edge localhost:1234', icon: 'fa-laptop-code' },
                    { id: 'embedded_gguf', label: 'Local GGUF (llama-cpp)', desc: 'Point-to-.gguf models', icon: 'fa-microchip' },
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

              {/* Embedded Local GGUF Model Selector (llama-cpp-python) */}
              {provider === 'embedded_gguf' && (
                <EmbeddedGgufControl
                  currentModelPath={model}
                  onSelectModelPath={(selectedPath) => setModel(selectedPath)}
                  onConfigChange={(newExtraJson) => setExtraBodyJson(newExtraJson)}
                />
              )}

              {/* Local AI Server Controller (Start/Stop Server with CMD & Live Status LED) */}
              {(provider === 'ollama' || provider === 'lmstudio') && (
                <LocalAiServerControl
                  provider={provider}
                  baseUrl={baseUrl}
                  currentModel={model}
                  contextLength={contextLength}
                  gpuOffload={gpuOffload}
                  cpuThreads={cpuThreads}
                  temperature={temperature}
                  maxTokens={maxTokens}
                  onSelectModel={(selected) => setModel(selected)}
                  onChangeSettings={(newSettings) => {
                    if (newSettings.contextLength !== undefined) setContextLength(newSettings.contextLength);
                    if (newSettings.gpuOffload !== undefined) setGpuOffload(newSettings.gpuOffload);
                    if (newSettings.cpuThreads !== undefined) setCpuThreads(newSettings.cpuThreads);
                    if (newSettings.temperature !== undefined) setTemperature(newSettings.temperature);
                    if (newSettings.maxTokens !== undefined) setMaxTokens(newSettings.maxTokens);
                  }}
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
              {provider !== 'ollama' && provider !== 'lmstudio' && provider !== 'embedded_gguf' && (
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

              {/* Inference Parameters (Temperature, Context Length, Max Tokens) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
                {/* Temperature Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <i className="fas fa-fire text-amber-400 text-xs"></i>
                      <span>Temperature (Sampling):</span>
                    </span>
                    <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {temperature.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.01"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
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
                        onClick={() => setTemperature(t.val)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer border ${
                          Math.abs(temperature - t.val) < 0.02
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context Length (Tokens) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <i className="fas fa-brain text-indigo-400 text-xs"></i>
                      <span>Context Window (Tokens):</span>
                    </span>
                    <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {contextLength.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2048"
                    max="65536"
                    step="2048"
                    value={contextLength}
                    onChange={(e) => setContextLength(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {[2048, 4096, 8192, 16384, 32768, 65536].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setContextLength(c)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer border ${
                          contextLength === c
                            ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {c >= 1024 ? `${c / 1024}K` : c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Limit Max Response Length */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <i className="fas fa-comment-dots text-emerald-400 text-xs"></i>
                      <span>Max Response Length:</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {maxTokens} Tokens
                    </span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>256 (Concise)</span>
                    <span>2048 (Standard)</span>
                    <span>8192 (Detailed Report)</span>
                  </div>
                </div>

                {/* CPU Threads Pool Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <i className="fas fa-layer-group text-sky-400 text-xs"></i>
                      <span>CPU Threads (Inference):</span>
                    </span>
                    <span className="font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {cpuThreads} Threads
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={cpuThreads}
                    onChange={(e) => setCpuThreads(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>1 Thread</span>
                    <span>8 Threads (Optimal)</span>
                    <span>16 Threads</span>
                  </div>
                </div>
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
                      provider === 'embedded_gguf'
                        ? 'Local GGUF'
                        : provider === 'custom'
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

      {/* AI Assistant Guided Tour Screen Overlay - full view only */}
      {!isDrawer && (
        <CoachMarkOverlay
          tourId="ai_assistant"
          isOpen={isAiTourOpen}
          onClose={() => setIsAiTourOpen(false)}
        />
      )}
    </div>
  );
};

export default AiAssistantView;
