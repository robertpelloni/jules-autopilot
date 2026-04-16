import { prisma } from '../lib/prisma/index.ts';
import { JulesClient } from '../lib/jules/client';
import { superviseSession } from './supervisor';
import { emitDaemonEvent } from './index';

export class Worker {
    private isRunning = false;
    private timer: NodeJS.Timeout | null = null;
    private currentJob: Promise<void> | null = null;

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[Queue] Worker started (sequential, 1 job at a time)');
        this.processNext();
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log('[Queue] Worker stopped');
    }

    private async processNext() {
        if (!this.isRunning) return;

        try {
            // Grab ONE job at a time
            const job = await prisma.queueJob.findFirst({
                where: {
                    status: 'pending',
                    runAt: { lte: new Date() },
                    attempts: { lt: 3 }
                },
                orderBy: { runAt: 'asc' },
            });

            if (job) {
                await this.executeJob(job);
                // Short pause before next job to avoid blasting APIs
                await new Promise(r => setTimeout(r, 3000));
                // Immediately check for next job (no timer delay)
                setImmediate(() => this.processNext());
            } else {
                // No jobs — wait 5s then check again
                this.scheduleNext(5);
            }
        } catch (error) {
            console.error('[Queue] Error:', error);
            this.scheduleNext(10);
        }
    }

    private scheduleNext(seconds: number) {
        this.timer = setTimeout(() => this.processNext(), seconds * 1000);
    }

    private async executeJob(job: any) {
        await prisma.queueJob.update({
            where: { id: job.id },
            data: {
                status: 'processing',
                startedAt: new Date(),
                attempts: { increment: 1 }
            }
        });

        try {
            let result = '';
            const payload = JSON.parse(job.payload);

            switch (job.type) {
                case 'check_session':
                    result = await this.handleCheckSession(payload);
                    break;
                case 'index_codebase':
                    result = 'indexed:0';
                    break;
                case 'sync_session_memory':
                    result = 'synced';
                    break;
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
            }

            await prisma.queueJob.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    completedAt: new Date()
                }
            });

            console.log(`[Queue] Job ${job.id.slice(0, 8)} (${job.type}) completed: ${result}`);
        } catch (error: any) {
            const errMsg = error.message || String(error);
            console.error(`[Queue] Job ${job.id.slice(0, 8)} failed: ${errMsg}`);

            // If it's a 429, requeue with a delay instead of failing
            const is429 = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit');
            if (is429 && job.attempts < 3) {
                const backoffMinutes = job.attempts * 2; // 2, 4, 6 min
                await prisma.queueJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'pending',
                        lastError: errMsg,
                        runAt: new Date(Date.now() + backoffMinutes * 60000)
                    }
                });
                console.log(`[Queue] 429 rate limited — requeued job ${job.id.slice(0, 8)} with ${backoffMinutes}m backoff`);
            } else {
                const status = job.attempts >= 3 ? 'failed' : 'pending';
                await prisma.queueJob.update({
                    where: { id: job.id },
                    data: { status, lastError: errMsg }
                });
            }
        }
    }

    private async handleCheckSession(payload: any): Promise<string> {
        const { session } = payload;
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings) return 'no_settings';

        const apiKey = process.env.JULES_API_KEY || settings.julesApiKey;
        if (!apiKey) return 'no_jules_key';

        const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');

        let refreshed;
        try {
            refreshed = await client.getSession(session.id);
        } catch (err: any) {
            console.error(`[Queue] Failed to refresh session ${session.id?.slice(0, 8)}: ${err.message}`);
            throw err;
        }

        const rawState = refreshed.rawState?.toUpperCase() || '';

        const lastActivityTime = refreshed.lastActivityAt ? new Date(refreshed.lastActivityAt) : new Date(refreshed.updatedAt);
        const inactiveMinutes = Math.round((Date.now() - lastActivityTime.getTime()) / 60000);

        console.log(`[Queue] Session ${session.id?.slice(0, 8)} state=${rawState} inactive=${inactiveMinutes}m`);

        // Skip terminal sessions — no point nudging/supervising these
        if (['COMPLETED', 'FAILED', 'SUCCEEDED'].includes(rawState)) {
            return 'skipped_terminal';
        }

        // === SUPERVISOR MODE ===
        if (settings.smartPilotEnabled) {
            try {
                const { guidance, submitted } = await superviseSession(
                    client,
                    session.id,
                    refreshed.title || session.title || '',
                    rawState,
                    refreshed.sourceId || session.sourceId || '',
                    inactiveMinutes
                );

                if (submitted) return 'supervised';
                return 'supervisor_failed';
            } catch (err: any) {
                // If it's a 429, throw to let the queue handle backoff
                if (err.message?.includes('429')) throw err;

                console.error(`[Queue] Supervisor error for ${session.id?.slice(0, 8)}: ${err.message}`);
                await prisma.keeperLog.create({
                    data: {
                        sessionId: session.id,
                        type: 'warning',
                        message: `Supervisor failed for ${session.id?.slice(0, 8)}, falling back to nudge: ${err.message}`,
                        metadata: JSON.stringify({ event: 'supervisor_fallback', error: err.message })
                    }
                });
                // Fall through to simple nudge
            }
        }

        // === SIMPLE NUDGE (fallback) ===
        let messages: string[] = ["Please continue working on this task."];
        try {
            const parsed = settings.customMessages ? JSON.parse(settings.customMessages) : null;
            if (Array.isArray(parsed) && parsed.length > 0) messages = parsed;
        } catch {}

        const message = messages[Math.floor(Math.random() * messages.length)];

        try {
            await client.createActivity({ sessionId: session.id, content: message });
        } catch (err: any) {
            await prisma.keeperLog.create({
                data: {
                    sessionId: session.id,
                    type: 'error',
                    message: `Failed to nudge ${session.id?.slice(0, 8)}: ${err.message}`,
                    metadata: JSON.stringify({ event: 'nudge_failed', error: err.message })
                }
            });
            throw err;
        }

        await prisma.keeperLog.create({
            data: {
                sessionId: session.id,
                type: 'action',
                message: `Nudged "${refreshed.title?.slice(0, 40)}" (${inactiveMinutes}m inactive)`,
                metadata: JSON.stringify({ event: 'session_nudged', sessionTitle: refreshed.title, inactiveMinutes, state: rawState })
            }
        });

        emitDaemonEvent('activities_updated', { sessionId: session.id });
        return 'nudged';
    }
}

export const orchestratorQueue = {
    async add(type: string, payload: any, options: { runAt?: Date } = {}) {
        return prisma.queueJob.create({
            data: {
                type,
                payload: JSON.stringify(payload),
                runAt: options.runAt || new Date()
            }
        });
    }
};

export function setupWorker() {
    const worker = new Worker();
    worker.start();
    return worker;
}
