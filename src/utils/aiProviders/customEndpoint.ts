import { AiProviderAdapter } from './types';
import { createOpenAiAdapter } from './openai';

export interface CustomEndpointConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  extraBodyJson?: string;
}

export function createCustomAdapter(config: CustomEndpointConfig): AiProviderAdapter {
  let parsedExtraBody: Record<string, unknown> | undefined = undefined;
  if (config.extraBodyJson) {
    try {
      parsedExtraBody = JSON.parse(config.extraBodyJson);
    } catch {}
  }

  return createOpenAiAdapter({
    id: 'custom',
    label: 'Custom OpenAI-Compatible API',
    baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    apiKey: config.apiKey,
    model: config.model || 'default',
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    extraBody: parsedExtraBody
  });
}
