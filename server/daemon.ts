import { prisma } from '../lib/prisma';
import { JulesClient } from '../lib/jules/client';
import { getProvider } from '../lib/orchestration/providers';
import { runDebate } from '../lib/orchestration/debate';
import { summarizeSession } from '../lib/orchestration/summarize';
import { emitDaemonEvent } from './index';
import type { Session, Activity } from '@/types/jules';
import type { KeeperSettings } from '@prisma/client';

let isRunning = false;
let checkTimeout: ReturnType<typeof setTimeout> | null = null;

async function getJulesClient(settings: KeeperSettings) {
    const apiKey = settings.julesApiKey || process.env.JULES_API_KEY;
    if (!apiKey) return null;
    return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
}

async function addLog(message: string, type: 'info' | 'action' | 'error' | 'skip', sessionId: string = 'global', details?: any) {
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

async function getSupervisorState(sessionId: string) {
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

async function saveSupervisorState(state: any) {
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
        
        for (const session of sessions) {
            try {
                const createdTime = new Date(session.createdAt);
                const ageDays = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60 * 24);
                const HANDOFF_THRESHOLD_DAYS = 30;

                if (ageDays >= HANDOFF_THRESHOLD_DAYS && session.status !== "completed" && session.status !== "failed") {
                    await addLog(`Session ${session.id.substring(0, 8)} is ${Math.floor(ageDays)} days old. Initiating handoff...`, "action", session.id);
                    const activities = await client.listActivities(session.id);
                    const history = activities.map((a: Activity) => ({
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
                    continue;
                }

                if (settings.resumePaused && (session.status === 'paused' || session.status === 'completed' || session.status === 'failed')) {
                    await addLog(`Resuming ${session.status} session ${session.id.substring(0, 8)}...`, 'action', session.id);
                    await client.resumeSession(session.id);
                    emitDaemonEvent('session_updated', { sessionId: session.id });
                    emitDaemonEvent('sessions_list_updated', { reason: 'status_changed' });
                    continue;
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
                    }
                    continue;
                }

                const lastActivityTime = session.lastActivityAt ? new Date(session.lastActivityAt) : new Date(session.updatedAt);
                const diffMinutes = (Date.now() - lastActivityTime.getTime()) / 60000;
                let threshold = settings.inactivityThresholdMinutes;
                
                if (session.rawState === 'IN_PROGRESS') {
                    threshold = settings.activeWorkThresholdMinutes;
                    if ((Date.now() - lastActivityTime.getTime()) < 30000) continue;
                }

                if (diffMinutes > threshold) {
                    await addLog(`Sending nudge to ${session.id.substring(0, 8)} (${Math.round(diffMinutes)}m inactive)`, 'action', session.id);
                    
                    let messageToSend = "Please resume working on this task.";
                    if (settings.smartPilotEnabled) {
                        const supervisorState = await getSupervisorState(session.id);
                        const activities = await client.listActivities(session.id);
                        const sortedActivities = activities.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                        
                        let newActivities = sortedActivities;
                        if (supervisorState.lastProcessedActivityTimestamp) {
                            newActivities = sortedActivities.filter(a => new Date(a.createdAt).getTime() > new Date(supervisorState.lastProcessedActivityTimestamp!).getTime());
                        }

                        let messagesToSend: any[] = [];
                        if (newActivities.length > 0) {
                            const updates = newActivities.map(a => `${a.role.toUpperCase()}: ${a.content}`).join('\n\n');
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
                }

            } catch (err) {
                await addLog(`Error processing session ${session.id}: ${err instanceof Error ? err.message : String(err)}`, 'error', session.id);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
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
