import { AiProviderAdapter } from './types';
import { createOpenAiAdapter } from './openai';

export function createOllamaAdapter(host = 'http://localhost:11434', model = 'llama3.2'): AiProviderAdapter {
  const cleanHost = (host || 'http://localhost:11434').replace(/\/+$/, '');
  const baseUrl = cleanHost.endsWith('/v1') ? cleanHost : `${cleanHost}/v1`;

  const baseAdapter = createOpenAiAdapter({
    id: 'ollama',
    label: 'Ollama (Local)',
    baseUrl,
    model: model || 'llama3.2'
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
        if (!res.ok) return [model || 'llama3.2'];
        const data = await res.json();
        if (Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name).filter(Boolean);
        }
        return [model || 'llama3.2'];
      } catch {
        return [model || 'llama3.2'];
      }
    }
  };
}
