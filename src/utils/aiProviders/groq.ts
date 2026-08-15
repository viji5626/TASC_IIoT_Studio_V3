import { AiProviderAdapter } from './types';
import { createOpenAiAdapter } from './openai';

export function createGroqAdapter(apiKey: string, model = 'llama-3.3-70b-versatile'): AiProviderAdapter {
  return createOpenAiAdapter({
    id: 'groq',
    label: 'Groq Cloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey,
    model: model || 'llama-3.3-70b-versatile'
  });
}
