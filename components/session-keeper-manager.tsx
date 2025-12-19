'use client';

import { useEffect, useRef } from 'react';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { decideNextAction } from '@/lib/orchestration/supervisor';
import { DebateManager } from '@/lib/orchestration/debate';

export function SessionKeeperManager() {
  const { client, apiKey } = useJules();
  const { config, addLog, setStatusSummary } = useSessionKeeperStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!config.isEnabled || !client) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkSessions = async () => {
      try {
        const sessions = await client.listSessions();

        // Resume all states including failed/completed, excluding archived (if that state existed).
        // Since we don't have an explicit 'archived' state in our type yet, we assume all listed sessions are valid candidates.
        // If we need to filter archived, we would check a specific flag.
        const monitoredSessions = sessions;

        setStatusSummary({
          monitoringCount: monitoredSessions.length,
          lastAction: 'Checked ' + new Date().toLocaleTimeString(),
          nextCheckIn: config.checkIntervalSeconds
        });

        // Loop through sessions and act
        for (const session of monitoredSessions) {
          // Get activities to determine state
          const activities = await client.listActivities(session.id);
          if (activities.length === 0) continue;

          const lastActivity = activities[0]; // Assuming sorted desc
          const lastActivityTime = new Date(lastActivity.createdAt).getTime();
          const now = Date.now();
          const inactiveMinutes = (now - lastActivityTime) / (1000 * 60);

          // Determine threshold based on session state
          // "In Progress" sessions should be interrupted less frequently (use activeWorkThresholdMinutes)
          let threshold = config.inactivityThresholdMinutes;

          const isWorking = session.rawState === 'IN_PROGRESS' || session.rawState === 'PLANNING' || session.rawState === 'ACTIVE';

          if (isWorking) {
             threshold = config.activeWorkThresholdMinutes;
          }

          // Check if plan needs approval (High Priority)
          if (lastActivity.type === 'plan' && !lastActivity.metadata?.planApproved) {
             addLog(`Approving plan for session ${session.id}`, 'action');
             await client.approvePlan(session.id);
             continue;
          }

          // Check for inactivity
          if (inactiveMinutes > threshold) {
             // Send a nudge
             let message = config.messages[Math.floor(Math.random() * config.messages.length)];

             // Check custom messages
             if (config.customMessages[session.id]) {
                message = config.customMessages[session.id];
             }

             // If completed or failed, force resume message
             if (session.status === 'completed' || session.status === 'failed') {
                message = "Please resume working on this task.";
             }

             // Smart Pilot Logic
             if (config.smartPilotEnabled && config.supervisorApiKey) {
                addLog(`Consulting Supervisor for session ${session.id}...`, 'info');
                try {
                  const contextActivities = activities.slice(0, config.contextMessageCount).reverse();
                  const context = contextActivities.map(a => `${a.role.toUpperCase()}: ${a.content}`).join('\n');

            // DEBATE / SUPERVISOR LOGIC
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
                } catch (e) {
                  addLog(`Supervisor failed: ${e}`, 'error');
                }
             }

                  // Single Supervisor Logic
                  if (config.smartPilotEnabled) {
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
                         throw new Error('Supervisor API failed');
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

      } catch (error) {
        addLog(`Error checking sessions: ${error}`, 'error');
      }
    };

    // Initial check
    checkSessions();
    intervalRef.current = setInterval(checkSessions, config.checkIntervalSeconds * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, client, addLog, setStatusSummary]);

  return null;
}
