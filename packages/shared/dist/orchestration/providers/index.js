import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import { qwenProvider } from './qwen';
export const providers = {
    openai: openaiProvider,
    anthropic: anthropicProvider,
    gemini: geminiProvider,
    qwen: qwenProvider,
};
export function getProvider(name) {
    return providers[name];
}
export async function generateText({ provider, apiKey, model, messages }) {
    const aiProvider = getProvider(provider);
    if (!aiProvider) {
        throw new Error(`Unknown provider: ${provider}`);
    }
    const result = await aiProvider.complete({
        messages,
        apiKey,
        model
    });
    return result.content;
}
