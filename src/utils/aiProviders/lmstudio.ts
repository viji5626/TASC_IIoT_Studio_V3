import { AiProviderAdapter } from './types';
import { createOpenAiAdapter } from './openai';

export function createLmStudioAdapter(host = 'http://localhost:1234', model = 'local-model'): AiProviderAdapter {
  const cleanHost = (host || 'http://localhost:1234').replace(/\/+$/, '');
  const baseUrl = cleanHost.endsWith('/v1') ? cleanHost : `${cleanHost}/v1`;

  const baseAdapter = createOpenAiAdapter({
    id: 'lmstudio',
    label: 'LM Studio (Local)',
    baseUrl,
    model: model || 'local-model'
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
