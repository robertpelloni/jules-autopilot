import axios from 'axios';
import { prisma } from '../lib/prisma';
import { broadcastToClients } from './index';

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMResult {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    latencyMs: number;
}

export function normalizeProvider(provider?: string): string {
    const value = (provider || '').trim().toLowerCase();
    return value === '' ? 'openai' : value;
}

export function resolveModel(provider: string, model?: string): string {
    const value = (model || '').trim();
    if (value !== '') return value;

    switch (normalizeProvider(provider)) {
        case 'lmstudio': return 'gemma-2b-it';
        case 'openrouter': return 'free';
        case 'anthropic': return 'claude-3-5-sonnet-latest';
        case 'gemini': return 'gemini-1.5-flash';
        default: return 'gpt-4o-mini';
    }
}

export function getSupervisorAPIKey(provider: string, explicit?: string | null): string {
    if (explicit && explicit !== 'placeholder' && explicit !== 'undefined' && explicit !== 'null') {
        return explicit.trim();
    }

    const envMap: Record<string, string[]> = {
        lmstudio: ['LMSTUDIO_API_KEY'],
        openrouter: ['OPENROUTER_API_KEY'],
        anthropic: ['ANTHROPIC_API_KEY'],
        gemini: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
        openai: ['OPENAI_API_KEY']
    };

    const keys = envMap[normalizeProvider(provider)] || ['OPENAI_API_KEY'];
    for (const key of keys) {
        const val = (process.env[key] || '').trim();
        if (val !== '') return val;
    }

    // Generic fallbacks
    const fallbacks = ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'];
    for (const key of fallbacks) {
        const val = (process.env[key] || '').trim();
        if (val !== '') return val;
    }

    return '';
}

export async function generateLLMText(
    provider: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: LLMMessage[]
): Promise<LLMResult> {
    const start = Date.now();
    provider = normalizeProvider(provider);
    model = resolveModel(provider, model);

    const requestMessages: any[] = [];
    if (systemPrompt.trim() !== '') {
        requestMessages.push({ role: 'system', content: systemPrompt });
    }
    requestMessages.push(...messages);

    let apiURL = 'https://api.openai.com/v1/chat/completions';
    if (provider === 'lmstudio') apiURL = 'http://localhost:1234/v1/chat/completions';
    else if (provider === 'openrouter') apiURL = 'https://openrouter.ai/api/v1/chat/completions';
    else if (provider === 'anthropic') apiURL = 'https://api.anthropic.com/v1/messages';
    else if (provider === 'gemini') apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
    } else if (provider !== 'gemini') {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://jules-autopilot.render.com';
        headers['X-Title'] = 'Jules Autopilot';
    }

    try {
        let response;
        if (provider === 'anthropic') {
            response = await axios.post(apiURL, {
                model,
                system: systemPrompt,
                max_tokens: 1200,
                messages: messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content }))
            }, { headers });

            return {
                content: response.data.content[0].text,
                usage: {
                    promptTokens: response.data.usage.input_tokens,
                    completionTokens: response.data.usage.output_tokens,
                    totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
                },
                latencyMs: Date.now() - start
            };
        } else if (provider === 'gemini') {
             response = await axios.post(apiURL, {
                contents: messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                })),
                systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
            }, { headers });

            const candidate = response.data.candidates[0];
            return {
                content: candidate.content.parts[0].text,
                usage: {
                    promptTokens: response.data.usageMetadata.promptTokenCount,
                    completionTokens: response.data.usageMetadata.candidatesTokenCount,
                    totalTokens: response.data.usageMetadata.totalTokenCount
                },
                latencyMs: Date.now() - start
            };
        } else {
            response = await axios.post(apiURL, {
                model,
                messages: requestMessages,
                temperature: 0.2
            }, { headers });

            return {
                content: response.data.choices[0].message.content,
                usage: {
                    promptTokens: response.data.usage.prompt_tokens,
                    completionTokens: response.data.usage.completion_tokens,
                    totalTokens: response.data.usage.total_tokens
                },
                latencyMs: Date.now() - start
            };
        }
    } catch (error: any) {
        console.error(`[LLM] Request failed (${provider}):`, error.response?.data || error.message);
        throw error;
    }
}
