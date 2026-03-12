import { prisma } from '../lib/prisma';
import { emitSystemAlert } from './event-bus';

/**
 * Multi-Model Consensus Engine
 * 
 * For critical decisions (deployments, schema migrations, security-sensitive code),
 * query multiple LLM providers in parallel and only proceed if a quorum agrees.
 * 
 * This implements a "Roundtable" voting pattern:
 * 1. Send the same prompt to N providers.
 * 2. Parse each response for a clear verdict (approve/reject).
 * 3. Require a configurable quorum (default: majority) to pass.
 */

export interface ConsensusConfig {
    /** The prompt describing the decision to be made */
    prompt: string;
    /** System context for all models */
    systemPrompt?: string;
    /** Minimum number of 'approve' votes to pass (default: majority) */
    quorum?: number;
    /** Maximum time to wait for each provider response (ms) */
    timeoutMs?: number;
}

export interface ProviderVote {
    provider: string;
    model: string;
    verdict: 'approve' | 'reject' | 'abstain';
    reasoning: string;
    latencyMs: number;
}

export interface ConsensusResult {
    passed: boolean;
    votes: ProviderVote[];
    approveCount: number;
    rejectCount: number;
    quorumRequired: number;
}

/**
 * Queries a single provider and extracts a structured verdict.
 */
async function queryProvider(
    providerConfig: { providerId: string; apiKey: string },
    systemPrompt: string,
    userPrompt: string,
    timeoutMs: number
): Promise<ProviderVote> {
    const start = Date.now();
    const provider = providerConfig.providerId;

    // Map provider IDs to API endpoints and models
    const providerMap: Record<string, { url: string; model: string; authHeader: string }> = {
        'openai': {
            url: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
            authHeader: `Bearer ${providerConfig.apiKey}`
        },
        'anthropic': {
            url: 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-5-haiku-20241022',
            authHeader: providerConfig.apiKey || ''
        },
        'google': {
            url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
            model: 'gemini-2.0-flash',
            authHeader: providerConfig.apiKey || ''
        }
    };

    const config = providerMap[provider];
    if (!config) {
        return { provider, model: 'unknown', verdict: 'abstain', reasoning: 'Provider not configured', latencyMs: Date.now() - start };
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        let response: Response;
        let content = '';

        if (provider === 'openai') {
            response = await fetch(config.url, {
                method: 'POST',
                headers: { 'Authorization': config.authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                }),
                signal: controller.signal
            });
            const data = await response.json();
            content = data.choices?.[0]?.message?.content || '';
        } else if (provider === 'anthropic') {
            response = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'x-api-key': providerConfig.apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 1024,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }]
                }),
                signal: controller.signal
            });
            const data = await response.json();
            content = data.content?.[0]?.text || '';
        } else {
            // Google — simplified
            response = await fetch(`${config.url}?key=${providerConfig.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
                }),
                signal: controller.signal
            });
            const data = await response.json();
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        clearTimeout(timeout);

        // Parse the verdict from the response
        try {
            const parsed = JSON.parse(content);
            return {
                provider,
                model: config.model,
                verdict: parsed.verdict === 'approve' ? 'approve' : parsed.verdict === 'reject' ? 'reject' : 'abstain',
                reasoning: parsed.reasoning || 'No reasoning provided',
                latencyMs: Date.now() - start
            };
        } catch {
            // Try to extract verdict from freeform text
            const lower = content.toLowerCase();
            const verdict = lower.includes('approve') ? 'approve' : lower.includes('reject') ? 'reject' : 'abstain';
            return { provider, model: config.model, verdict, reasoning: content.substring(0, 500), latencyMs: Date.now() - start };
        }
    } catch (err) {
        return {
            provider,
            model: config?.model || 'unknown',
            verdict: 'abstain',
            reasoning: `Error: ${err instanceof Error ? err.message : String(err)}`,
            latencyMs: Date.now() - start
        };
    }
}

/**
 * Run a multi-model consensus vote.
 * Queries all enabled providers for a workspace and collects votes.
 */
export async function runConsensus(
    workspaceId: string,
    config: ConsensusConfig
): Promise<ConsensusResult> {
    const providers = await prisma.providerConfig.findMany({
        where: { workspaceId, isEnabled: true, apiKey: { not: null } }
    });

    if (providers.length === 0) {
        return { passed: false, votes: [], approveCount: 0, rejectCount: 0, quorumRequired: 1 };
    }

    const quorum = config.quorum ?? Math.ceil(providers.length / 2);
    const timeoutMs = config.timeoutMs ?? 15000;

    const systemPrompt = config.systemPrompt || `You are a code review agent participating in a consensus vote. Analyze the proposal and respond with a JSON object containing:
- "verdict": "approve" or "reject"  
- "reasoning": brief explanation of your decision

Be strict about security, correctness, and architectural compliance.`;

    const userPrompt = config.prompt;

    // Query all providers in parallel
    const votePromises = providers.map(p =>
        queryProvider(
            { providerId: p.providerId, apiKey: p.apiKey! },
            systemPrompt,
            userPrompt,
            timeoutMs
        )
    );

    const votes = await Promise.all(votePromises);

    const approveCount = votes.filter(v => v.verdict === 'approve').length;
    const rejectCount = votes.filter(v => v.verdict === 'reject').length;
    const passed = approveCount >= quorum;

    // Emit event for dashboard
    if (!passed) {
        emitSystemAlert('warning', `Consensus vote FAILED (${approveCount}/${quorum} required). Rejections: ${rejectCount}`);
    }

    return { passed, votes, approveCount, rejectCount, quorumRequired: quorum };
}
