import { prisma } from '../lib/prisma';
import { JulesClient } from '../lib/jules/client';
import { emitDaemonEvent } from './index';
import type { KeeperSettings } from '@prisma/client';
import { orchestratorQueue } from './queue';

let isRunning = false;
let checkTimeout: ReturnType<typeof setTimeout> | null = null;

async function getJulesClient(settings: KeeperSettings) {
    const apiKey = settings.julesApiKey || process.env.JULES_API_KEY;
    if (!apiKey) return null;
    return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
}

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

        const sessions = await client.listSessions();
        let queuedCount = 0;

        for (const session of sessions) {
            try {
                await orchestratorQueue.add('check_session', { session, settings });
                queuedCount++;
            } catch (err) {
                console.error(`[Daemon] Failed to enqueue session ${session.id}`, err);
            }
        }

        if (queuedCount > 0) {
            console.log(`[Daemon] Enqueued ${queuedCount} session jobs to SQLite queue.`);
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
