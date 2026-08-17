import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ImageAttachment } from '../utils/aiProviders/types';
import { createSpeechDictation, SpeechDictationController } from '../utils/speechFilter';
import { CommunityAiQuotaStatus } from '../utils/aiQuotaManager';

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
  quotaStatus
}) => {
  const isQuotaLocked = Boolean(isCommunity && quotaStatus?.isLocked);

  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);

  // Dictation State
  const [isListening, setIsListening] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(true);
  const dictationControllerRef = useRef<SpeechDictationController | null>(null);
  const baseTextRef = useRef<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [messages, streamingText, activeToolName, isLoading]);

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
                <div className="flex items-center space-x-2 mb-1 px-1 text-[11px] text-slate-400">
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

                  {/* Render Message Content with Markdown Image Lightbox Support */}
                  <div className="whitespace-pre-wrap">
                    {renderMessageContent(msg.content, (url, alt) => setLightboxImage({ url, alt }))}
                  </div>
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

        {/* Tool Activity Indicator */}
        {activeToolName && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs w-fit">
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
    </div>
  );
};
