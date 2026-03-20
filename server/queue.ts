import { prisma } from '../lib/prisma';
import { JulesClient } from '../lib/jules/client';
import { getProvider, summarizeSession } from '@jules/shared';
import { emitDaemonEvent } from './index';
import { addLog, getSupervisorState, saveSupervisorState } from './daemon';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface Activity {
    role: string;
    content: string;
    createdAt: string;
}

/**
 * SQLite-backed Task Queue
 * Replaces Redis/BullMQ for a Lean Core experience.
 */
export class TaskQueue {
    private isRunning = false;
    private interval: Timer | null = null;

    constructor(private concurrency: number = 2) {}

    async add(type: string, payload: any, runAt: Date = new Date()) {
        return await prisma.queueJob.create({
            data: {
                type,
                payload: JSON.stringify(payload),
                status: 'pending',
                runAt
            }
        });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("[Queue] SQLite Task Queue started.");
        
        // Poll for jobs every 5 seconds
        this.interval = setInterval(() => this.processJobs(), 5000);
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log("[Queue] SQLite Task Queue stopped.");
    }

    private async processJobs() {
        if (!this.isRunning) return;

        // Find pending jobs that are ready to run
        const jobs = await prisma.queueJob.findMany({
            where: {
                status: 'pending',
                runAt: { lte: new Date() },
                attempts: { lt: 3 }
            },
            take: this.concurrency,
            orderBy: { runAt: 'asc' }
        });

        if (jobs.length === 0) return;

        await Promise.all(jobs.map(job => this.executeJob(job)));
    }

    private async executeJob(job: any) {
        // Mark as processing
        await prisma.queueJob.update({
            where: { id: job.id },
            data: { 
                status: 'processing',
                startedAt: new Date(),
                attempts: { increment: 1 }
            }
        });

        try {
            const payload = JSON.parse(job.payload);
            let result;

            if (job.type === 'check_session') {
                result = await this.handleCheckSession(payload.session, payload.settings);
            } else if (job.type === 'index_codebase') {
                result = await this.handleIndexCodebase();
            } else {
                throw new Error(`Unknown job type: ${job.type}`);
            }

            // Mark as completed
            await prisma.queueJob.update({
                where: { id: job.id },
                data: { 
                    status: 'completed',
                    completedAt: new Date(),
                }
            });
            
            console.log(`[Queue] Job ${job.id.substring(0, 8)} (${job.type}) completed: ${result?.action || 'done'}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Queue] Job ${job.id} failed:`, errorMessage);

            await prisma.queueJob.update({
                where: { id: job.id },
                data: { 
                    status: 'pending', // Will retry if attempts < maxAttempts
                    lastError: errorMessage
                }
            });
        }
    }

    private async handleIndexCodebase() {
        console.log('[Queue] Starting background codebase indexing...');
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        const apiKey = process.env.OPENAI_API_KEY || settings?.supervisorApiKey;
        
        if (!apiKey || apiKey === 'placeholder') {
            return { action: 'skip', reason: 'no_api_key' };
        }

        const DIRECTORIES_TO_INDEX = ['src', 'lib', 'server', 'components', 'packages'];
        const EXTENSIONS_TO_INDEX = ['.ts', '.tsx', '.js', '.jsx', '.md'];
        const CHUNK_LINE_LIMIT = 150;

        const getFiles = (dir: string, fileList: string[] = []): string[] => {
            const fullDirPath = path.resolve(process.cwd(), dir);
            if (!fs.existsSync(fullDirPath)) return fileList;
            const files = fs.readdirSync(fullDirPath);
            for (const file of files) {
                const filepath = path.join(dir, file);
                const fullFilepath = path.resolve(process.cwd(), filepath);
                if (fs.statSync(fullFilepath).isDirectory()) {
                    if (file !== 'node_modules' && file !== 'dist' && !file.startsWith('.')) {
                        getFiles(filepath, fileList);
                    }
                } else {
                    if (EXTENSIONS_TO_INDEX.includes(path.extname(filepath))) {
                        fileList.push(filepath);
                    }
                }
            }
            return fileList;
        };

        const allFiles = DIRECTORIES_TO_INDEX.flatMap(dir => getFiles(dir));
        let newChunks = 0;

        for (const relativePath of allFiles) {
            const fullPath = path.resolve(process.cwd(), relativePath);
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.length > 500000) continue;

            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i += CHUNK_LINE_LIMIT) {
                const chunkText = lines.slice(i, i + CHUNK_LINE_LIMIT).join('\n');
                const startLine = i + 1;
                const endLine = Math.min(i + CHUNK_LINE_LIMIT, lines.length);
                const checksum = crypto.createHash('sha256').update(chunkText).digest('hex');

                const existing = await prisma.codeChunk.findFirst({
                    where: { filepath: relativePath, startLine, checksum }
                });

                if (existing) continue;

                // Get embedding
                const response = await fetch("https://api.openai.com/v1/embeddings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                    body: JSON.stringify({ input: chunkText, model: "text-embedding-3-small" })
                });

                if (response.ok) {
                    const data = await response.json();
                    const embedding = data.data[0].embedding;
                    const floatArray = new Float32Array(embedding);
                    const buffer = Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);

                    await prisma.codeChunk.upsert({
                        where: { id: `chunk-${relativePath}-${startLine}` }, // Unique ID strategy
                        update: { content: chunkText, embedding: buffer, checksum, endLine },
                        create: {
                            id: `chunk-${relativePath}-${startLine}`,
                            workspaceId: 'default',
                            filepath: relativePath,
                            startLine,
                            endLine,
                            content: chunkText,
                            embedding: buffer,
                            checksum
                        }
                    });
                    newChunks++;
                }
                await new Promise(r => setTimeout(resolve, 100)); // Rate limit
            }
        }

        return { action: 'indexed', count: newChunks };
    }

    private async handleCheckSession(session: any, settings: any) {
        const apiKey = settings.julesApiKey || process.env.JULES_API_KEY;
        if (!apiKey || apiKey === 'placeholder') return { action: 'none', reason: 'no_api_key' };
        
        const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');

        const lastActivityTime = session.lastActivityAt ? new Date(session.lastActivityAt) : new Date(session.updatedAt);
        const diffMinutes = (Date.now() - lastActivityTime.getTime()) / 60000;
        let threshold = settings.inactivityThresholdMinutes;

        if (session.rawState === 'IN_PROGRESS') {
            threshold = settings.activeWorkThresholdMinutes;
            if ((Date.now() - lastActivityTime.getTime()) < 30000) return { action: 'none', reason: 'recently_active_in_progress' };
        }

        if (diffMinutes > threshold) {
            await addLog(`Sending nudge to ${session.id.substring(0, 8)} (${Math.round(diffMinutes)}m inactive)`, 'action', session.id);

            let messageToSend = "Please resume working on this task.";
            if (settings.smartPilotEnabled) {
                const supervisorState = await getSupervisorState(session.id);
                const activities = await client.listActivities(session.id);
                const sortedActivities = activities.sort((a: Activity, b: Activity) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                let newActivities = sortedActivities;
                if (supervisorState.lastProcessedActivityTimestamp) {
                    newActivities = sortedActivities.filter((a: Activity) => new Date(a.createdAt).getTime() > new Date(supervisorState.lastProcessedActivityTimestamp!).getTime());
                }

                const messagesToSend: { role: 'user' | 'assistant' | 'system', content: string }[] = [];
                if (newActivities.length > 0) {
                    const updates = newActivities.map((a: Activity) => `${a.role.toUpperCase()}: ${a.content}`).join('\n\n');
                    messagesToSend.push({ role: 'user', content: `Latest updates:\n\n${updates}` });
                    supervisorState.lastProcessedActivityTimestamp = newActivities[newActivities.length - 1]?.createdAt || supervisorState.lastProcessedActivityTimestamp;
                } else {
                    messagesToSend.push({ role: 'user', content: "The agent has been inactive. Please provide a nudge." });
                }

                const p = getProvider(settings.supervisorProvider);
                if (p) {
                    const result = await p.complete({
                        messages: [...supervisorState.history, ...messagesToSend].slice(-settings.contextMessageCount),
                        apiKey: settings.supervisorApiKey || process.env.OPENAI_API_KEY || "",
                        model: settings.supervisorModel,
                        systemPrompt: 'You are a project supervisor. provide a concise, direct instruction to reactivate the agent Jules.'
                    });
                    messageToSend = result.content;
                    supervisorState.history = [...supervisorState.history, ...messagesToSend, { role: 'assistant', content: messageToSend }];
                    await saveSupervisorState(supervisorState);
                }
            }

            await client.createActivity({
                sessionId: session.id,
                content: messageToSend,
                type: 'message'
            });

            emitDaemonEvent('activities_updated', { sessionId: session.id });
            emitDaemonEvent('session_nudged', {
                sessionId: session.id,
                sessionTitle: session.title,
                inactiveMinutes: Math.round(diffMinutes),
                message: messageToSend
            });
            return { action: 'nudged' };
        }

        return { action: 'none', reason: 'active' };
    }
}

// Global instance
export const orchestratorQueue = new TaskQueue();

export function setupWorker() {
    orchestratorQueue.start();
    return {
        close: () => orchestratorQueue.stop()
    };
}
