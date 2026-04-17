import { prisma } from '../lib/prisma/index.ts';
import { JulesClient } from '../lib/jules/client';
import { nudgeRequestQueue } from '../lib/jules/request-queue';
import { broadcastToClients, emitDaemonEvent } from './index';
import { superviseSession } from './supervisor';

// ─── Shared helpers ───────────────────────────────────────────────

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        const onAbort = () => { clearTimeout(timer); resolve(); };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

async function pruneOldLogs() {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // keep last 24h
        const result = await prisma.keeperLog.deleteMany({
            where: { createdAt: { lt: cutoff } }
        });
        if (result.count > 0) {
            console.log(`[Daemon] Pruned ${result.count} old log entries`);
        }
    } catch {}
}

/** Fisher-Yates shuffle — randomizes order so every session gets a fair turn */
function shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function getAllSessions(client: JulesClient): Promise<any[]> {
    return client.listSessions();
}

// ─── Daemon — owns both loops ─────────────────────────────────────

export class Daemon {
    isRunning = false;
    private abort = new AbortController();
    private autopilotPromise: Promise<void> | null = null;
    private supervisorPromise: Promise<void> | null = null;

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.abort = new AbortController();
        console.log('[Daemon] Starting autopilot + supervisor loops in parallel...');
        this.autopilotPromise = this.autopilotLoop();
        this.supervisorPromise = this.supervisorLoop();
    }

    stop() {
        this.isRunning = false;
        this.abort.abort();
        console.log('[Daemon] Stopped.');
    }

    async forceBump() {
        console.log('[Daemon] Force bump — restarting both loops');
        this.stop();
        await sleep(300);
        await this.start();
    }

    // ─── Autopilot: generic nudge every N seconds ────────────────

    private async autopilotLoop() {
        let cycle = 0;
        while (this.isRunning) {
            cycle++;
            try {
                const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
                if (!settings || !settings.isEnabled) {
                    await sleep(30000, this.abort.signal);
                    continue;
                }

                const client = this.makeAutopilotClient(settings);
                if (!client) { await sleep(60000, this.abort.signal); continue; }

                const active = await getAllSessions(client);
                shuffleArray(active);
                console.log(`[Autopilot] #${cycle}: ${active.length} sessions (shuffled)`);

                if (cycle % 5 === 1) await pruneOldLogs();

                if (active.length === 0) {
                    await prisma.keeperLog.create({
                        data: { type: 'heartbeat', message: `[Autopilot] #${cycle}: No sessions found.`, metadata: '{}' }
                    }).catch(() => {});
                }

                for (const session of active) {
                    if (!this.isRunning) break;
                    await this.nudgeSession(client, session, settings);
                    // Short pause — autopilot is lightweight, just sending a message
                    await sleep(2_000, this.abort.signal);
                }

                broadcastToClients({ type: 'autopilot_cycle', cycle, active: active.length });
            } catch (err: any) {
                console.error(`[Autopilot] #${cycle} error: ${err.message}`);
            }

            const s = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
            const interval = (s?.checkIntervalSeconds || 900) * 1000;
            await sleep(interval, this.abort.signal);
        }
    }

    private async nudgeSession(client: JulesClient, session: any, settings: any): Promise<void> {
        let messages: string[] = [
            "Please continue working on this task.",
            "Keep going, you're doing great!",
            "What's the next step? Please proceed.",
        ];
        try {
            const parsed = settings.customMessages ? JSON.parse(settings.customMessages) : null;
            if (Array.isArray(parsed) && parsed.length > 0) messages = parsed;
        } catch {}
        try {
            const parsed = settings.messages ? JSON.parse(settings.messages) : null;
            if (Array.isArray(parsed) && parsed.length > 0) messages = [...messages, ...parsed];
        } catch {}

        const message = messages[Math.floor(Math.random() * messages.length)];
        const title = session.title || session.id?.slice(0, 8) || 'unknown';

        try {
            await client.createActivity({ sessionId: session.id, content: message });
            console.log(`[Autopilot] ✓ Nudged "${title?.slice(0, 40)}" (${session.id?.slice(0, 8)})`);
            emitDaemonEvent('activities_updated', { sessionId: session.id });
        } catch (err: any) {
            const is429 = err.status === 429 || String(err.message).includes('429');
            if (is429) {
                console.warn(`[Autopilot] Rate limited on ${session.id?.slice(0, 8)} — cooling down 60s`);
                await sleep(60_000, this.abort.signal);
            } else {
                console.warn(`[Autopilot] Failed to nudge ${session.id?.slice(0, 8)}: ${err.message}`);
            }
        }
    }

    // ─── Supervisor: intelligent LLM direction every N seconds ───

    private async supervisorLoop() {
        let cycle = 0;
        while (this.isRunning) {
            cycle++;
            try {
                const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
                if (!settings || !settings.isEnabled || !settings.smartPilotEnabled) {
                    await sleep(60000, this.abort.signal);
                    continue;
                }

                const client = this.makeClient(settings);
                if (!client) { await sleep(60000, this.abort.signal); continue; }

                const allActive = await getAllSessions(client);
                shuffleArray(allActive);
                // Only supervise a subset each cycle — half, minimum 5, max 15
                // This leaves API quota for the autopilot nudges
                const batchSize = Math.min(15, Math.max(5, Math.ceil(allActive.length / 2)));
                const active = allActive.slice(0, batchSize);
                console.log(`[Supervisor] #${cycle}: processing ${active.length}/${allActive.length} sessions`);

                for (const session of active) {
                    if (!this.isRunning) break;

                    let refreshed;
                    try {
                        refreshed = await client.getSession(session.id);
                    } catch (err: any) {
                        console.warn(`[Supervisor] Can't refresh ${session.id?.slice(0, 8)}: ${err.message}`);
                        await sleep(5000, this.abort.signal);
                        continue;
                    }

                    const lastActivity = refreshed.lastActivityAt
                        ? new Date(refreshed.lastActivityAt)
                        : new Date(refreshed.updatedAt);
                    const inactiveMinutes = Math.round((Date.now() - lastActivity.getTime()) / 60000);

                    try {
                        const { guidance, submitted } = await superviseSession(
                            client,
                            session.id,
                            refreshed.title || session.title || '',
                            refreshed.rawState || session.rawState || 'UNKNOWN',
                            refreshed.sourceId || session.sourceId || '',
                            inactiveMinutes
                        );

                        if (submitted) {
                            await prisma.keeperLog.create({
                                data: {
                                    sessionId: session.id,
                                    type: 'action',
                                    message: `[Supervisor] Directed "${(refreshed.title || '').slice(0, 30)}": ${guidance.slice(0, 100)}`,
                                    metadata: JSON.stringify({ event: 'supervisor_directed', model: 'rotating' })
                                }
                            }).catch(() => {});
                        }
                    } catch (err: any) {
                        const is429 = err.status === 429 || String(err.message).includes('429');
                        console.warn(`[Supervisor] ${is429 ? 'Rate limited' : 'Failed'} for ${session.id?.slice(0, 8)}: ${err.message}`);
                        if (is429) {
                            await sleep(45_000, this.abort.signal);
                        }
                    }

                    // 10s between supervisor calls
                    await sleep(5_000, this.abort.signal);
                }

                broadcastToClients({ type: 'supervisor_cycle', cycle, active: active.length });
            } catch (err: any) {
                console.error(`[Supervisor] #${cycle} error: ${err.message}`);
            }

            const s = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
            const interval = (s?.checkIntervalSeconds || 900) * 1000;
            await sleep(interval, this.abort.signal);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────

    private makeAutopilotClient(settings: any): JulesClient | null {
        const apiKey = process.env.JULES_API_KEY || settings.julesApiKey;
        if (!apiKey || apiKey === 'placeholder') return null;
        return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha', undefined, nudgeRequestQueue);
    }

    private makeClient(settings: any): JulesClient | null {
        const apiKey = process.env.JULES_API_KEY || settings.julesApiKey;
        if (!apiKey || apiKey === 'placeholder') return null;
        return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
    }
}

export const globalDaemon = new Daemon();

export function startDaemon() { globalDaemon.start(); }
export function stopDaemon() { globalDaemon.stop(); }
export function forceBump() { return globalDaemon.forceBump(); }
