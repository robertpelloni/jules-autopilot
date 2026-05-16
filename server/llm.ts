import axios from 'axios';
import { prisma } from '../lib/prisma/index.ts';
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
    return 'openrouter';
}

export function resolveModel(provider: string, model?: string): string {
    const value = (model || '').trim();
    if (value !== '' && value !== 'gpt-4o' && value !== 'gpt-4o-mini') return value;
    return 'google/gemma-3-27b-it:free';
}

export function getSupervisorAPIKey(provider: string, explicit?: string | null): string {
    if (explicit && explicit !== 'placeholder' && explicit !== 'undefined' && explicit !== 'null') {
        return explicit.trim();
    }

    return (process.env.OPENROUTER_API_KEY || '').trim();
}

export async function generateLLMText(
    provider: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: LLMMessage[]
): Promise<LLMResult> {
    const start = Date.now();
    provider = 'openrouter';
    model = resolveModel(provider, model);

    const requestMessages: any[] = [];
    if (systemPrompt.trim() !== '') {
        requestMessages.push({ role: 'system', content: systemPrompt });
    }
    requestMessages.push(...messages);

    const apiURL = 'https://openrouter.ai/api/v1/chat/completions';

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jules-autopilot.render.com',
        'X-Title': 'Jules Autopilot'
    };

    try {
        const response = await axios.post(apiURL, {
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
    } catch (error: any) {
        console.error(`[LLM] Request failed (${provider}):`, error.response?.data || error.message);
        throw error;
    }
}
