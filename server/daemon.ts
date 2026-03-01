import { prisma } from '../lib/prisma.ts';
import { JulesClient } from '../lib/jules/client.ts';
import { getProvider } from '@jules/shared';
import { emitDaemonEvent } from './index.ts';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import type { KeeperSettings } from '@prisma/client';
import { orchestratorQueue } from './queue.ts';

let isRunning = false;
let checkTimeout: ReturnType<typeof setTimeout> | null = null;

async function getJulesClient(settings: KeeperSettings) {
    const apiKey = settings.julesApiKey || process.env.JULES_API_KEY;
    if (!apiKey) return null;
    return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
}

const execAsync = promisify(exec);

export async function addLog(message: string, type: 'info' | 'action' | 'error' | 'skip', sessionId: string = 'global', details?: unknown) {
    console.log(`[Daemon][${type.toUpperCase()}] ${message}`);
    const log = await prisma.keeperLog.create({
        data: {
            message,
            type,
            sessionId,
            metadata: details ? JSON.stringify(details) : null
        }
    });

    // Broadcast log to WebSocket clients
    emitDaemonEvent('log_added', { log });
}

export async function getSupervisorState(sessionId: string) {
    const state = await prisma.supervisorState.findUnique({ where: { sessionId } });
    if (state) {
        return {
            ...state,
            history: state.history ? JSON.parse(state.history) : []
        };
    }
    return {
        sessionId,
        lastProcessedActivityTimestamp: null,
        history: [],
        openaiThreadId: null,
        openaiAssistantId: null
    };
}

export async function saveSupervisorState(state: {
    sessionId: string;
    lastProcessedActivityTimestamp: string | null;
    history: { role: string; content: string }[];
    openaiThreadId: string | null;
    openaiAssistantId: string | null;
}) {
    await prisma.supervisorState.upsert({
        where: { sessionId: state.sessionId },
        update: {
            lastProcessedActivityTimestamp: state.lastProcessedActivityTimestamp,
            history: JSON.stringify(state.history),
            openaiThreadId: state.openaiThreadId,
            openaiAssistantId: state.openaiAssistantId
        },
        create: {
            sessionId: state.sessionId,
            lastProcessedActivityTimestamp: state.lastProcessedActivityTimestamp,
            history: JSON.stringify(state.history),
            openaiThreadId: state.openaiThreadId,
            openaiAssistantId: state.openaiAssistantId
        }
    });
}

export async function runLoop() {
    if (isRunning) return;
    isRunning = true;

    try {
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings || !settings.isEnabled) {
            isRunning = false;
            return;
        }

        const client = await getJulesClient(settings);
        if (!client) {
            await addLog('Daemon enabled but no Jules API key found.', 'error');
            isRunning = false;
            return;
        }

        // --- Shadow Pilot Watcher ---
        if (settings.shadowPilotEnabled) {
            try {
                const { stdout: diff } = await execAsync('git diff');
                const lastScannedHash = settings.lastShadowPilotCommit || '';

                const diffHash = diff.length > 0 ? crypto.createHash('md5').update(diff).digest('hex') : '';

                // Only scan if there are uncommitted changes and we haven't already scanned this exact diff
                if (diff.trim().length > 20 && lastScannedHash !== diffHash) {
                    await addLog(`Shadow Pilot analyzing local diff (${diff.length} bytes)`, 'info');
                    const p = getProvider(settings.supervisorProvider);
                    if (p) {
                        const result = await p.complete({
                            messages: [{ role: 'user', content: `Review this local git diff for CRITICAL vulnerabilities, exposed secrets, destructive queries, or glaring fatal bugs. If it is safe or only contains minor issues, reply EXACTLY with the word "SAFE". If there is a severe problem, reply with a concise 1-sentence warning stating the exact problem:\n\n${diff.substring(0, 10000)}` }],
                            apiKey: settings.supervisorApiKey || process.env.OPENAI_API_KEY || "",
                            model: settings.supervisorModel,
                            systemPrompt: 'You are the Shadow Pilot. Protect the engineer from committing catastrophic code to version control. Only flag severe anomalies (secrets, structural breaks). Do not nitpick stylistic choices or logic unless it is fundamentally broken.'
                        });

                        const response = result.content.trim();
                        if (response !== 'SAFE' && !response.includes('SAFE')) {
                            await addLog(`Shadow Pilot detected severe anomaly: ${response}`, 'error');
                            emitDaemonEvent('shadow_pilot_alert', {
                                severity: 'critical',
                                message: response,
                                diffSnippet: diff.substring(0, 500)
                            });
                        }

                        await prisma.keeperSettings.update({
                            where: { id: 'default' },
                            data: { lastShadowPilotCommit: diffHash }
                        });
                    }
                }
            } catch (e) {
                console.error("[Daemon][Shadow Pilot] Error analyzing diff:", e);
                // Ignore git diff errors silently to not disrupt the core daemon
            }
        }
        // -----------------------------

        // --- Swarm Orchestrator ---
        const activeSwarms = await prisma.agentSwarm.findMany({
            where: { status: 'running' }
        });

        for (const swarm of activeSwarms) {
            try {
                // Enqueue a job to check for and dispatch pending sub-tasks
                await orchestratorQueue.add('dispatch_swarm_tasks', { swarmId: swarm.id }, {
                    jobId: `swarm-dispatch-${swarm.id}-${Date.now()}`,
                    removeOnComplete: true
                });
            } catch (err) {
                console.error(`[Daemon] Failed to enqueue swarm dispatch for ${swarm.id}`, err);
            }
        }
        // ---------------------------

        const sessions = await client.listSessions();
        let queuedCount = 0;

        for (const session of sessions) {
            try {
                await orchestratorQueue.add('process_session_state', { session, settings }, {
                    jobId: `session-${session.id}-${Date.now()}`,
                    removeOnComplete: true,
                    removeOnFail: 100 // Keep last 100 failed jobs for debugging
                });
                queuedCount++;
            } catch (err) {
                console.error(`[Daemon] Failed to enqueue session ${session.id}`, err);
            }
        }

        if (queuedCount > 0 || activeSwarms.length > 0) {
            console.log(`[Daemon] Enqueued ${queuedCount} session jobs and ${activeSwarms.length} swarm jobs to BullMQ.`);
        }

    } catch (error) {
        await addLog(`Daemon error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
        isRunning = false;
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        const interval = (settings?.checkIntervalSeconds || 30) * 1000;
        checkTimeout = setTimeout(runLoop, interval);
    }
}

export function startDaemon() {
    console.log('[Daemon] Starting background monitoring loop...');
    runLoop();
}

export function stopDaemon() {
    if (checkTimeout) {
        clearTimeout(checkTimeout);
        checkTimeout = null;
    }
    console.log('[Daemon] Stopped.');
}
