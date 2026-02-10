import { openaiProvider } from './openai.js';
import { anthropicProvider } from './anthropic.js';
import { geminiProvider } from './gemini.js';
import { qwenProvider } from './qwen.js';
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
