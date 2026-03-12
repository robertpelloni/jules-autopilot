import { prisma } from '../lib/prisma';

/**
 * Session Differ
 * 
 * Compares two session timelines to identify behavioral differences.
 * Useful for A/B testing different models, prompts, or configurations
 * against the same task.
 */

export interface SessionDiffResult {
    sessionA: string;
    sessionB: string;
    eventCountA: number;
    eventCountB: number;
    durationDiffMs: number;
    errorDiffCount: number;
    uniqueEventTypesA: string[];
    uniqueEventTypesB: string[];
    commonEventTypes: string[];
    speedRatio: number; // > 1 means A is slower
    summary: string;
}

/**
 * Compare two session timelines and produce a diff report.
 */
export async function diffSessions(sessionIdA: string, sessionIdB: string): Promise<SessionDiffResult> {
    const [snapsA, snapsB] = await Promise.all([
        prisma.sessionSnapshot.findMany({
            where: { sessionId: sessionIdA },
            orderBy: { sequence: 'asc' }
        }),
        prisma.sessionSnapshot.findMany({
            where: { sessionId: sessionIdB },
            orderBy: { sequence: 'asc' }
        })
    ]);

    // Duration
    const durationA = snapsA.length >= 2
        ? new Date(snapsA[snapsA.length - 1]!.timestamp).getTime() - new Date(snapsA[0]!.timestamp).getTime()
        : 0;
    const durationB = snapsB.length >= 2
        ? new Date(snapsB[snapsB.length - 1]!.timestamp).getTime() - new Date(snapsB[0]!.timestamp).getTime()
        : 0;

    // Event types
    const typesA = new Set(snapsA.map(s => s.eventType));
    const typesB = new Set(snapsB.map(s => s.eventType));
    const commonTypes = [...typesA].filter(t => typesB.has(t));
    const uniqueA = [...typesA].filter(t => !typesB.has(t));
    const uniqueB = [...typesB].filter(t => !typesA.has(t));

    // Error counts
    const errorsA = snapsA.filter(s => s.eventType === 'error').length;
    const errorsB = snapsB.filter(s => s.eventType === 'error').length;

    const speedRatio = durationB > 0 ? durationA / durationB : 0;

    // Summary
    const faster = speedRatio > 1 ? 'B' : speedRatio < 1 ? 'A' : 'equal';
    const summary = [
        `Session A: ${snapsA.length} events in ${(durationA / 1000).toFixed(1)}s (${errorsA} errors)`,
        `Session B: ${snapsB.length} events in ${(durationB / 1000).toFixed(1)}s (${errorsB} errors)`,
        `Speed: ${faster === 'equal' ? 'Both equal' : `Session ${faster} was ${Math.abs(1 - speedRatio) * 100 | 0}% faster`}`,
        uniqueA.length > 0 ? `Only in A: ${uniqueA.join(', ')}` : null,
        uniqueB.length > 0 ? `Only in B: ${uniqueB.join(', ')}` : null
    ].filter(Boolean).join('\n');

    return {
        sessionA: sessionIdA,
        sessionB: sessionIdB,
        eventCountA: snapsA.length,
        eventCountB: snapsB.length,
        durationDiffMs: durationA - durationB,
        errorDiffCount: errorsA - errorsB,
        uniqueEventTypesA: uniqueA,
        uniqueEventTypesB: uniqueB,
        commonEventTypes: commonTypes,
        speedRatio,
        summary
    };
}
