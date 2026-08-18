export interface ImageAttachment {
  dataUrl: string; // e.g. "data:image/png;base64,..."
  mimeType: string; // e.g. "image/png"
  name?: string;
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
}

export interface ChatChunk {
  delta?: string;
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
  sendStream(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal
  ): AsyncGenerator<ChatChunk, void, unknown>;
  listModels?(): Promise<string[]>;
  testConnection?(): Promise<{ ok: boolean; error?: string }>;
}
