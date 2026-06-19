import { geminiProvider } from './gemini';
export const providers = {
    openrouter: {
        id: 'openrouter',
        async complete({ messages, apiKey, model }) {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://jules-autopilot.local',
                    'X-Title': 'Jules Autopilot',
                },
                body: JSON.stringify({
                    model: model || 'google/gemma-3-27b-it:free',
                    messages,
                }),
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenRouter error ${response.status}: ${err}`);
            }
            const data = await response.json();
            return { content: data.choices[0].message.content };
        },
        async listModels() { return []; }
    },
    gemini: geminiProvider,
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
