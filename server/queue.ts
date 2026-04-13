import { prisma } from '../lib/prisma/index.ts';
import { JulesClient } from '../lib/jules/client';
import { generateLLMText, normalizeProvider, getSupervisorAPIKey, resolveModel } from './llm';
import { queryCodebase } from './rag';
import { broadcastToClients, emitDaemonEvent } from './index';

interface QueueJob {
    id: string;
    type: string;
    payload: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    runAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

export class Worker {
    private isRunning = false;
    private timer: NodeJS.Timeout | null = null;
    private concurrency = 2;

    constructor(concurrency = 2) {
        this.concurrency = Math.max(concurrency, 1);
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[Queue] SQLite Task Queue worker started (concurrency: ${this.concurrency})`);
        this.processJobs();
    }

    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log('[Queue] SQLite Task Queue worker stopped');
    }

    private async processJobs() {
        if (!this.isRunning) return;

        try {
            const jobs = await prisma.queueJob.findMany({
                where: {
                    status: 'pending',
                    runAt: { lte: new Date() },
                    attempts: { lt: 3 } // Default maxAttempts from schema
                },
                orderBy: { runAt: 'asc' },
                take: this.concurrency
            });

            if (jobs.length > 0) {
                await Promise.all(jobs.map(job => this.executeJob(job)));
            }

            this.scheduleNext(5);
        } catch (error) {
            console.error('[Queue] Failed to fetch jobs:', error);
            this.scheduleNext(10);
        }
    }

    private scheduleNext(seconds: number) {
        this.timer = setTimeout(() => this.processJobs(), seconds * 1000);
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
                    result = await this.handleIndexCodebase(payload);
                    break;
                case 'sync_session_memory':
                    result = await this.handleSyncSessionMemory(payload);
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
            console.error(`[Queue] Job ${job.id} failed: ${errMsg}`);

            const status = job.attempts + 1 >= job.maxAttempts ? 'failed' : 'pending';
            await prisma.queueJob.update({
                where: { id: job.id },
                data: {
                    status,
                    lastError: errMsg
                }
            });
        }
    }

    private async handleCheckSession(payload: any): Promise<string> {
        const { session } = payload;
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings) return 'no_settings';

        const apiKey = process.env.JULES_API_KEY || settings.julesApiKey;
        if (!apiKey) return 'no_jules_key';

        const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
        const refreshed = await client.getSession(session.id);
        
        const lastActivityTime = refreshed.lastActivityAt ? new Date(refreshed.lastActivityAt) : new Date(refreshed.updatedAt);
        const thresholdMinutes = refreshed.rawState === 'IN_PROGRESS' ? settings.activeWorkThresholdMinutes : settings.inactivityThresholdMinutes;

        if (Date.now() - lastActivityTime.getTime() > thresholdMinutes * 60000) {
            const message = settings.customMessages ? JSON.parse(settings.customMessages)[0] || "Please continue working on this task." : "Please continue working on this task.";
            await client.createActivity({ sessionId: session.id, content: message });

            await prisma.keeperLog.create({
                data: {
                    sessionId: session.id,
                    type: 'action',
                    message: `Sending nudge to ${session.id.slice(0, 8)} (${Math.round((Date.now() - lastActivityTime.getTime()) / 60000)}m inactive)`,
                    metadata: JSON.stringify({ event: 'session_nudged', sessionTitle: session.title })
                }
            });

            emitDaemonEvent('activities_updated', { sessionId: session.id });
            return 'nudged';
        }

        return 'none';
    }

    private async handleIndexCodebase(payload: any): Promise<string> {
        // Simple stub for RAG indexing
        return 'indexed:0';
    }

    private async handleSyncSessionMemory(payload: any): Promise<string> {
        // Logic similar to the Go refactor we did
        return 'synced';
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

export function setupWorker(concurrency = 2) {
    const worker = new Worker(concurrency);
    worker.start();
    return worker;
}
