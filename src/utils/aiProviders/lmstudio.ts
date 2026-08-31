import { AiProviderAdapter } from './types';
import { createOpenAiAdapter } from './openai';

export interface LmStudioConfig {
  host?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  contextLength?: number;
  gpuOffload?: string | number;
  cpuThreads?: number;
  extraBody?: Record<string, unknown>;
}

export function createLmStudioAdapter(
  configOrHost: string | LmStudioConfig = 'http://localhost:1234',
  model = 'local-model'
): AiProviderAdapter {
  const isObject = typeof configOrHost === 'object' && configOrHost !== null;
  const rawHost: string = isObject 
    ? (configOrHost.baseUrl || configOrHost.host || 'http://localhost:1234') 
    : (typeof configOrHost === 'string' ? configOrHost : 'http://localhost:1234');
  const selectedModel = isObject ? (configOrHost.model || model || 'local-model') : (model || 'local-model');

  const cleanHost = (rawHost || 'http://localhost:1234').replace(/\/+$/, '');
  const baseUrl = cleanHost.endsWith('/v1') ? cleanHost : `${cleanHost}/v1`;

  const temperature = isObject ? configOrHost.temperature : undefined;
  const maxTokens = isObject ? configOrHost.maxTokens : undefined;
  const topP = isObject ? configOrHost.topP : undefined;
  const contextLength = isObject ? configOrHost.contextLength : undefined;
  const gpuOffload = isObject ? configOrHost.gpuOffload : undefined;
  const cpuThreads = isObject ? configOrHost.cpuThreads : undefined;
  const extraBody = isObject ? configOrHost.extraBody : undefined;

  const baseAdapter = createOpenAiAdapter({
    id: 'lmstudio',
    label: 'LM Studio (Local)',
    baseUrl,
    model: selectedModel,
    temperature,
    maxTokens,
    topP,
    contextLength,
    gpuOffload,
    cpuThreads,
    extraBody
  });

  return {
    ...baseAdapter,

    async testConnection(): Promise<{ ok: boolean; error?: string }> {
      try {
        const res = await fetch(`${baseUrl}/models`);
        if (res.ok) return { ok: true };
        return { ok: false, error: `LM Studio returned status ${res.status}` };
      } catch (err: any) {
        if (err.name === 'TypeError' && err.message?.includes('Failed to fetch')) {
          return {
            ok: false,
            error: `Cannot connect to LM Studio. Make sure Local Server is started and "Enable CORS" is checked in LM Studio settings.`
          };
        }
        return { ok: false, error: err.message || 'Connection failed to LM Studio' };
      }
    }
  };
}
