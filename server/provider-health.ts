/**
 * Provider Health Monitor
 * 
 * Periodically checks the health of configured LLM providers
 * and marks unhealthy ones for the routing engine to avoid.
 */

import { prisma } from '../lib/prisma';
import { eventBus } from './event-bus';

export interface ProviderHealthStatus {
    providerId: string;
    healthy: boolean;
    latencyMs: number;
    lastCheckedAt: string;
    error?: string;
}

/**
 * Ping a provider's API to check availability.
 */
async function pingProvider(providerId: string, apiKey: string): Promise<ProviderHealthStatus> {
    const start = Date.now();
    const checkTime = new Date().toISOString();

    const endpoints: Record<string, string> = {
        openai: 'https://api.openai.com/v1/models',
        anthropic: 'https://api.anthropic.com/v1/messages',
        google: 'https://generativelanguage.googleapis.com/v1beta/models'
    };

    const url = endpoints[providerId];
    if (!url) {
        return { providerId, healthy: false, latencyMs: 0, lastCheckedAt: checkTime, error: 'Unknown provider' };
    }

    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (providerId === 'openai') headers['Authorization'] = `Bearer ${apiKey}`;
        else if (providerId === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        }

        const fetchUrl = providerId === 'google' ? `${url}?key=${apiKey}` : url;

        const res = await fetch(fetchUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000)
        });

        const latencyMs = Date.now() - start;
        return { providerId, healthy: res.ok || res.status === 405, latencyMs, lastCheckedAt: checkTime };
    } catch (err) {
        return {
            providerId, healthy: false, latencyMs: Date.now() - start,
            lastCheckedAt: checkTime,
            error: err instanceof Error ? err.message : String(err)
        };
    }
}

/**
 * Check health of all enabled providers for a workspace.
 */
export async function checkAllProviders(workspaceId: string): Promise<ProviderHealthStatus[]> {
    const providers = await prisma.providerConfig.findMany({
        where: { workspaceId, isEnabled: true, apiKey: { not: null } }
    });

    const results = await Promise.all(
        providers.map(p => pingProvider(p.providerId, p.apiKey!))
    );

    // Emit alerts for unhealthy providers
    const unhealthy = results.filter(r => !r.healthy);
    if (unhealthy.length > 0) {
        eventBus.emit('system', {
            type: 'provider_health_alert',
            data: {
                unhealthyCount: unhealthy.length,
                providers: unhealthy.map(u => u.providerId)
            }
        });
    }

    return results;
}
