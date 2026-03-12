/**
 * Provider Fallback Chain
 * 
 * When a primary LLM provider fails, automatically fall through to
 * the next provider in the chain. Integrates with the circuit breaker
 * and provider health monitor.
 */

import { prisma } from '../lib/prisma';
import { withRetry, RETRY_POLICIES } from '../lib/retry-policy';
import { emitSystemAlert } from './event-bus';

export interface FallbackResult {
    provider: string;
    model: string;
    output: string;
    fallbackUsed: boolean;
    attemptedProviders: string[];
    latencyMs: number;
}

interface ProviderEntry {
    providerId: string;
    apiKey: string;
    priority: number;
}

/**
 * Execute a prompt with automatic provider fallback.
 * Tries providers in priority order, falling back on failure.
 */
export async function executeWithFallback(
    workspaceId: string,
    prompt: string,
    systemPrompt?: string
): Promise<FallbackResult> {
    const start = Date.now();

    // Get providers ordered by priority (lower = preferred)
    const providers = await prisma.providerConfig.findMany({
        where: { workspaceId, isEnabled: true, apiKey: { not: null } },
        orderBy: { priority: 'asc' }
    });

    if (providers.length === 0) {
        throw new Error('No enabled providers configured');
    }

    const attemptedProviders: string[] = [];

    for (const provider of providers) {
        attemptedProviders.push(provider.providerId);

        const result = await withRetry(
            () => callProvider(provider.providerId, provider.apiKey!, prompt, systemPrompt),
            RETRY_POLICIES.fast
        );

        if (result.success && result.result) {
            const fallbackUsed = attemptedProviders.length > 1;
            if (fallbackUsed) {
                emitSystemAlert('info', `Fallback: ${attemptedProviders[0]} → ${provider.providerId}`);
            }

            return {
                provider: provider.providerId,
                model: result.result.model,
                output: result.result.content,
                fallbackUsed,
                attemptedProviders,
                latencyMs: Date.now() - start
            };
        }
    }

    throw new Error(`All providers failed: ${attemptedProviders.join(', ')}`);
}

async function callProvider(
    providerId: string,
    apiKey: string,
    prompt: string,
    systemPrompt?: string
): Promise<{ model: string; content: string }> {
    if (providerId === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
                    { role: 'user' as const, content: prompt }
                ]
            }),
            signal: AbortSignal.timeout(20000)
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}`);
        const data = await res.json();
        return { model: 'gpt-4o-mini', content: data.choices?.[0]?.message?.content || '' };
    }

    if (providerId === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 1024,
                ...(systemPrompt ? { system: systemPrompt } : {}),
                messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(20000)
        });
        if (!res.ok) throw new Error(`Anthropic ${res.status}`);
        const data = await res.json();
        return { model: 'claude-3-5-haiku-20241022', content: data.content?.[0]?.text || '' };
    }

    if (providerId === 'google') {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }] }]
                }),
                signal: AbortSignal.timeout(20000)
            }
        );
        if (!res.ok) throw new Error(`Google ${res.status}`);
        const data = await res.json();
        return { model: 'gemini-2.0-flash', content: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
    }

    throw new Error(`Unknown provider: ${providerId}`);
}
