import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';
import { JulesClient } from '../lib/jules/client';
import { getProvider, summarizeSession } from '@jules/shared';
import { emitDaemonEvent } from './index';
import { addLog, getSupervisorState, saveSupervisorState } from './daemon';
import { processCIFix } from './ci-fix-agent';
import { SwarmCoordinator } from './swarm-coordinator';

interface Activity {
    role: string;
    content: string;
    createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
}) as any;

export const orchestratorQueue = new Queue('jules-orchestrator-queue', { connection });

export function setupWorker() {
    const worker = new Worker('jules-orchestrator-queue', async (job: Job) => {
        // Route CI fix jobs to the dedicated agent
        if (job.name === 'ci_fix') {
            await processCIFix(job.data);
            return { action: 'ci_fix_processed' };
        }

        if (job.name === 'process_swarm_decomposition') {
            const { swarmId } = job.data;
            const swarm = await prisma.agentSwarm.findUnique({ where: { id: swarmId } });
            if (!swarm) throw new Error(`Swarm ${swarmId} not found`);

            const coordinator = new SwarmCoordinator({
                name: swarm.name,
                prompt: swarm.prompt
            });

            // The decompose method internally creates SwarmTask records
            // and updates the status to 'running'
            await coordinator.decompose();
            return { action: 'swarm_decomposed', swarmId };
        }

        if (job.name === 'dispatch_swarm_tasks') {
            const { swarmId } = job.data;
            await SwarmCoordinator.dispatchPendingTasks(swarmId);
            return { action: 'swarm_tasks_dispatched', swarmId };
        }

        const { session, settings } = job.data;

        try {
            const apiKey = settings.julesApiKey || process.env.JULES_API_KEY;
            if (!apiKey) throw new Error('No Jules API key found');
            const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');

            const createdTime = new Date(session.createdAt);
            const ageDays = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60 * 24);
            const HANDOFF_THRESHOLD_DAYS = 30;

            if (ageDays >= HANDOFF_THRESHOLD_DAYS && session.status !== "completed" && session.status !== "failed") {
                await addLog(`Session ${session.id.substring(0, 8)} is ${Math.floor(ageDays)} days old. Initiating handoff...`, "action", session.id);
                const activities = await client.listActivities(session.id);
                const history = (activities as Activity[]).map((a: Activity) => ({
                    role: a.role === "agent" ? "assistant" : "user",
                    content: a.content
                }));

                const summary = await summarizeSession(
                    history,
                    settings.supervisorProvider || "openai",
                    settings.supervisorApiKey || process.env.OPENAI_API_KEY || "",
                    settings.supervisorModel || "gpt-4o"
                );

                const newSession = await client.createSession(
                    session.sourceId,
                    session.prompt || "Continuing previous session",
                    `${session.title || "Untitled"} (Part 2)`
                );

                await client.createActivity({
                    sessionId: newSession.id,
                    content: `*** SESSION HANDOFF ***\n\nPrevious Session Summary:\n${summary}\n\nOriginal Start Date: ${session.createdAt}`,
                    type: "message"
                });

                await client.createActivity({
                    sessionId: session.id,
                    content: `*** SESSION ARCHIVED ***\n\nThis session has been handed off to ${newSession.id}. Marking as completed.`,
                    type: "message"
                });

                emitDaemonEvent('sessions_list_updated', { reason: 'created' });
                emitDaemonEvent('activities_updated', { sessionId: newSession.id });
                emitDaemonEvent('activities_updated', { sessionId: session.id });
                await addLog(`Created new session ${newSession.id.substring(0, 8)} with handoff log.`, "action", session.id);
                return { action: 'handoff', newSessionId: newSession.id };
            }

            if (settings.resumePaused && (session.status === 'paused' || session.status === 'completed' || session.status === 'failed')) {
                await addLog(`Resuming ${session.status} session ${session.id.substring(0, 8)}...`, 'action', session.id);
                await client.resumeSession(session.id);
                emitDaemonEvent('session_updated', { sessionId: session.id });
                emitDaemonEvent('sessions_list_updated', { reason: 'status_changed' });
                return { action: 'resumed' };
            }

            if (session.status === 'awaiting_approval' || session.rawState === 'AWAITING_PLAN_APPROVAL') {
                if (settings.smartPilotEnabled) {
                    await addLog(`Auto-approving plan for ${session.id.substring(0, 8)}...`, 'action', session.id);
                    await client.approvePlan(session.id);
                    emitDaemonEvent('session_approved', {
                        sessionId: session.id,
                        sessionTitle: session.title
                    });
                    emitDaemonEvent('session_updated', { sessionId: session.id });
                    emitDaemonEvent('sessions_list_updated', { reason: 'status_changed' });
                    return { action: 'auto_approved' };
                }
                return { action: 'none', reason: 'awaiting_human_approval' };
            }

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
                } else {
                    const messages = JSON.parse(settings.messages) as string[];
                    if (messages.length > 0) {
                        messageToSend = messages[Math.floor(Math.random() * messages.length)] || messageToSend;
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
        } catch (err) {
            await addLog(`Error processing session ${session.id}: ${err instanceof Error ? err.message : String(err)}`, 'error', session.id);
            throw err;
        }
    }, {
        connection,
        concurrency: 4
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worker.on('completed', (job: Job, returnvalue: any) => {
        console.log(`[Worker] Job ${job.id} for session ${job.data?.session?.id?.substring(0, 8)} completed: ${returnvalue?.action}`);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worker.on('failed', (job: Job | undefined, err: Error) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err);
    });

    return worker;
}
