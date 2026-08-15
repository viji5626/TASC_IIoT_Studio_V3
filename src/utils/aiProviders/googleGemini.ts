import { GoogleGenAI } from '@google/genai';
import { AiProviderAdapter, ChatChunk, ChatMessage, ToolDefinition } from './types';

function toGeminiTools(tools: ToolDefinition[]): any[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }))
    }
  ];
}

export function createGeminiAdapter(apiKey: string, model = 'gemini-2.0-flash'): AiProviderAdapter {
  const selectedModel = model || 'gemini-2.0-flash';

  return {
    id: 'google_gemini',
    label: 'Google Gemini',

    async *sendStream(
      messages: ChatMessage[],
      tools: ToolDefinition[],
      signal?: AbortSignal
    ): AsyncGenerator<ChatChunk, void, unknown> {
      if (!apiKey) {
        throw new Error('[AUTH_ERROR] Google Gemini API Key is missing. Please configure it in settings.');
      }

      // Convert messages to Gemini format
      const systemMessage = messages.find(m => m.role === 'system');
      const nonSystemMessages = messages.filter(m => m.role !== 'system');

      const contents: any[] = [];
      for (const msg of nonSystemMessages) {
        if (msg.role === 'user') {
          const parts: any[] = [{ text: msg.content || ' ' }];
          if (msg.images && msg.images.length > 0) {
            for (const img of msg.images) {
              const base64Data = img.dataUrl.includes(',') ? img.dataUrl.split(',')[1] : img.dataUrl;
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || 'image/png',
                  data: base64Data
                }
              });
            }
          }
          contents.push({
            role: 'user',
            parts
          });
        } else if (msg.role === 'assistant') {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content }]
          });
        } else if (msg.role === 'tool') {
          contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: msg.toolName || 'tool_response',
                  response: { result: msg.content }
                }
              }
            ]
          });
        }
      }

      // If last message was a tool response or user message, ensure contents are not empty
      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
      }

      const geminiTools = toGeminiTools(tools);

      // Using GoogleGenAI SDK
      try {
        const ai = new GoogleGenAI({ apiKey });
        const config: any = {
          maxOutputTokens: 1024
        };
        if (systemMessage?.content) {
          config.systemInstruction = { parts: [{ text: systemMessage.content }] };
        }
        if (geminiTools) {
          config.tools = geminiTools;
        }

        const responseStream = await ai.models.generateContentStream({
          model: selectedModel,
          contents,
          config
        });

        const toolCallsAcc: Array<{ id: string; name: string; arguments: string }> = [];

        for await (const chunk of responseStream) {
          if (signal?.aborted) {
            yield { done: true };
            return;
          }

          if (chunk.text) {
            yield { delta: chunk.text, done: false };
          }

          // Check for function calls in candidates
          const candidates = (chunk as any).candidates;
          if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
              if (part.functionCall) {
                const fc = part.functionCall;
                toolCallsAcc.push({
                  id: `call_${Math.random().toString(36).slice(2, 9)}`,
                  name: fc.name,
                  arguments: JSON.stringify(fc.args || {})
                });
              }
            }
          }
        }

        if (toolCallsAcc.length > 0) {
          yield { toolCalls: toolCallsAcc, done: true };
        } else {
          yield { done: true };
        }
      } catch (err: any) {
        if (signal?.aborted || err.name === 'AbortError') {
          yield { done: true };
          return;
        }
        const errMsg = err.message || '';
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('API key not valid')) {
          throw new Error(`[AUTH_ERROR] Invalid Google Gemini API Key: ${errMsg}`);
        }
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error(`[RATE_LIMIT] Gemini quota/rate limit exceeded: ${errMsg}`);
        }
        throw new Error(`[Google Gemini] Error: ${errMsg}`);
      }
    },

    async listModels(): Promise<string[]> {
      if (!apiKey) return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!res.ok) return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        const data = await res.json();
        if (Array.isArray(data.models)) {
          const names = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name?.replace('models/', ''))
            .filter(Boolean);
          if (names.length > 0) return names;
        }
        return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      } catch {
        return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      }
    },

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
      if (!apiKey) {
        return { ok: false, error: 'API key is empty' };
      }
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Connection failed' };
      }
    }
  };
}
