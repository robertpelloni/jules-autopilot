import { ProviderInterface } from '../types';
import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import { qwenProvider } from './qwen';

export const providers: Record<string, ProviderInterface> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  qwen: qwenProvider,
};

export function getProvider(name: string): ProviderInterface | undefined {
  return providers[name];
}
