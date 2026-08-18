import { AiProviderAdapter, ChatChunk, ChatMessage, ToolDefinition } from './types';
import { parseSSELines, parseDeltaToolCalls } from '../streamParsing';

export interface OpenAiConfig {
  id?: string;
  label?: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  extraBody?: Record<string, unknown>;
  customHeaders?: Record<string, string>;
}

async function fetchWithProxyFallback(url: string, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, init);
    return res;
  } catch (err: any) {
    // If browser CORS or network error ("Failed to fetch"), retry via transparent local backend proxy
    if (typeof window !== 'undefined') {
      try {
        const proxyUrl = `/api/ai/proxy?url=${encodeURIComponent(url)}`;
        const headers: Record<string, string> = {
          'x-target-url': url
        };
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => { headers[k] = v; });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => { headers[k] = v; });
          } else {
            Object.assign(headers, init.headers);
          }
        }
        return await fetch(proxyUrl, {
          ...init,
          headers
        });
      } catch (proxyErr) {
        throw err;
      }
    }
    throw err;
  }
}

export function normalizeBaseUrl(raw: string): string {
  let url = (raw || '').trim().replace(/\/+$/, '');
  if (!url) return 'https://api.openai.com/v1';
  if (url.endsWith('/chat/completions')) {
    url = url.replace(/\/chat\/completions$/, '');
  } else if (url.endsWith('/models')) {
    url = url.replace(/\/models$/, '');
  }
  if (
    (url.includes('integrate.api.nvidia.com') || url.includes('api.openai.com') || url.includes('api.groq.com/openai')) &&
    !url.endsWith('/v1')
  ) {
    url = `${url}/v1`;
  }
  return url;
}

export function createOpenAiAdapter(config: OpenAiConfig): AiProviderAdapter {
  const adapterId = config.id || 'openai';
  const adapterLabel = config.label || 'OpenAI Compatible';
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return {
    id: adapterId,
    label: adapterLabel,

    async *sendStream(
      messages: ChatMessage[],
      tools: ToolDefinition[],
      signal?: AbortSignal
    ): AsyncGenerator<ChatChunk, void, unknown> {
      const endpoint = `${baseUrl}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.customHeaders || {})
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const formattedMessages = messages.map(msg => {
        if (msg.role === 'tool') {
          return {
            role: 'tool',
            content: msg.content,
            tool_call_id: msg.toolCallId || 'call_default'
          };
        }
        if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
          return {
            role: 'assistant',
            content: msg.content || null,
            tool_calls: msg.toolCalls.map((tc, idx) => ({
              id: tc.id || `call_${idx}_${Date.now()}`,
              type: 'function',
              function: {
                name: tc.name,
                arguments: tc.arguments || '{}'
              }
            }))
          };
        }
        if (msg.role === 'user' && msg.images && msg.images.length > 0) {
          const contentParts: any[] = [{ type: 'text', text: msg.content || '' }];
          for (const img of msg.images) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: img.dataUrl
              }
            });
          }
          return {
            role: 'user',
            content: contentParts
          };
        }
        return {
          role: msg.role,
          content: msg.content
        };
      });

      const formattedTools = tools.length > 0
        ? tools.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters
            }
          }))
        : undefined;

      const bodyPayload: Record<string, any> = {
        model: config.model,
        messages: formattedMessages,
        stream: true,
        ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
        ...(config.maxTokens !== undefined ? { max_tokens: config.maxTokens } : { max_tokens: 4096 }),
        ...(config.topP !== undefined ? { top_p: config.topP } : {}),
        ...(formattedTools ? { tools: formattedTools, tool_choice: 'auto' } : {}),
        ...(config.extraBody || {})
      };

      let response: Response;
      try {
        response = await fetchWithProxyFallback(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
          signal
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          yield { done: true };
          return;
        }
        throw new Error(`[${adapterLabel}] Network error: ${err.message}`);
      }

      if (!response.ok) {
        let errBody = '';
        try {
          errBody = await response.text();
        } catch {}

        if (response.status === 401 || response.status === 403) {
          throw new Error(`[AUTH_ERROR] Authentication failed (${response.status}): ${errBody || 'Invalid API Key'}`);
        } else if (response.status === 429) {
          throw new Error(`[RATE_LIMIT] Rate limit exceeded (${response.status}): ${errBody || 'Please retry later'}`);
        } else {
          throw new Error(`[${adapterLabel}] Server error (${response.status}): ${errBody}`);
        }
      }

      if (!response.body) {
        throw new Error(`[${adapterLabel}] Response body is null`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      const toolCallsAcc = new Map<number, { id: string; name: string; arguments: string }>();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = parseSSELines(buffer);

          // Find the last newline in buffer to retain incomplete line
          const lastNewline = Math.max(buffer.lastIndexOf('\n'), buffer.lastIndexOf('\r'));
          if (lastNewline >= 0) {
            buffer = buffer.slice(lastNewline + 1);
          }

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (!delta) continue;

              // Capture reasoning / thinking stream tokens separately (NVIDIA Nemotron, DeepSeek R1, OpenAI o1/o3)
              const reasoning = delta.reasoning_content || delta.reasoning || delta.thinking;
              if (reasoning) {
                yield { reasoningDelta: reasoning, done: false };
              }

              // Standard user-visible content delta
              if (delta.content) {
                yield { delta: delta.content, done: false };
              }

              // Tool calls streaming accumulation
              if (delta.tool_calls) {
                parseDeltaToolCalls(delta.tool_calls, toolCallsAcc);
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          yield { done: true };
          return;
        }
        throw err;
      } finally {
        reader.releaseLock();
      }

      if (toolCallsAcc.size > 0) {
        const toolCalls = Array.from(toolCallsAcc.values()).map(tc => ({
          id: tc.id || `call_${Math.random().toString(36).slice(2, 9)}`,
          name: tc.name,
          arguments: tc.arguments
        }));
        yield { toolCalls, done: true };
      } else {
        yield { done: true };
      }
    },

    async listModels(): Promise<string[]> {
      const endpoint = `${baseUrl}/models`;
      const headers: Record<string, string> = { ...(config.customHeaders || {}) };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

      try {
        const res = await fetchWithProxyFallback(endpoint, { headers });
        if (!res.ok) return [config.model];
        const data = await res.json();
        if (Array.isArray(data.data)) {
          return data.data.map((m: any) => m.id).filter(Boolean);
        }
        return [config.model];
      } catch {
        return [config.model];
      }
    },

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.customHeaders || {})
      };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

      // Stage 1: Try GET /models if not NVIDIA NIM (NVIDIA NIM endpoints are chat-centric)
      if (!baseUrl.includes('nvidia.com')) {
        try {
          const endpoint = `${baseUrl}/models`;
          const res = await fetchWithProxyFallback(endpoint, { headers });
          if (res.ok) return { ok: true };
          if (res.status === 401 || res.status === 403) {
            return { ok: false, error: `[AUTH_ERROR] Invalid credentials (${res.status})` };
          }
        } catch {
          // Fall through to Stage 2
        }
      }

      // Stage 2: Direct minimal Chat Completion test (validates credentials & model inference for NVIDIA NIM, DeepSeek, vLLM)
      try {
        const chatEndpoint = `${baseUrl}/chat/completions`;
        const testPayload: Record<string, any> = {
          model: config.model || 'nvidia/nemotron-3.5-lightning-30b-a3b',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
          stream: false,
          ...(config.extraBody || {})
        };

        const res = await fetchWithProxyFallback(chatEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(testPayload)
        });

        if (res.ok) return { ok: true };

        const text = await res.text();
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: `[AUTH_ERROR] Invalid API Key / Unauthorized (${res.status})` };
        } else if (res.status === 404) {
          return { ok: false, error: `[NOT_FOUND] Model "${config.model}" not found on ${baseUrl} (${res.status})` };
        } else if (res.status === 429) {
          return { ok: false, error: `[RATE_LIMIT] Rate limit exceeded (${res.status})` };
        }
        return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 150)}` };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Connection failed' };
      }
    }
  };
}
