import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ImageAttachment, JevDiagnosticPayload } from '../utils/aiProviders/types';
import { createSpeechDictation, SpeechDictationController } from '../utils/speechFilter';
import { CommunityAiQuotaStatus } from '../utils/aiQuotaManager';
import { PendingReportRequest, MultiAgentEvent, AppView } from '../types';
import { useAppStore } from '../store/useAppStore';
import { Ai3dAssetDefinition, Ai3dAssetService } from '../services/Ai3dAssetService';
import { verifyAiResponseTruth } from '../services/ai/multiTierFactShield';
import { Zap, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  activeToolName: string | null;
  errorMessage: string | null;
  streamingText?: string;
  onSendMessage: (text: string, images?: ImageAttachment[]) => void;
  onClearSession: () => void;
  onCancelRequest?: () => void;
  supportsVision?: boolean;
  isCommunity?: boolean;
  quotaStatus?: CommunityAiQuotaStatus;
  activeModel?: string;       // Currently loaded model name
  // Report generation props
  pendingReport?: PendingReportRequest | null;
  reportDownloads?: Array<{ jobId: string; title: string; html: string; excelWb?: any }>;
  onReportSuggestionSelected?: (selectedIds: number[]) => void;
  onDownloadReport?: (html: string, title: string) => void;
  onDownloadExcel?: (jobId: string, title: string) => void;
  onExecuteInterlock?: (action: string, targetTag?: string, commandVal?: any) => Promise<boolean> | boolean;
}

function formatResponseTime(ms?: number): string | null {
  if (!ms || ms <= 0) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Markdown image parser helper: splits text into text segments and markdown images
function renderMessageContent(content: string, onOpenImage: (url: string, alt: string) => void) {
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+|data:image\/[^\s)]+)\)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(content)) !== null) {
    // Push preceding text if any
    if (match.index > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>
      );
    }

    const altText = match[1] || 'Industrial Graphic';
    const imageUrl = match[2];

    elements.push(
      <div key={`img-${match.index}`} className="my-2.5 group relative">
        <div className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 max-w-md shadow-md">
          <img
            src={imageUrl}
            alt={altText}
            className="w-full max-h-72 object-contain cursor-pointer transition-transform duration-200 group-hover:scale-102"
            onClick={() => onOpenImage(imageUrl, altText)}
            loading="lazy"
          />
          <div
            className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer space-x-2"
            onClick={() => onOpenImage(imageUrl, altText)}
          >
            <span className="px-3 py-1.5 bg-slate-900/90 text-white text-xs font-semibold rounded-lg border border-slate-700/80 shadow-lg flex items-center space-x-1.5">
              <i className="fas fa-magnifying-glass-plus"></i>
              <span>View Fullscreen</span>
            </span>
          </div>
        </div>
        {altText && (
          <span className="text-[11px] text-slate-400 block mt-1 italic">{altText}</span>
        )}
      </div>
    );

    lastIndex = imageRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    elements.push(
      <span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>
    );
  }

  return elements.length > 0 ? elements : content;
}

interface JevDiagnosticCardProps {
  diagnostic: JevDiagnosticPayload;
  onOpenSafetyModal: () => void;
}

const JevDiagnosticChatCard: React.FC<JevDiagnosticCardProps> = ({
  diagnostic,
  onOpenSafetyModal
}) => {
  // Live TTL countdown timer (90s window)
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Date.now() - new Date(diagnostic.timestamp).getTime();
    return Math.max(0, Math.ceil((90000 - elapsed) / 1000));
  });

  useEffect(() => {
    if (secondsLeft <= 0 || diagnostic.interlockExecuted) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(diagnostic.timestamp).getTime();
      const left = Math.max(0, Math.ceil((90000 - elapsed) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [diagnostic.timestamp, diagnostic.interlockExecuted, secondsLeft]);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const isExpired = secondsLeft <= 0;
  const isExecuted = Boolean(diagnostic.interlockExecuted);

  return (
    <div className="mt-2.5 p-3.5 bg-slate-950/90 border border-amber-500/30 rounded-xl flex flex-col gap-2.5 text-xs text-slate-100 shadow-xl max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400 shrink-0" />
          <span className="font-bold text-amber-400 uppercase tracking-wide">
            {diagnostic.diagnosticType === 'TRIAGE' ? 'ISA-18.2 Alarm Triage' : 'Instant Root Cause Analysis (RCA)'}
          </span>
          <span className="px-1.5 py-0.2 bg-slate-800 text-[10px] text-slate-300 rounded font-mono">
            {diagnostic.latencyMs.toFixed(1)} ms
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            via {diagnostic.backend || 'laya-english'}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(diagnostic.severity)}`}>
          {diagnostic.severity}
        </span>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <div className="p-2 bg-slate-900/90 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Target Subsystem</span>
          <strong className="text-sky-300 text-xs block font-mono mt-0.5 truncate">
            {diagnostic.targetAsset.replace(/_/g, ' ')}
          </strong>
        </div>

        <div className="p-2 bg-slate-900/90 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Initiating Event</span>
          <strong className="text-slate-200 text-xs block font-mono mt-0.5 truncate">
            {diagnostic.initiatingEvent.replace(/_/g, ' ')}
          </strong>
        </div>

        <div className="p-2 bg-slate-900/90 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Primary Root Cause</span>
          <strong className="text-white text-xs block font-bold tracking-tight mt-0.5 truncate">
            {diagnostic.primaryResult.replace(/_/g, ' ')}
          </strong>
        </div>

        <div className="p-2 bg-slate-900/90 rounded border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Calibrated Confidence</span>
          <strong className="text-amber-400 text-xs block font-mono mt-0.5">
            {(diagnostic.confidence * 100).toFixed(1)}%
          </strong>
        </div>
      </div>

      {/* Collateral Risk */}
      {diagnostic.secondaryRisk && (
        <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/30 rounded border border-amber-500/20">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <span>Collateral Risk (60s): <strong>{diagnostic.secondaryRisk.replace(/_/g, ' ')}</strong></span>
        </div>
      )}

      {/* Probabilities */}
      {diagnostic.probabilities && diagnostic.probabilities.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Calibrated Logit Probability Distribution:</span>
            <span>Single Forward Pass</span>
          </div>
          <div className="space-y-1">
            {diagnostic.probabilities.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px]">
                <span className="w-36 sm:w-48 truncate text-slate-300 font-mono">{item.name.replace(/_/g, ' ')}</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      idx === 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, item.prob * 100))}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-slate-400">{(item.prob * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action / Interlock Block */}
      {diagnostic.immediateAction && (
        <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg flex flex-wrap items-center justify-between gap-2 mt-1">
          <div>
            <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider block">
              Immediate Recommended Safety Action:
            </span>
            <span className="text-xs font-bold text-white tracking-wide">
              {diagnostic.immediateAction.replace(/_/g, ' ')}
            </span>
          </div>

          <div>
            {isExecuted ? (
              <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-md text-[11px] font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>Interlock Dispatched ({diagnostic.interlockExecuted?.operator})</span>
              </span>
            ) : isExpired ? (
              <span className="px-2.5 py-1 bg-slate-800/80 text-slate-400 border border-slate-700 rounded-md text-[11px] font-mono flex items-center gap-1.5" title="Action expired after 90 seconds. Please re-evaluate live telemetry.">
                <Clock size={12} />
                <span>Action Expired (Re-evaluate)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenSafetyModal}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Open two-stage safety confirmation modal"
              >
                <Zap size={12} />
                <span>Execute Interlock ({secondsLeft}s)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AiChatPanel: React.FC<Props> = ({
  messages,
  isLoading,
  activeToolName,
  errorMessage,
  streamingText = '',
  onSendMessage,
  onClearSession,
  onCancelRequest,
  supportsVision = true,
  isCommunity = false,
  quotaStatus,
  activeModel,
  pendingReport = null,
  reportDownloads = [],
  onReportSuggestionSelected,
  onDownloadReport,
  onDownloadExcel,
  onExecuteInterlock
}) => {
  const isQuotaLocked = Boolean(isCommunity && quotaStatus?.isLocked);

  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
  const [agentActivity, setAgentActivity] = useState<MultiAgentEvent | null>(null);

  // Safety Interlock Modal State & Execution
  const [safetyModalTarget, setSafetyModalTarget] = useState<{ diagnostic: JevDiagnosticPayload; msgIndex: number } | null>(null);
  const [isExecutingInterlock, setIsExecutingInterlock] = useState(false);
  const [interlockExecutedNotice, setInterlockExecutedNotice] = useState<string | null>(null);

  // 3D AI Asset Generation State
  const [generated3dAssets, setGenerated3dAssets] = useState<Ai3dAssetDefinition[]>([]);
  const [pushedAssetIds, setPushedAssetIds] = useState<Set<string>>(new Set());

  // Dictation State
  const [isListening, setIsListening] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(true);
  const dictationControllerRef = useRef<SpeechDictationController | null>(null);
  const baseTextRef = useRef<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount for instantaneous, zero-click readiness
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to 3D Asset Generated Events
  useEffect(() => {
    const handle3dAsset = (e: any) => {
      if (e.detail) {
        setGenerated3dAssets(prev => {
          if (prev.some(a => a.id === e.detail.id)) return prev;
          return [...prev, e.detail];
        });
        setPushedAssetIds(prev => new Set(prev).add(e.detail.id));
      }
    };
    window.addEventListener('tasc_3d_asset_generated', handle3dAsset);
    return () => window.removeEventListener('tasc_3d_asset_generated', handle3dAsset);
  }, []);

  // Initialize Speech Dictation
  useEffect(() => {
    const controller = createSpeechDictation();
    dictationControllerRef.current = controller;
    setDictationSupported(controller.isSupported);

    return () => {
      if (dictationControllerRef.current) {
        dictationControllerRef.current.stop();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, activeToolName, isLoading, agentActivity]);

  // Subscribe to Multi-Agent Activity Events
  useEffect(() => {
    const handleAgentEvent = (e: any) => {
      if (e.detail) {
        setAgentActivity(e.detail);
      }
    };

    window.addEventListener('tasc_agent_activity', handleAgentEvent);
    return () => window.removeEventListener('tasc_agent_activity', handleAgentEvent);
  }, []);

  const handleSend = () => {
    if (isQuotaLocked) {
      alert(`Community Edition daily quota reached (5/5 prompts used). Your quota will reset in ${quotaStatus?.formattedTimeUntilReset || '24 hours'}.`);
      return;
    }
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;
    const text = inputText;
    const imgs = [...attachments];
    setInputText('');
    setAttachments([]);
    onSendMessage(text, imgs.length > 0 ? imgs : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Copy to Clipboard with temporary checkmark feedback
  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // File Upload Handlers (with 4MB size validation)
  const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > MAX_IMAGE_BYTES) {
        alert(`Image "${file.name}" exceeds 4MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please use a smaller image.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setAttachments(prev => [
            ...prev,
            { dataUrl, mimeType: file.type, name: file.name }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Paste Screenshot / Image direct from clipboard (if model supports vision)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        if (!supportsVision) {
          // Model does not support images
          return;
        }
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > MAX_IMAGE_BYTES) {
            alert(`Pasted image exceeds 4MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
            return;
          }
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              setAttachments(prev => [
                ...prev,
                { dataUrl, mimeType: file.type, name: `screenshot_${Date.now()}.png` }
              ]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Dictation Toggle
  const toggleDictation = () => {
    const controller = dictationControllerRef.current;
    if (!controller || !controller.isSupported) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      controller.stop();
      setIsListening(false);
    } else {
      // Remember any text already in the input box before starting speech
      baseTextRef.current = inputText.trim();
      setIsListening(true);

      controller.start(
        (finalText, interimText) => {
          const spoken = [finalText, interimText].filter(Boolean).join(' ').trim();
          const combined = baseTextRef.current
            ? (spoken ? `${baseTextRef.current} ${spoken}` : baseTextRef.current)
            : spoken;
          setInputText(combined);
        },
        (err) => {
          console.warn('[Dictation Error]:', err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
    }
  };

  // Filter out system, internal tool execution, and empty-content intermediate tool-call messages
  const displayMessages = messages.filter(m =>
    (m.role === 'user' || m.role === 'assistant') &&
    (Boolean(m.content && m.content.trim()) || Boolean(m.images && m.images.length > 0))
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 relative select-text">
      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {displayMessages.length === 0 && !isLoading && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 text-slate-500 space-y-2.5">
            <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 text-xl shadow-inner">
              <i className="fas fa-robot"></i>
            </div>
            <div className="max-w-xs">
              <p className="text-xs sm:text-sm font-semibold text-slate-300">How can I assist your operations?</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ask about telemetry, alarms, or inspect SCADA graphics.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mt-1 max-w-xs">
              {[
                'Why did Pump-1 trip? (Root Cause)',
                'Triage active alarms (ISA-18.2)',
                'What alarms are active?',
                'Summarize dashboards',
                'Generate a cooling P&ID diagram',
                'List all panels on screen'
              ].map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isQuotaLocked}
                  onClick={() => {
                    if (isQuotaLocked) {
                      alert(`Community Edition daily quota reached (5/5 prompts used). Resets in ${quotaStatus?.formattedTimeUntilReset || '24 hours'}.`);
                      return;
                    }
                    onSendMessage(prompt);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-colors border ${
                    isQuotaLocked
                      ? 'bg-slate-800/40 border-slate-700/40 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/70 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const responseTimeStr = formatResponseTime(msg.responseTimeMs);
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'} group`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xs shrink-0 mt-0.5 shadow-sm">
                  <i className="fas fa-brain"></i>
                </div>
              )}

              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%]`}>
                {/* Meta Header: Response Time Badge & Timestamp */}
                <div className="flex flex-wrap items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                  {!isUser && responseTimeStr && (
                    <span className="bg-sky-500/15 border border-sky-500/30 text-sky-300 px-2 py-0.2 rounded-full font-mono text-[10px] flex items-center space-x-1">
                      <i className="fas fa-bolt text-amber-400"></i>
                      <span>{responseTimeStr}</span>
                    </span>
                  )}
                  {msg.timestamp && <span className="opacity-70">{msg.timestamp}</span>}
                </div>

                {/* Bubble Container */}
                <div
                  className={`relative rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-md break-words ${
                    isUser
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.content, idx)}
                    title="Copy message to clipboard"
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all text-xs"
                  >
                    <i className={`fas ${isCopied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                  </button>

                  {/* Attached Images (if any) */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img.dataUrl}
                          alt={img.name || 'Uploaded photo'}
                          className="w-24 h-24 object-cover rounded-lg border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImage({ url: img.dataUrl, alt: img.name || 'Image' })}
                        />
                      ))}
                    </div>
                  )}

                  {/* Collapsible Thought / Reasoning Process (if model output CoT thinking) */}
                  {msg.thoughtProcess && (
                    <details className="mb-2 text-[11px] bg-slate-950/70 rounded-xl p-2 border border-slate-700/60 font-sans group/think">
                      <summary className="cursor-pointer text-amber-400/90 font-semibold flex items-center space-x-1.5 select-none hover:text-amber-300">
                        <i className="fas fa-lightbulb text-[10px]"></i>
                        <span>Thought Process</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-auto group-open/think:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-slate-400 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                        {msg.thoughtProcess}
                      </div>
                    </details>
                  )}

                  {/* Render Message Content with Markdown Image Lightbox Support */}
                  <div className="whitespace-pre-wrap">
                    {renderMessageContent(msg.content, (url, alt) => setLightboxImage({ url, alt }))}
                  </div>

                  {/* In-Chat SCADA Diagnostic Card (RCA / Triage) */}
                  {msg.jevDiagnostic && (
                    <JevDiagnosticChatCard
                      diagnostic={msg.jevDiagnostic}
                      onOpenSafetyModal={() => setSafetyModalTarget({ diagnostic: msg.jevDiagnostic!, msgIndex: idx })}
                    />
                  )}

                  {/* In-Chat Multi-Asset Quick Disambiguation Picker */}
                  {msg.candidateAssets && msg.candidateAssets.length > 0 && (
                    <div className="mt-2.5 p-2.5 bg-slate-950/80 border border-sky-500/30 rounded-xl space-y-2">
                      <span className="text-[11px] text-slate-300 font-mono block">
                        Select equipment to inspect:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.candidateAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => onSendMessage(`Why did ${asset.name} trip?`)}
                            className="px-2.5 py-1 bg-sky-950 hover:bg-sky-900/80 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold transition-all hover:scale-102 active:scale-95 cursor-pointer shadow-sm"
                          >
                            {asset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-300 text-xs shrink-0 mt-0.5 shadow-sm">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
          );
        })}

        {/* Live Streaming Delta Bubble */}
        {streamingText && (
          <div className="flex items-start space-x-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xs shrink-0 mt-0.5">
              <i className="fas fa-brain"></i>
            </div>
            <div className="max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-none whitespace-pre-wrap break-words shadow-md">
              {renderMessageContent(streamingText, (url, alt) => setLightboxImage({ url, alt }))}
              <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />
            </div>
          </div>
        )}

        {/* Compact Agent Status Bar — shown only while loading */}
        {agentActivity && isLoading && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg text-[11px] w-fit max-w-full">
            {/* Pulsing active indicator */}
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-slate-400 font-mono">
                {agentActivity.activeAgentCount != null && agentActivity.activeAgentCount > 0
                  ? `${agentActivity.activeAgentCount} agent${agentActivity.activeAgentCount === 1 ? '' : 's'}`
                  : '1 agent'}
              </span>
            </span>
            <span className="text-slate-700">|</span>
            {/* Loaded model name */}
            {activeModel && (
              <>
                <span className="text-slate-300 font-mono truncate max-w-[120px]" title={activeModel}>
                  {activeModel.split('/').pop()?.split(':')[0] || activeModel}
                </span>
                <span className="text-slate-700">|</span>
              </>
            )}
            {/* Current agent + action (truncated) */}
            <span className="text-sky-400 font-semibold shrink-0">{agentActivity.agentName}</span>
            <span className="text-slate-400 truncate max-w-[180px]" title={agentActivity.actionDescription}>
              {agentActivity.actionDescription.length > 50
                ? agentActivity.actionDescription.slice(0, 50) + '…'
                : agentActivity.actionDescription}
            </span>
          </div>
        )}

        {/* Tool Activity Indicator */}
        {activeToolName && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-900/90 border border-indigo-500/40 rounded-xl text-indigo-300 text-xs w-fit shadow-md">
            <i className="fas fa-gear fa-spin text-indigo-400"></i>
            <span>Executing industrial tool: <strong className="font-mono text-indigo-200">{activeToolName}</strong>...</span>
          </div>
        )}


        {/* General Loading Spinner */}
        {isLoading && !streamingText && !activeToolName && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-400 text-xs w-fit">
            <i className="fas fa-circle-notch fa-spin text-sky-400"></i>
            <span>Analyzing telemetry & generating response...</span>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-start space-x-2">
            <i className="fas fa-circle-exclamation text-red-400 mt-0.5 shrink-0"></i>
            <div className="flex-1">
              <strong className="font-semibold block mb-0.5">Assistant Error:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Report Suggestion Cards ─────────────────────────────────────────── */}
      {pendingReport && pendingReport.status === 'suggesting' && pendingReport.suggestions.length > 0 && (
        <div className="shrink-0 border-t border-slate-700/60 bg-slate-900/95 px-4 py-3">
          <div className="flex items-center space-x-2 mb-2.5">
            <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <i className="fas fa-lightbulb text-indigo-300 text-xs" />
            </div>
            <span className="text-xs font-semibold text-indigo-300">AI Report Enhancements — Select additions for <em className="text-slate-300">"{pendingReport.title}"</em></span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            {pendingReport.suggestions.map(s => {
              const isSelected = pendingReport.selectedSuggestionIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const prev = pendingReport.selectedSuggestionIds;
                    const next = isSelected ? prev.filter(x => x !== s.id) : [...prev, s.id];
                    onReportSuggestionSelected?.(next);
                  }}
                  className={`text-left rounded-xl px-3 py-2.5 border transition-all text-xs ${
                    isSelected
                      ? 'bg-indigo-600/25 border-indigo-500/60 text-indigo-200'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:border-indigo-500/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>{s.id}</div>
                    <div>
                      <p className="font-semibold leading-tight">{s.title}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                const selectedIds = pendingReport.selectedSuggestionIds;
                const selectionText = selectedIds.length === 0
                  ? 'none, proceed with base data only'
                  : `Include suggestion${selectedIds.length > 1 ? 's' : ''} ${selectedIds.join(' and ')}`;
                onSendMessage(selectionText);
              }}
              className="text-xs px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors flex items-center space-x-1.5"
            >
              <i className="fas fa-file-chart-column" />
              <span>Generate Report{pendingReport.selectedSuggestionIds.length > 0 ? ` (+${pendingReport.selectedSuggestionIds.length} enhancements)` : ''}</span>
            </button>
            <span className="text-xs text-slate-500">or reply in chat to select</span>
          </div>
        </div>
      )}

      {/* ── Report Download Cards ───────────────────────────────────────────── */}
      {reportDownloads.length > 0 && (
        <div className="shrink-0 border-t border-emerald-700/40 bg-emerald-950/30 px-4 py-3">
          {reportDownloads.slice(-2).map(rd => (
            <div key={rd.jobId} className="flex items-center justify-between bg-slate-800/80 border border-emerald-500/30 rounded-xl px-3 py-2.5 mb-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <i className="fas fa-file-chart-line text-emerald-400 text-xs" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-300">{rd.title}</p>
                  <p className="text-[11px] text-slate-500">AI Report ready — HTML (charts & analysis) + Excel</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([rd.html], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 15000);
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
                  title="View HTML Report in new tab"
                >
                  <i className="fas fa-eye mr-1" />View
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadReport?.(rd.html, rd.title)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                  title="Download as HTML"
                >
                  <i className="fas fa-file-code mr-1" />HTML
                </button>
                {rd.excelWb && (
                  <button
                    type="button"
                    onClick={() => onDownloadExcel?.(rd.jobId, rd.title)}
                    className="text-xs px-2 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white transition-colors"
                    title="Download as Excel workbook"
                  >
                    <i className="fas fa-file-excel mr-1" />Excel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Generated 3D Asset Preview Cards ─────────────────────────────────── */}
      {generated3dAssets.length > 0 && (
        <div className="shrink-0 border-t border-sky-700/40 bg-sky-950/30 px-4 py-3 space-y-2">
          {generated3dAssets.slice(-2).map(asset => {
            const isPushed = pushedAssetIds.has(asset.id);
            return (
              <div 
                key={asset.id} 
                className="bg-slate-900/90 border border-sky-500/40 rounded-xl p-3 shadow-lg shadow-sky-950/30 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-900/40 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                      <i className={`fas ${asset.icon || 'fa-cubes'} text-sm`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded border border-sky-500/30 uppercase tracking-wider">
                          3D Model Generated
                        </span>
                        <span className="text-[10px] text-slate-400">{asset.category}</span>
                      </div>
                      <h4 className="font-bold text-slate-200 text-xs truncate mt-0.5">{asset.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        Ai3dAssetService.saveAsset(asset);
                        setPushedAssetIds(prev => new Set(prev).add(asset.id));
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                        isPushed
                          ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 cursor-default'
                          : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-950/40'
                      }`}
                    >
                      <i className={`fas ${isPushed ? 'fa-check-circle text-emerald-400' : 'fa-box-archive'}`} />
                      <span>{isPushed ? 'In 3D Library' : 'Push to 3D Library'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        Ai3dAssetService.saveAsset(asset);
                        window.dispatchEvent(new CustomEvent('tasc_navigate_view', { detail: AppView.SCADA_3D }));
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-950/40"
                      title="Open 3D SCADA Studio and view model"
                    >
                      <i className="fas fa-cube" />
                      <span>Open 3D Studio</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[9px]">DIMENSIONS</span>
                    <span className="font-mono text-slate-300 font-semibold">{asset.dimensions.width}m × {asset.dimensions.height}m × {asset.dimensions.depth}m</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">COMPONENTS</span>
                    <span className="font-mono text-sky-400 font-semibold">{asset.components.length} Sub-Meshes</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">TELEMETRY SLOTS</span>
                    <span className="font-mono text-emerald-400 font-semibold">{asset.telemetryHooks.length} Real-Time Tags</span>
                  </div>
                </div>

                {asset.telemetryHooks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Live Hooks:</span>
                    {asset.telemetryHooks.map(h => (
                      <span key={h.slotName} className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                        {h.displayName} <span className="text-sky-400">({h.channelType})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attachment Previews Bar */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img
                src={att.dataUrl}
                alt={att.name || 'attachment'}
                className="w-14 h-14 object-cover rounded-lg border border-indigo-500/50"
              />
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>
          ))}
          <span className="text-xs text-slate-400 pl-2">Attached ({attachments.length})</span>
        </div>
      )}

      {/* Input Composer with Media Upload, Microphone Dictation & Community Quota Guard */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/95 shrink-0">
        {/* Community 5-Prompt Limit Interlock Lockout Banner */}
        {isQuotaLocked && (
          <div className="mb-2 px-3 py-1.5 bg-amber-950/70 border border-amber-500/40 rounded-xl flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center space-x-2 min-w-0">
              <i className="fas fa-lock text-amber-400 text-xs shrink-0"></i>
              <span className="text-xs text-amber-200 truncate">
                Daily quota reached (5/5). Resets in <strong className="font-mono text-amber-300">{quotaStatus?.formattedTimeUntilReset}</strong>.
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
              5/5
            </span>
          </div>
        )}

        <div
          className={`flex items-end space-x-2 bg-slate-800/90 border rounded-2xl p-1.5 transition-all ${
            isQuotaLocked
              ? 'border-amber-500/30 opacity-80'
              : 'border-slate-700/80 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/40'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!supportsVision || isQuotaLocked) return;
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              Array.from(files).forEach((file: File) => {
                if (!file.type.startsWith('image/')) return;
                if (file.size > MAX_IMAGE_BYTES) {
                  alert(`Dropped image "${file.name}" exceeds 4MB limit.`);
                  return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                  const dataUrl = event.target?.result as string;
                  if (dataUrl) {
                    setAttachments(prev => [
                      ...prev,
                      { dataUrl, mimeType: file.type, name: file.name }
                    ]);
                  }
                };
                reader.readAsDataURL(file);
              });
            }
          }}
        >
          {/* Media Upload Button (Enabled only when model supports vision) */}
          {supportsVision && (
            <>
              <button
                type="button"
                disabled={isQuotaLocked}
                onClick={() => fileInputRef.current?.click()}
                title={isQuotaLocked ? 'Community quota reached' : 'Attach Image / SCADA Screenshot (Vision Enabled)'}
                className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-700/60 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center w-8 h-8"
              >
                <i className="fas fa-image"></i>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={isQuotaLocked}
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          )}

          {/* Text Area with Screenshot Paste Support */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isQuotaLocked
                ? `Community daily prompt limit reached (5/5). Resets in ${quotaStatus?.formattedTimeUntilReset}...`
                : isListening
                ? 'Listening... speak naturally (filler sounds auto-removed)...'
                : 'Ask about live tags, alarms, or paste/attach image (Enter to send)...'
            }
            rows={1}
            disabled={isLoading || isQuotaLocked}
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-100 placeholder-slate-500 p-2 focus:outline-none resize-none max-h-24 disabled:opacity-50"
          />

          {/* Intelligent Microphone Dictation Button */}
          {dictationSupported && (
            <button
              type="button"
              disabled={isQuotaLocked}
              onClick={toggleDictation}
              title={
                isQuotaLocked
                  ? 'Community quota reached'
                  : isListening
                  ? 'Stop Voice Dictation'
                  : 'Start Intelligent Voice Dictation (Auto-Cleans Fillers)'
              }
              className={`p-2 rounded-xl text-xs transition-all shrink-0 flex items-center justify-center w-8 h-8 disabled:opacity-40 ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-lg ring-2 ring-red-400/50'
                  : 'text-slate-400 hover:text-sky-300 hover:bg-slate-700/60'
              }`}
            >
              <i className={`fas ${isListening ? 'fa-microphone-lines' : 'fa-microphone'}`}></i>
            </button>
          )}

          {/* Send / Stop / Locked Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onCancelRequest}
              title="Cancel generation"
              className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center w-8 h-8"
            >
              <i className="fas fa-stop"></i>
            </button>
          ) : isQuotaLocked ? (
            <button
              type="button"
              disabled
              title={`Community daily limit reached (5/5). Resets in ${quotaStatus?.formattedTimeUntilReset}`}
              className="p-2 bg-slate-800/90 border border-amber-500/40 text-amber-400 rounded-xl text-xs cursor-not-allowed shrink-0 flex items-center justify-center w-8 h-8 shadow-sm"
            >
              <i className="fas fa-lock text-xs"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() && attachments.length === 0}
              title="Send Message"
              className="p-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs transition-all shrink-0 flex items-center justify-center w-8 h-8 shadow-sm"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          )}
        </div>

        {/* Quota Counter Pill Footer for Community Users when not locked */}
        {isCommunity && !isQuotaLocked && (
          <div className="flex items-center justify-between mt-1.5 px-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <i className="fas fa-bolt text-emerald-400 text-[10px]"></i>
              <span>Community Quota: <strong className="text-white font-mono">{quotaStatus?.remainingCount ?? 5} of 5</strong> daily prompts remaining</span>
            </span>
            <span className="font-mono text-slate-500 text-[9px]">24-hour rolling reset</span>
          </div>
        )}
      </div>

      {/* Lightbox Modal for High-Resolution Image Inspection */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 truncate max-w-md">{lightboxImage.alt}</span>
              <div className="flex items-center space-x-2">
                <a
                  href={lightboxImage.url}
                  download="industrial_image"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
                >
                  <i className="fas fa-download"></i>
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg text-sm"
                >
                  <i className="fas fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="p-2 overflow-auto flex items-center justify-center">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.alt}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Two-Stage Safety Confirmation Modal for Hardware Interlocks */}
      {safetyModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Industrial Safety Interlock — Confirmation</span>
              </div>
              <button
                type="button"
                onClick={() => setSafetyModalTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-200 space-y-1.5">
              <p className="font-semibold text-red-300">
                CRITICAL OPERATIONAL COMMAND:
              </p>
              <p className="text-[11px] text-slate-300">
                You are about to dispatch a hardware emergency trip sequence to the live plant automation bus.
              </p>
            </div>

            <div className="space-y-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Target Asset:</span>
                <strong className="text-white font-mono">{safetyModalTarget.diagnostic.targetAsset}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Safety Action:</span>
                <strong className="text-red-400 font-mono">{safetyModalTarget.diagnostic.immediateAction}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Target PLC Tag:</span>
                <span className="text-amber-300 font-mono">{safetyModalTarget.diagnostic.targetTag || 'PLC_SAFETY_TRIP'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Command Written:</span>
                <span className="text-emerald-400 font-mono">1 (EMERGENCY ISOLATE)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Operator Identity:</span>
                <span className="text-slate-200 font-mono">Engineering Studio Admin</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSafetyModalTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsExecutingInterlock(true);
                  try {
                    const action = safetyModalTarget.diagnostic.immediateAction || 'TRIP';
                    const tag = safetyModalTarget.diagnostic.targetTag || 'PLC_SAFETY_TRIP';
                    if (onExecuteInterlock) {
                      await onExecuteInterlock(action, tag, 1);
                    }
                    // Update diagnostic payload in message
                    safetyModalTarget.diagnostic.interlockExecuted = {
                      operator: 'Admin',
                      executedAt: new Date().toISOString(),
                      tagWritten: tag
                    };
                    setInterlockExecutedNotice(`Interlock dispatched to ${tag}: ${action}`);
                    setTimeout(() => setInterlockExecutedNotice(null), 5000);
                    setSafetyModalTarget(null);
                  } finally {
                    setIsExecutingInterlock(false);
                  }
                }}
                disabled={isExecutingInterlock}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap size={14} />
                <span>{isExecutingInterlock ? 'Dispatching Interlock...' : 'Confirm Hardware Trip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Interlock Dispatched Toast */}
      {interlockExecutedNotice && (
        <div className="fixed bottom-20 right-6 z-50 p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span><strong>Hardware Interlock Dispatched:</strong> {interlockExecutedNotice}</span>
        </div>
      )}
    </div>
  );
};
