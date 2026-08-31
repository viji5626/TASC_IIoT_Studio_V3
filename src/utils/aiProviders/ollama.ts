import { AiProviderAdapter } from './types';
import { createOpenAiAdapter } from './openai';

export interface OllamaConfig {
  host?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  contextLength?: number;
  cpuThreads?: number;
  gpuOffload?: string | number;
  extraBody?: Record<string, unknown>;
}

export function createOllamaAdapter(
  configOrHost: string | OllamaConfig = 'http://localhost:11434',
  model = 'llama3.2'
): AiProviderAdapter {
  const isObject = typeof configOrHost === 'object' && configOrHost !== null;
  const rawHost: string = isObject 
    ? (configOrHost.baseUrl || configOrHost.host || 'http://localhost:11434') 
    : (typeof configOrHost === 'string' ? configOrHost : 'http://localhost:11434');
  const selectedModel = isObject ? (configOrHost.model || model || 'llama3.2') : (model || 'llama3.2');

  const cleanHost = (rawHost || 'http://localhost:11434').replace(/\/+$/, '');
  const baseUrl = cleanHost.endsWith('/v1') ? cleanHost : `${cleanHost}/v1`;

  const temperature = isObject ? configOrHost.temperature : undefined;
  const maxTokens = isObject ? configOrHost.maxTokens : undefined;
  const topP = isObject ? configOrHost.topP : undefined;
  const contextLength = isObject ? configOrHost.contextLength : undefined;
  const cpuThreads = isObject ? configOrHost.cpuThreads : undefined;
  const gpuOffload = isObject ? configOrHost.gpuOffload : undefined;
  const extraBody = isObject ? configOrHost.extraBody : undefined;

  const baseAdapter = createOpenAiAdapter({
    id: 'ollama',
    label: 'Ollama (Local)',
    baseUrl,
    model: selectedModel,
    temperature,
    maxTokens,
    topP,
    contextLength,
    cpuThreads,
    gpuOffload,
    extraBody
  });

  return {
    ...baseAdapter,

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
      try {
        const rootUrl = cleanHost.replace(/\/v1$/, '');
        const res = await fetch(`${rootUrl}/api/tags`);
        if (res.ok) return { ok: true };
        return { ok: false, error: `Ollama returned status ${res.status}` };
      } catch (err: any) {
        if (err.name === 'TypeError' && err.message?.includes('Failed to fetch')) {
          return {
            ok: false,
            error: `CORS Blocked or Ollama Not Running. If running, start with: OLLAMA_ORIGINS="*" ollama serve`
          };
        }
        return { ok: false, error: err.message || 'Connection failed to Ollama' };
      }
    },

    async listModels(): Promise<string[]> {
      try {
        const rootUrl = cleanHost.replace(/\/v1$/, '');
        const res = await fetch(`${rootUrl}/api/tags`);
        if (!res.ok) return [selectedModel || 'llama3.2'];
        const data = await res.json();
        if (Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name).filter(Boolean);
        }
        return [selectedModel || 'llama3.2'];
      } catch {
        return [selectedModel || 'llama3.2'];
      }
    }
  };
}
