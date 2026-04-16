import { prisma } from '../lib/prisma/index.ts';
import { JulesClient } from '../lib/jules/client';
import { broadcastToClients, emitDaemonEvent } from './index';

export class Daemon {
    private isRunning = false;
    private timer: NodeJS.Timeout | null = null;
    private tickCount = 0;

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.tickCount = 0;
        console.log('[Daemon] Starting background monitoring loop...');
        // Immediately run the first tick
        this.tick();
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log('[Daemon] Stopped.');
    }

    /**
     * Force an immediate bump cycle regardless of the timer.
     * Called when supervisor is toggled on or sessions load.
     */
    async forceBump() {
        console.log('[Daemon] Force bump triggered');
        // Cancel any pending timer
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        // Only tick if not already running
        if (!this.isRunning) {
            this.isRunning = true;
            this.tickCount = 0;
        }
        await this.tick();
    }

    private async tick() {
        if (!this.isRunning) return;
        this.tickCount++;

        try {
            const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
            if (!settings || !settings.isEnabled) {
                this.scheduleNext(settings?.checkIntervalSeconds || 900);
                return;
            }

            const client = await this.getJulesClient(settings);
            if (!client) {
                console.warn('[Daemon] Enabled but no Jules API key found.');
                this.scheduleNext(settings.checkIntervalSeconds);
                return;
            }

            // Clean up old completed/failed jobs
            try {
                const deleted = await prisma.queueJob.deleteMany({
                    where: { status: { in: ['completed', 'failed'] } }
                });
                if (deleted.count > 0) {
                    console.log(`[Daemon] Cleaned up ${deleted.count} old queue jobs.`);
                }
            } catch {}

            const sessions = await client.listSessions();

            // Don't pile up jobs — check how many are still pending
            const pendingCount = await prisma.queueJob.count({
                where: { status: { in: ['pending', 'processing'] } }
            });

            if (pendingCount > 5) {
                console.log(`[Daemon] ${pendingCount} jobs still in queue, skipping this tick.`);
                await prisma.keeperLog.create({
                    data: {
                        type: 'heartbeat',
                        message: `Tick #${this.tickCount}: Skipped — ${pendingCount} jobs still queued.`,
                        metadata: JSON.stringify({ event: 'daemon_tick_skipped', tick: this.tickCount, pendingCount })
                    }
                });
                this.scheduleNext(settings.checkIntervalSeconds);
                return;
            }

            // Queue ALL sessions — no status filtering
            let queuedSessions = 0;
            const now = new Date();

            for (const session of sessions) {
                await prisma.queueJob.create({
                    data: {
                        type: 'check_session',
                        payload: JSON.stringify({ session }),
                        runAt: now,
                    }
                });
                queuedSessions++;
            }

            const logMessage = queuedSessions > 0
                ? `Tick #${this.tickCount}: Queued ${queuedSessions} sessions for supervisor.`
                : `Tick #${this.tickCount}: No sessions found.`;

            await prisma.keeperLog.create({
                data: {
                    type: queuedSessions > 0 ? 'info' : 'heartbeat',
                    message: logMessage,
                    metadata: JSON.stringify({ event: 'daemon_tick', tick: this.tickCount, total: sessions.length, queued: queuedSessions })
                }
            });

            broadcastToClients({ type: 'daemon_tick', tick: this.tickCount, total: sessions.length, queued: queuedSessions });
            this.scheduleNext(settings.checkIntervalSeconds);
        } catch (error) {
            console.error('[Daemon] Tick error:', error);
            try {
                await prisma.keeperLog.create({
                    data: {
                        type: 'error',
                        message: `Tick #${this.tickCount} error: ${error instanceof Error ? error.message : String(error)}`,
                        metadata: JSON.stringify({ event: 'daemon_error', tick: this.tickCount })
                    }
                });
            } catch {}
            this.scheduleNext(60);
        }
    }

    private scheduleNext(seconds: number) {
        const interval = Math.max(seconds, 30) * 1000;
        this.timer = setTimeout(() => this.tick(), interval);
    }

    private async getJulesClient(settings: any) {
        const apiKey = process.env.JULES_API_KEY || settings.julesApiKey;
        if (!apiKey || apiKey === 'placeholder') return null;
        return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
    }
}

export const globalDaemon = new Daemon();

export function startDaemon() {
    globalDaemon.start();
}

export function stopDaemon() {
    globalDaemon.stop();
}

export function forceBump() {
    return globalDaemon.forceBump();
}
