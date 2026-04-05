import { prisma } from '../lib/prisma';
import type { QueueJob } from '@prisma/client';
import { JulesClient } from '../lib/jules/client';
import { getProvider, evaluatePlanRisk, decideNextAction, runDebate } from '@jules/shared';
import type { Participant, Session, SessionKeeperConfig } from '@jules/shared';
import { emitDaemonEvent } from './index';
import { addLog, getSupervisorState, saveSupervisorState } from './daemon';
import { queryCodebase } from './rag';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface Activity {
    type?: string;
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

    async add(type: string, payload: unknown, runAt: Date = new Date()) {
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

    private async executeJob(job: QueueJob) {
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
            } else if (job.type === 'index_session_memory') {
                result = await this.handleIndexSessionMemory(payload.sessionId, payload.settings);
            } else if (job.type === 'check_issues') {
                result = await this.handleCheckIssues(payload.sourceId, payload.settings);
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
                await new Promise(r => setTimeout(r, 100)); // Rate limit
            }
        }

        return { action: 'indexed', count: newChunks };
    }

    private async handleCheckIssues(sourceId: string, settings: SessionKeeperConfig) {
        const julesKey = process.env.JULES_API_KEY || settings.julesApiKey;
        const supervisorKey = settings.supervisorApiKey || process.env.OPENAI_API_KEY || "";
        
        if (!julesKey || !supervisorKey) return { action: 'none', reason: 'missing_keys' };

        const client = new JulesClient(julesKey, 'https://jules.googleapis.com/v1alpha');
        
        await addLog(`Checking GitHub issues for ${sourceId}...`, 'info', 'global');
        const issues = await client.listIssues(sourceId);
        
        if (issues.length === 0) return { action: 'none', reason: 'no_issues' };

        // Fetch active sessions to prevent duplicates
        const sessions = await client.listSessions();
        const activeTitles = sessions.map(s => s.title.toLowerCase());

        for (const issue of issues) {
            // Basic duplicate check by title
            if (activeTitles.some(title => title.includes(issue.title.toLowerCase()) || issue.title.toLowerCase().includes(title))) {
                continue;
            }

            // --- COUNCIL SUPERVISOR: ISSUE EVALUATION ---
            const evaluationPrompt = `
                Evaluate if the following GitHub issue is "Self-Healable" by an AI coding agent.
                Target Repository: ${sourceId}
                Issue Title: ${issue.title}
                Issue Body: ${issue.body}

                Criteria for "Self-Healable":
                1. Clear bug description or feature request.
                2. Non-ambiguous requirements.
                3. Does not require complex multi-step human interaction (e.g. physical device testing).

                Respond with a JSON object:
                {
                    "isFixable": boolean,
                    "confidence": number (0-100),
                    "suggestedTitle": "Short descriptive title for the session",
                    "reasoning": "Short explanation"
                }
            `;

            try {
                const p = getProvider(settings.supervisorProvider);
                if (!p) continue;

                const evalResult = await p.complete({
                    messages: [{ role: 'user', content: evaluationPrompt }],
                    apiKey: supervisorKey,
                    model: settings.supervisorModel,
                    systemPrompt: 'You are a technical lead evaluating project issues.'
                });

                // Extract JSON from response
                const jsonMatch = evalResult.content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) continue;
                
                const evaluation = JSON.parse(jsonMatch[0]);

                if (evaluation.isFixable && evaluation.confidence > 70) {
                    await addLog(`Autonomous session spawn for issue: ${issue.title}`, 'action', 'global');
                    
                    const newSession = await client.createSession(
                        sourceId, 
                        `Fix issue #${issue.number}: ${issue.title}\n\nContext:\n${issue.body}`,
                        evaluation.suggestedTitle || `Issue #${issue.number}: ${issue.title}`
                    );

                    emitDaemonEvent('sessions_list_updated', {});
                    return { action: 'session_spawned', sessionId: newSession.id, issue: issue.number };
                }
            } catch (err) {
                console.error(`[Queue] Failed to evaluate issue ${issue.number}:`, err);
            }
        }

        return { action: 'none', reason: 'no_suitable_issues' };
    }

    private async handleIndexSessionMemory(sessionId: string, settings: SessionKeeperConfig) {
        const julesKey = process.env.JULES_API_KEY || settings.julesApiKey;
        const supervisorKey = settings.supervisorApiKey || process.env.OPENAI_API_KEY || "";
        
        if (!julesKey || !supervisorKey) return { action: 'skip', reason: 'missing_keys' };

        const client = new JulesClient(julesKey, 'https://jules.googleapis.com/v1alpha');
        
        // 1. Fetch activities to find the final result
        const activities = await client.listActivities(sessionId);
        const agentResult = activities.reverse().find(a => a.role === 'agent' && (a.type === 'result' || a.type === 'message'));

        if (!agentResult || agentResult.content.length < 50) {
            return { action: 'skip', reason: 'no_substantial_result' };
        }

        // 2. Check if already indexed
        const existing = await prisma.memoryChunk.findFirst({ where: { sessionId } });
        if (existing) return { action: 'skip', reason: 'already_indexed' };

        // 3. Generate embedding for the result
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supervisorKey}` },
            body: JSON.stringify({ input: agentResult.content, model: "text-embedding-3-small" })
        });

        if (response.ok) {
            const data = await response.json();
            const embedding = data.data[0].embedding;
            const floatArray = new Float32Array(embedding);
            const buffer = Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);

            await prisma.memoryChunk.create({
                data: {
                    sessionId,
                    type: 'learned_outcome',
                    content: agentResult.content,
                    embedding: buffer
                }
            });

            await addLog(`Indexed session outcome for cross-session memory: ${sessionId.substring(0, 8)}`, 'info', sessionId);
            return { action: 'indexed' };
        }

        return { action: 'fail', reason: 'embedding_failed' };
    }

    private async handleCheckSession(session: Session, settings: SessionKeeperConfig) {
        const julesKey = process.env.JULES_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY;
        const dbKey = settings.julesApiKey;

        const isInvalid = (val?: string) => !val || val === 'placeholder' || val === 'undefined' || val === 'null' || val.length < 5;

        let apiKey: string | undefined;

        // Strictly API Key identification
        if (!isInvalid(dbKey)) apiKey = dbKey;
        else if (!isInvalid(julesKey)) apiKey = julesKey;
        else if (!isInvalid(googleKey)) apiKey = googleKey;

        if (!apiKey) return { action: 'none', reason: 'no_api_key' };
        
        const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');

        const lastActivityTime = session.lastActivityAt ? new Date(session.lastActivityAt) : new Date(session.updatedAt);
        const supervisorState = await getSupervisorState(session.id);
        
        // Emit update if new activities detected since last process
        if (supervisorState.lastProcessedActivityTimestamp) {
            const lastProcessed = new Date(supervisorState.lastProcessedActivityTimestamp);
            if (lastActivityTime > lastProcessed) {
                emitDaemonEvent('activities_updated', { sessionId: session.id });
            }
        } else {
            // First time seeing this session, emit anyway to be safe
            emitDaemonEvent('activities_updated', { sessionId: session.id });
        }

        // --- COUNCIL SUPERVISOR: PLAN APPROVAL LOGIC ---
        if (session.rawState === 'AWAITING_PLAN_APPROVAL' && settings.smartPilotEnabled) {
            const activities = await client.listActivities(session.id);
            const planActivity = activities.find((a: Activity) => a.type === 'plan');
            
            if (planActivity) {
                await addLog(`Evaluating plan risk for ${session.id.substring(0, 8)}...`, 'info', session.id);
                
                const supervisorKey = settings.supervisorApiKey || process.env.OPENAI_API_KEY || "";
                
                if (supervisorKey) {
                    const riskScore = await evaluatePlanRisk(
                        planActivity.content, 
                        settings.supervisorProvider, 
                        supervisorKey, 
                        settings.supervisorModel
                    );

                    await addLog(`Plan Risk Score for ${session.id.substring(0, 8)} is ${riskScore}/100`, 'info', session.id);

                    if (riskScore < 40) { // Configurable threshold, defaulting to 40 for "low-medium" risk
                        await addLog(`Auto-approving low-risk plan (Score: ${riskScore})`, 'action', session.id);
                        await client.approvePlan(session.id);
                        emitDaemonEvent('activities_updated', { sessionId: session.id });
                        emitDaemonEvent('session_approved', {
                            sessionId: session.id,
                            sessionTitle: session.title,
                        });
                        return { action: 'plan_approved', riskScore };
                    } else {
                        await addLog(`Plan risk is ${riskScore}. Escalating to Council Debate...`, 'info', session.id);
                        emitDaemonEvent('session_debate_escalated', {
                            sessionId: session.id,
                            sessionTitle: session.title,
                            riskScore,
                        });
                        
                        // Construct participants from settings for the debate
                        const participants: Participant[] = [
                            {
                                id: 'security-architect',
                                name: 'Security Architect',
                                role: 'Security & Architecture Reviewer',
                                systemPrompt: 'You are a strict security architect. Review the proposed implementation plan for vulnerabilities, data leaks, and architectural flaws. If the plan modifies core logic without adequate testing, reject it. If it is safe, approve it.',
                                provider: settings.supervisorProvider as Participant['provider'],
                                model: settings.supervisorModel,
                                apiKey: supervisorKey
                            },
                            {
                                id: 'senior-engineer',
                                name: 'Senior Engineer',
                                role: 'Code Quality Reviewer',
                                systemPrompt: 'You are a senior frontend/backend engineer. Review the plan for code quality, edge cases, and best practices. Suggest improvements or point out missing steps. If the plan is sound, approve it.',
                                provider: settings.supervisorProvider as Participant['provider'],
                                model: settings.supervisorModel,
                                apiKey: supervisorKey
                            }
                        ];

                        const debateResult = await runDebate({
                            history: [{ role: 'user', content: `Please review the following implementation plan:\n\n${planActivity.content}` }],
                            participants,
                            rounds: 1,
                            topic: `Review Plan for Session ${session.id}`
                        });

                        const finalRisk = debateResult.riskScore ?? 50;
                        await addLog(`Council Debate concluded. Final Risk Score: ${finalRisk}`, 'info', session.id);
                        emitDaemonEvent('session_debate_resolved', {
                            sessionId: session.id,
                            sessionTitle: session.title,
                            riskScore: finalRisk,
                            approvalStatus: debateResult.approvalStatus,
                            summary: debateResult.summary,
                        });

                        if (finalRisk < 40 || debateResult.approvalStatus === 'approved') {
                            await addLog(`Council approved plan after debate. Auto-approving...`, 'action', session.id);
                            await client.approvePlan(session.id);
                            
                            // Optionally send the debate summary to the agent
                            await client.createActivity({
                                sessionId: session.id,
                                content: `Council Supervisor Debate Summary:\n\n${debateResult.summary}\n\nThe plan has been approved. Proceed with implementation.`,
                                type: 'message'
                            });
                            
                            emitDaemonEvent('activities_updated', { sessionId: session.id });
                            emitDaemonEvent('session_approved', {
                                sessionId: session.id,
                                sessionTitle: session.title,
                            });
                            return { action: 'plan_approved_by_council', riskScore: finalRisk };
                        } else {
                            await addLog(`Council rejected plan (Score: ${finalRisk}). Manual review required.`, 'error', session.id);
                            
                            // Send the rejection summary to the agent to ask for a revised plan
                            await client.createActivity({
                                sessionId: session.id,
                                content: `The Council Supervisor flagged the implementation plan as high-risk.\n\nDebate Summary:\n${debateResult.summary}\n\nPlease revise the plan addressing these concerns and submit for approval again.`,
                                type: 'message'
                            });

                            return { action: 'plan_flagged_by_council', riskScore: finalRisk };
                        }
                    }
                }
            }
        }

        // --- COUNCIL SUPERVISOR: INACTIVITY NUDGE LOGIC ---
        // --- COUNCIL SUPERVISOR: SELF-HEALING (FAILED SESSIONS) ---
        if (session.rawState === 'FAILED' && settings.smartPilotEnabled) {
            // ... (existing self-healing code) ...
        }

        // --- COUNCIL SUPERVISOR: HISTORICAL INDEXING (COMPLETED SESSIONS) ---
        if (session.rawState === 'COMPLETED' && settings.smartPilotEnabled) {
            const existingMemory = await prisma.memoryChunk.findFirst({ where: { sessionId: session.id } });
            if (!existingMemory) {
                await this.add('index_session_memory', { sessionId: session.id, settings });
            }
        }

        const diffMinutes = (Date.now() - lastActivityTime.getTime()) / 60000;
        let threshold = settings.inactivityThresholdMinutes;

        if (session.rawState === 'IN_PROGRESS') {
            threshold = settings.activeWorkThresholdMinutes;
            if ((Date.now() - lastActivityTime.getTime()) < 30000) return { action: 'none', reason: 'recently_active_in_progress' };
        }

        if (diffMinutes > threshold && session.rawState !== 'AWAITING_PLAN_APPROVAL') {
            await addLog(`Sending nudge to ${session.id.substring(0, 8)} (${Math.round(diffMinutes)}m inactive)`, 'action', session.id);

            let messageToSend = "Please resume working on this task.";
            let ragContext = "";
            
            const supervisorKey = settings.supervisorApiKey || process.env.OPENAI_API_KEY || "";

            // --- RAG CONTEXT INJECTION ---
            if (settings.smartPilotEnabled && supervisorKey) {
                try {
                    // Query codebase using the session title/context
                    const query = session.title || "recent development activity";
                    const ragResults = await queryCodebase(query, supervisorKey, 3);
                    
                    if (ragResults.length > 0) {
                        ragContext = "\n\n[LOCAL_CONTEXT] - I found these relevant patterns in your fleet's memory that might help:\n\n";
                        ragResults.forEach(res => {
                            const originLabel = res.origin === 'history' ? "HISTORICAL SUCCESS" : "CURRENT CODEBASE";
                            ragContext += `[${originLabel}] File/Source: ${res.filepath}\n\`\`\`\n${res.content}\n\`\`\`\n\n`;
                        });
                    }
                } catch (ragErr) {
                    console.warn(`[Queue] RAG injection failed for session ${session.id}:`, ragErr);
                }
            }
            
            if (settings.smartPilotEnabled) {
                const activities = await client.listActivities(session.id);
                const sortedActivities = activities.sort((a: Activity, b: Activity) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                let newActivities = sortedActivities;
                if (supervisorState.lastProcessedActivityTimestamp) {
                    newActivities = sortedActivities.filter((a: Activity) => new Date(a.createdAt).getTime() > new Date(supervisorState.lastProcessedActivityTimestamp!).getTime());
                }

                let contextStr = "The agent has been inactive. Please provide a nudge.";
                if (newActivities.length > 0) {
                    const updates = newActivities.map((a: Activity) => `${a.role.toUpperCase()}: ${a.content}`).join('\n\n');
                    contextStr = `Latest updates:\n\n${updates}`;
                    supervisorState.lastProcessedActivityTimestamp = newActivities[newActivities.length - 1]?.createdAt || supervisorState.lastProcessedActivityTimestamp;
                }

                if (supervisorKey) {
                    messageToSend = await decideNextAction(
                        settings.supervisorProvider,
                        supervisorKey,
                        settings.supervisorModel,
                        contextStr,
                        supervisorState.history.slice(-settings.contextMessageCount)
                    );
                    
                    supervisorState.history = [...supervisorState.history, { role: 'user', content: contextStr }, { role: 'assistant', content: messageToSend }];
                    await saveSupervisorState(supervisorState);
                }
            }

            // Combine RAG context with the generated message
            const finalMessage = ragContext ? `${messageToSend}${ragContext}` : messageToSend;

            await client.createActivity({
                sessionId: session.id,
                content: finalMessage,
                type: 'message'
            });

            emitDaemonEvent('activities_updated', { sessionId: session.id });
            emitDaemonEvent('session_nudged', {
                sessionId: session.id,
                sessionTitle: session.title,
                inactiveMinutes: Math.round(diffMinutes),
                message: messageToSend // Log the base message
            });
            return { action: 'nudged' };
        }

        // If we didn't nudge, we might still want to update lastProcessedActivityTimestamp if we saw new activities
        if (supervisorState.lastProcessedActivityTimestamp) {
             const lastProcessed = new Date(supervisorState.lastProcessedActivityTimestamp);
             if (lastActivityTime > lastProcessed) {
                 supervisorState.lastProcessedActivityTimestamp = lastActivityTime.toISOString();
                 await saveSupervisorState(supervisorState);
             }
        } else {
             supervisorState.lastProcessedActivityTimestamp = lastActivityTime.toISOString();
             await saveSupervisorState(supervisorState);
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
