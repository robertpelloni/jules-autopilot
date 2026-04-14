import { prisma } from '../lib/prisma/index.ts';
import { JulesClient } from '../lib/jules/client';
import { broadcastToClients, emitDaemonEvent } from './index';
import { orchestratorQueue } from './queue';
import { generateLLMText, normalizeProvider, getSupervisorAPIKey, resolveModel } from './llm';

export class Daemon {
    private isRunning = false;
    private timer: NodeJS.Timeout | null = null;

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[Daemon] Starting background monitoring loop...');
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

    private async tick() {
        if (!this.isRunning) return;

        try {
            const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
            if (!settings || !settings.isEnabled) {
                this.scheduleNext(settings?.checkIntervalSeconds || 60);
                return;
            }

            const client = await this.getJulesClient(settings);
            if (!client) {
                console.warn('[Daemon] Enabled but no Jules API key found.');
                this.scheduleNext(settings.checkIntervalSeconds);
                return;
            }

            const sessions = await client.listSessions();
            let queuedSessions = 0;

            for (const session of sessions) {
                const delay = queuedSessions * 5000; // 5s stagger
                const runAt = new Date(Date.now() + delay);

                await orchestratorQueue.add('check_session', { session }, { runAt });
                queuedSessions++;
            }

            if (queuedSessions > 0) {
                await prisma.keeperLog.create({
                    data: {
                        type: 'info',
                        message: `Daemon scheduled monitoring for ${queuedSessions} sessions.`,
                        metadata: JSON.stringify({ event: 'daemon_tick_enqueued', queuedSessions })
                    }
                });
            }

            this.scheduleNext(settings.checkIntervalSeconds);
        } catch (error) {
            console.error('[Daemon] Tick error:', error);
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
