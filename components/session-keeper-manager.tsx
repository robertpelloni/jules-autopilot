'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { getArchivedSessions } from '@/lib/archive';

// Persistent Supervisor State
interface SupervisorState {
  [sessionId: string]: {
    lastProcessedActivityTimestamp: string;
    history: { role: string; content: string }[];
    openaiThreadId?: string;
    openaiAssistantId?: string;
  };
}

export function SessionKeeperManager() {
  const { client, apiKey } = useJules();
  const router = useRouter();
  const { config, addLog, setStatusSummary } = useSessionKeeperStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);
  const hasSwitchedRef = useRef(false);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!config.isEnabled || !client || !apiKey) {
      setStatusSummary({ monitoringCount: 0 });
      return;
    }

    const runLoop = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      hasSwitchedRef.current = false;

      const nextCheck = Date.now() + (config.checkIntervalSeconds * 1000);
      setStatusSummary({ nextCheckIn: nextCheck });

      try {
        const currentSessions = await client.listSessions();
        const archived = getArchivedSessions();
        const activeSessions = currentSessions.filter(s => !archived.has(s.id));

        setStatusSummary({ monitoringCount: activeSessions.length });

        const now = new Date();
        const savedState = localStorage.getItem('jules_supervisor_state');
        const supervisorState: SupervisorState = savedState ? JSON.parse(savedState) : {};
        let stateChanged = false;

        for (const session of activeSessions) {
          const safeSwitch = (targetId: string) => {
            const cleanId = targetId.replace('sessions/', '');
            const targetPath = `/?sessionId=${cleanId}`;
            if (config.autoSwitch && !hasSwitchedRef.current) {
               router.push(targetPath);
               hasSwitchedRef.current = true;
            }
          };

          // 1. Resume Paused/Completed/Failed
          if (session.status === 'paused' || session.status === 'completed' || session.status === 'failed') {
             addLog(`Resuming ${session.status} session ${session.id.substring(0, 8)}...`, 'action');
             safeSwitch(session.id);
             await client.resumeSession(session.id);
             addLog(`Resumed ${session.id.substring(0, 8)}`, 'action');
             setStatusSummary({ lastAction: `Resumed ${session.id.substring(0,8)}` });
             continue;
          }

          // 2. Approve Plans
          if (session.status === 'awaiting_approval' || session.rawState === 'AWAITING_PLAN_APPROVAL') {
            addLog(`Approving plan for session ${session.id.substring(0, 8)}...`, 'action');
            safeSwitch(session.id);
            await client.approvePlan(session.id);
            addLog(`Plan approved for ${session.id.substring(0, 8)}`, 'action');
            setStatusSummary({ lastAction: `Approved Plan ${session.id.substring(0,8)}` });
            continue;
          }

          // 3. Check for Inactivity & Nudge
          const lastActivityTime = session.lastActivityAt ? new Date(session.lastActivityAt) : new Date(session.updatedAt);
          const diffMs = now.getTime() - lastActivityTime.getTime();
          const diffMinutes = diffMs / 60000;

          let threshold = config.inactivityThresholdMinutes;
          if (session.rawState === 'IN_PROGRESS') {
             threshold = config.activeWorkThresholdMinutes;
             if (diffMs < 30000) continue; // Active < 30s
          }

          if (diffMinutes > threshold) {
            safeSwitch(session.id);
            let messageToSend = '';

            // SUPERVISOR LOGIC
            if (config.smartPilotEnabled && config.supervisorApiKey) {
               try {
                  const activities = await client.listActivities(session.id);
                  if (session.prompt && !activities.some(a => a.content === session.prompt)) {
                      activities.unshift({
                          id: 'initial-prompt',
                          sessionId: session.id,
                          type: 'message',
                          role: 'user',
                          content: session.prompt,
                          createdAt: session.createdAt
                      });
                  }
                  const sortedActivities = activities.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                  addLog(`Asking Supervisor (${config.supervisorProvider})...`, 'info');

                  if (!supervisorState[session.id]) {
                    supervisorState[session.id] = { lastProcessedActivityTimestamp: '', history: [] };
                  }
                  const sessionState = supervisorState[session.id];

                  let newActivities = sortedActivities;
                  if (sessionState.lastProcessedActivityTimestamp) {
                    newActivities = sortedActivities.filter(a => new Date(a.createdAt).getTime() > new Date(sessionState.lastProcessedActivityTimestamp).getTime());
                  }

                  const isStateful = config.supervisorProvider === 'openai-assistants';
                  let messagesToSend: { role: string, content: string }[] = [];

                  if (newActivities.length > 0) {
                    if (sessionState.history.length === 0 && !sessionState.openaiThreadId) {
                      const fullSummary = newActivities.map(a => `${a.role.toUpperCase()}: ${a.content}`).join('\n\n');
                      messagesToSend.push({ role: 'user', content: `Here is the full conversation history so far. Please analyze the state and provide the next instruction:\n\n${fullSummary}` });
                    } else {
                      const updates = newActivities.map(a => `${a.role.toUpperCase()}: ${a.content}`).join('\n\n');
                      messagesToSend.push({ role: 'user', content: `Here are the latest updates since your last instruction:\n\n${updates}` });
                    }
                    sessionState.lastProcessedActivityTimestamp = newActivities[newActivities.length - 1].createdAt;
                  } else if (sessionState.history.length > 0 || sessionState.openaiThreadId) {
                      messagesToSend.push({ role: 'user', content: "The agent has been inactive for a while. Please provide a nudge or follow-up instruction." });
                  }

                  if (!isStateful) {
                    messagesToSend = [...sessionState.history, ...messagesToSend].slice(-config.contextMessageCount);
                  }

                  const response = await fetch('/api/supervisor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messages: messagesToSend,
                      provider: config.supervisorProvider,
                      apiKey: config.supervisorApiKey,
                      model: config.supervisorModel,
                      threadId: sessionState.openaiThreadId,
                      assistantId: sessionState.openaiAssistantId
                    })
                  });

                  if (response.ok) {
                    const data = await response.json();
                    if (data.content) {
                      messageToSend = data.content;
                      addLog(`Supervisor says: "${messageToSend.substring(0, 30)}..."`, 'action');
                      if (isStateful) {
                        sessionState.openaiThreadId = data.threadId;
                        sessionState.openaiAssistantId = data.assistantId;
                        sessionState.history.push(...messagesToSend);
                        sessionState.history.push({ role: 'assistant', content: messageToSend });
                      } else {
                        sessionState.history = [...messagesToSend, { role: 'assistant', content: messageToSend }];
                      }
                      stateChanged = true;
                    }
                  } else {
                      const errText = await response.text();
                      if (response.status === 429) {
                          addLog(`Supervisor rate limited (429). Skipping...`, 'error');
                      } else {
                          throw new Error(`Supervisor API failed: ${response.status} ${errText}`);
                      }
                  }
               } catch (err) {
                  addLog(`Auto-Pilot error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
               }
            }

            // Fallback
            if (!messageToSend) {
              let messages = config.messages;
              if (config.customMessages && config.customMessages[session.id] && config.customMessages[session.id].length > 0) {
                messages = config.customMessages[session.id];
              }
              
              if (messages.length === 0) {
                addLog(`Skipped ${session.id.substring(0, 8)}: No messages configured`, 'skip');
                continue;
              }
              messageToSend = messages[Math.floor(Math.random() * messages.length)];
            }
            
            addLog(`Sending nudge to ${session.id.substring(0, 8)} (${Math.round(diffMinutes)}m inactive)`, 'action');
            await client.createActivity({
              sessionId: session.id,
              content: messageToSend,
              type: 'message'
            });
            setStatusSummary({ lastAction: `Nudged ${session.id.substring(0,8)}` });
          }
        }

        if (stateChanged) {
          localStorage.setItem('jules_supervisor_state', JSON.stringify(supervisorState));
        }

      } catch (error) {
        // Handle 429s gracefully at the top level too
        if (error instanceof Error && error.message.includes('429')) {
             addLog(`Rate limit hit checking sessions. Backing off...`, 'error');
        } else {
             addLog(`Error checking sessions: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      } finally {
        processingRef.current = false;
      }
    };

    runLoop();
    intervalRef.current = setInterval(runLoop, config.checkIntervalSeconds * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, client, apiKey, router, addLog, setStatusSummary]);

  return null;
}
