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
  contextLength?: number;
  cpuThreads?: number;
  gpuOffload?: string | number;
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
    (url.includes('integrate.api.nvidia.com') || url.includes('api.openai.com') || url.includes('api.groq.com/openai') || url.includes('1234') || url.includes('localhost:1234') || url.includes('127.0.0.1:1234')) &&
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
    model: config.model,

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

      const formattedTools = (tools && tools.length > 0)
        ? tools.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters
            }
          }))
        : undefined;

      // Format Ollama-specific options if applicable
      const ollamaOptions: Record<string, any> = {};
      if (config.contextLength !== undefined) ollamaOptions.num_ctx = config.contextLength;
      if (config.cpuThreads !== undefined) ollamaOptions.num_thread = config.cpuThreads;
      if (config.temperature !== undefined) ollamaOptions.temperature = config.temperature;
      if (config.maxTokens !== undefined) ollamaOptions.num_predict = config.maxTokens;
      if (config.gpuOffload !== undefined) {
        if (config.gpuOffload === 'max') ollamaOptions.num_gpu = 99;
        else if (config.gpuOffload === 'off') ollamaOptions.num_gpu = 0;
        else if (typeof config.gpuOffload === 'number') ollamaOptions.num_gpu = config.gpuOffload;
        else if (typeof config.gpuOffload === 'string' && !isNaN(Number(config.gpuOffload))) {
          const num = Number(config.gpuOffload);
          ollamaOptions.num_gpu = num <= 1.0 && num > 0 ? Math.round(num * 33) : Math.round(num);
        }
      }

      let resolvedModel = config.model;
      if (!resolvedModel || resolvedModel === 'auto' || resolvedModel === 'auto-adaptive' || resolvedModel === 'local-model') {
        try {
          const listEndpoint = `${baseUrl}/models`;
          const res = await fetchWithProxyFallback(listEndpoint, { headers });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.data) && data.data.length > 0) {
              const valid = data.data
                .map((m: any) => m.id)
                .filter((id: string) => id && !id.toLowerCase().includes('embed'));
              if (valid.length > 0) {
                resolvedModel = valid[0];
              }
            }
          }
        } catch {}
      }

      // LM Studio does NOT accept context_length / n_ctx in the HTTP body — it uses CLI flags only.
      // Sending unknown body params to LM Studio causes the model to return an empty/null delta.
      const isLmStudio = adapterId === 'lmstudio' || adapterLabel.includes('LM Studio');
      const isOllama = adapterId === 'ollama' || adapterLabel.includes('Ollama');

      const bodyPayload: Record<string, any> = {
        model: resolvedModel || config.model,
        messages: formattedMessages,
        stream: true,
        ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
        ...(config.maxTokens !== undefined ? { max_tokens: config.maxTokens } : { max_tokens: 4096 }),
        ...(config.topP !== undefined ? { top_p: config.topP } : {}),
        // Only send context/thread params for Ollama (via options block), NOT for LM Studio
        ...(!isLmStudio && config.contextLength !== undefined ? { context_length: config.contextLength, n_ctx: config.contextLength } : {}),
        ...(!isLmStudio && config.cpuThreads !== undefined ? { cpu_threads: config.cpuThreads, threads: config.cpuThreads } : {}),
        // Ollama-specific options block
        ...(isOllama && Object.keys(ollamaOptions).length > 0 ? { options: ollamaOptions } : {}),
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
        } catch { }

        // Detect GPU Out-of-Memory: surface a helpful, actionable message
        const isOomError = errBody.toLowerCase().includes('out-of-memory') ||
          errBody.toLowerCase().includes('cuda_host') ||
          errBody.toLowerCase().includes('alloc_buffer') ||
          errBody.toLowerCase().includes('ggml_backend') ||
          errBody.toLowerCase().includes('failed to allocate');

        if (isOomError) {
          throw new Error(`[OOM] ${adapterLabel} ran out of GPU/CPU memory loading the model. ` +
            `Try: (1) Select a smaller model (e.g. 3B/7B), (2) Reduce context length to 2048, ` +
            `(3) Set GPU Offload to "off" to use CPU-only mode. Original: ${errBody.slice(0, 200)}`);
        }

        // Auto-fallback if the local model does not support tool calling (e.g. phi3:mini, liquid, gemma, lfm)
        if (response.status === 400 && formattedTools) {
          const isToolError = 
            errBody.toLowerCase().includes('tool') || 
            errBody.toLowerCase().includes('function') || 
            errBody.toLowerCase().includes('schema') ||
            errBody.toLowerCase().includes('not supported') ||
            errBody.toLowerCase().includes('invalid_request_error') ||
            adapterLabel.includes('LM Studio') ||
            adapterLabel.includes('Ollama');

          if (isToolError) {
            console.warn(`[${adapterLabel}] Model "${config.model}" rejected tool calling (${errBody.slice(0, 100)}). Retrying in direct prompt mode without tool schemas.`);
            const fallbackPayload = { ...bodyPayload };
            delete fallbackPayload.tools;
            delete fallbackPayload.tool_choice;

            try {
              response = await fetchWithProxyFallback(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(fallbackPayload),
                signal
              });
              if (response.ok) {
                errBody = '';
              } else {
                errBody = await response.text().catch(() => '');
              }
            } catch (retryErr: any) {
              throw new Error(`[${adapterLabel}] Network error during fallback: ${retryErr.message}`);
            }
          }
        }

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error(`[AUTH_ERROR] Authentication failed (${response.status}): ${errBody || 'Invalid API Key'}`);
          } else if (response.status === 429) {
            throw new Error(`[RATE_LIMIT] Rate limit exceeded (${response.status}): ${errBody || 'Please retry later'}`);
          } else {
            throw new Error(`[${adapterLabel}] Server error (${response.status}): ${errBody}`);
          }
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
          const rawLines = buffer.split(/\r?\n/);
          buffer = rawLines.pop() || '';

          for (const rawLine of rawLines) {
            const line = rawLine.trim();
            if (!line || !line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;

              // LM Studio / some models send a non-streaming final message in choices[0].message
              // instead of choices[0].delta — handle both.
              const msgContent = (choice.message as any)?.content;
              if (!delta && msgContent) {
                yield { delta: msgContent, textDelta: msgContent, done: false };
                continue;
              }

              if (!delta) continue;

              // Capture reasoning / thinking stream tokens separately (NVIDIA Nemotron, DeepSeek R1, OpenAI o1/o3, Qwen 3.5)
              const reasoning = delta.reasoning_content || delta.reasoning || delta.thinking;
              if (reasoning) {
                yield { reasoningDelta: reasoning, done: false };
              }

              // Standard user-visible content delta — delta.content can be null on finish chunk
              if (delta.content !== null && delta.content !== undefined && delta.content !== '') {
                yield { delta: delta.content, textDelta: delta.content, done: false };
              }

              // Tool calls streaming accumulation
              if (delta.tool_calls) {
                parseDeltaToolCalls(delta.tool_calls, toolCallsAcc);
              }
            } catch { }
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
