export interface ImageAttachment {
  dataUrl: string; // e.g. "data:image/png;base64,..."
  mimeType: string; // e.g. "image/png"
  name?: string;
}

export interface JevProbItem {
  name: string;
  prob: number;
}

export interface JevDiagnosticPayload {
  diagnosticType: 'RCA' | 'TRIAGE';
  targetAsset: string;
  initiatingEvent: string;
  primaryResult: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  confidence: number;
  latencyMs: number;
  backend: string;
  secondaryRisk?: string;
  immediateAction?: string;
  targetTag?: string;
  actionCommand?: number | boolean;
  probabilities: JevProbItem[];
  timestamp: string; // ISO string
  telemetrySnapshot?: Record<string, any>;
  interlockExecuted?: {
    operator: string;
    executedAt: string;
    tagWritten: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  thoughtProcess?: string; // Optional internal Chain-of-Thought / reasoning
  toolCallId?: string;
  toolName?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  images?: ImageAttachment[];
  responseTimeMs?: number;
  timestamp?: string;
  // Industrial SCADA diagnostic extensions
  jevDiagnostic?: JevDiagnosticPayload;
  statusType?: 'NOMINAL' | 'FAULT_DETECTED' | 'UNBOUND' | 'AMBIGUOUS';
  candidateAssets?: Array<{ id: string; name: string; panelId?: string }>;
}

export interface ChatChunk {
  delta?: string;
  textDelta?: string;      // Alias for delta — used by some local model adapters (LM Studio, Ollama)
  reasoningDelta?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  done: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AiProviderAdapter {
  id: string;
  label: string;
  model?: string;
  sendStream(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ChatChunk, void, unknown>;
  listModels?(): Promise<string[]>;
  testConnection?(): Promise<{ ok: boolean; error?: string }>;
}

/**
 * Provider type identifier used throughout the application.
 */
export type AiProviderType =
  | 'google_gemini'
  | 'openai'
  | 'groq'
  | 'ollama'
  | 'lmstudio'
  | 'embedded_gguf'
  | 'nvidia_nim'
  | 'custom';
