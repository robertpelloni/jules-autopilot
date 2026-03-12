import { prisma } from '../lib/prisma';
import { eventBus } from './event-bus';

/**
 * Shadow Pilot Mode
 * 
 * An observe-only agent mode that watches active sessions without intervening.
 * Records observations (patterns, mistakes, opportunities) for later review.
 * Think of it as a "ride-along" mode where the AI learns from actual human+agent
 * interactions to improve future autonomous behavior.
 * 
 * Use cases:
 * - Training data collection for fine-tuning
 * - Quality assurance monitoring
 * - Pattern recognition for workflow automation suggestions
 */

export interface ShadowObservation {
    sessionId: string;
    observationType: 'pattern' | 'mistake' | 'opportunity' | 'insight';
    description: string;
    confidence: number; // 0-1
    suggestedAction?: string;
}

/**
 * Analyze the most recent session activity and produce shadow observations.
 * Uses the existing SessionSnapshot model to read the event stream.
 */
export async function observeSession(sessionId: string): Promise<ShadowObservation[]> {
    const snapshots = await prisma.sessionSnapshot.findMany({
        where: { sessionId },
        orderBy: { sequence: 'asc' },
        take: 50
    });

    if (snapshots.length === 0) return [];

    const observations: ShadowObservation[] = [];

    // Pattern detection: Repeated error → retry loops
    const errorSnapshots = snapshots.filter(s => s.eventType === 'error' || s.content.toLowerCase().includes('error'));
    if (errorSnapshots.length >= 3) {
        observations.push({
            sessionId,
            observationType: 'pattern',
            description: `Detected ${errorSnapshots.length} error events — possible retry loop or persistent failure.`,
            confidence: 0.8,
            suggestedAction: 'Consider adding error-specific handling or escalating to a different model.'
        });
    }

    // Opportunity detection: Long gaps between events
    for (let i = 1; i < snapshots.length; i++) {
        const gap = new Date(snapshots[i]!.timestamp).getTime() - new Date(snapshots[i - 1]!.timestamp).getTime();
        if (gap > 120000) { // 2+ minute gap
            observations.push({
                sessionId,
                observationType: 'opportunity',
                description: `${Math.round(gap / 1000)}s idle gap between events ${snapshots[i - 1]!.sequence} and ${snapshots[i]!.sequence}.`,
                confidence: 0.6,
                suggestedAction: 'This idle time could be used for parallel task dispatch.'
            });
        }
    }

    // Insight: Session completion patterns
    const completeEvents = snapshots.filter(s => s.eventType === 'complete' || s.eventType === 'done');
    if (completeEvents.length > 0) {
        const totalDuration = new Date(snapshots[snapshots.length - 1]!.timestamp).getTime() - new Date(snapshots[0]!.timestamp).getTime();
        observations.push({
            sessionId,
            observationType: 'insight',
            description: `Session completed in ${Math.round(totalDuration / 1000)}s across ${snapshots.length} events.`,
            confidence: 0.9
        });
    }

    // Emit observations to the event bus for real-time dashboard updates
    if (observations.length > 0) {
        eventBus.emit('shadow', {
            type: 'shadow_observations',
            data: { sessionId, count: observations.length, observations }
        });
    }

    return observations;
}

/**
 * Run shadow observation across all currently active sessions.
 * Called periodically by the scheduler or manually via API.
 */
export async function runShadowSweep(): Promise<{ sessionsObserved: number; totalObservations: number }> {
    // Get distinct sessionIds from recent snapshots (last hour)
    const recentThreshold = new Date(Date.now() - 3600_000);
    const recentSnapshots = await prisma.sessionSnapshot.findMany({
        where: { timestamp: { gte: recentThreshold } },
        select: { sessionId: true },
        distinct: ['sessionId']
    });

    let totalObservations = 0;

    for (const snap of recentSnapshots) {
        const observations = await observeSession(snap.sessionId);
        totalObservations += observations.length;
    }

    return { sessionsObserved: recentSnapshots.length, totalObservations };
}
