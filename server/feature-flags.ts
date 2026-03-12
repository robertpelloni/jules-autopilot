/**
 * Feature Flags & System Config
 * 
 * Dynamic runtime configuration for the Jules Autopilot system.
 * Allows enabling/disabling features without restarting the daemon.
 * Backed by the database (SystemMetric or similar generic key-value).
 */

import { prisma } from '../lib/prisma';
import { eventBus } from './event-bus';

export interface FeatureFlags {
    enableShadowPilot: boolean;
    enableConsensusVoting: boolean;
    enableAutoScaling: boolean;
    enableWebhooks: boolean;
    enableCodeCompliance: boolean;
    strictMode: boolean;
    debugLogging: boolean;
    maxConcurrentSessions: number;
}

const DEFAULT_FLAGS: FeatureFlags = {
    enableShadowPilot: false,
    enableConsensusVoting: true,
    enableAutoScaling: false,
    enableWebhooks: true,
    enableCodeCompliance: true,
    strictMode: false,
    debugLogging: false,
    maxConcurrentSessions: 5
};

// In-memory cache
let flagsCache: FeatureFlags | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60000;

/**
 * Get current feature flags (uses in-memory cache).
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
    const now = Date.now();
    if (flagsCache && (now - lastFetch < CACHE_TTL_MS)) {
        return flagsCache;
    }

    try {
        // Use SystemMetric as a generic key-value store for flags
        const record = await prisma.systemMetric.findFirst({
            where: { type: 'system_feature_flags' }
        });

        if (record && record.metadata) {
            const parsed = JSON.parse(record.metadata);
            flagsCache = { ...DEFAULT_FLAGS, ...parsed };
        } else {
            flagsCache = { ...DEFAULT_FLAGS };
        }
        lastFetch = now;
        return flagsCache!;
    } catch {
        // Fallback to defaults on DB error
        return DEFAULT_FLAGS;
    }
}

/**
 * Update feature flags.
 */
export async function updateFeatureFlags(updates: Partial<FeatureFlags>): Promise<FeatureFlags> {
    const current = await getFeatureFlags();
    const merged = { ...current, ...updates };

    const record = await prisma.systemMetric.findFirst({
        where: { type: 'system_feature_flags' }
    });

    if (record) {
        await prisma.systemMetric.update({
            where: { id: record.id },
            data: { metadata: JSON.stringify(merged) }
        });
    } else {
        await prisma.systemMetric.create({
            data: {
                type: 'system_feature_flags',
                value: 1,
                metadata: JSON.stringify(merged)
            }
        });
    }

    // Invalidate cache immediately
    flagsCache = merged;
    lastFetch = Date.now();

    // Emit event
    eventBus.emit('system', { type: 'feature_flags_updated', data: merged });

    return merged;
}

/**
 * Check if a specific boolean flag is enabled.
 */
export async function isFeatureEnabled(flagName: keyof FeatureFlags): Promise<boolean> {
    const flags = await getFeatureFlags();
    return Boolean(flags[flagName]);
}
