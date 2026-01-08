'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { Session, Activity } from '@/types/jules';

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
  
  // Use granular selectors to prevent re-renders when other parts of the store (like statusSummary) change
  const config = useSessionKeeperStore(state => state.config);
  const addLog = useSessionKeeperStore(state => state.addLog);
  const addDebate = useSessionKeeperStore(state => state.addDebate);
  const setStatusSummary = useSessionKeeperStore(state => state.setStatusSummary);
  const updateSessionState = useSessionKeeperStore(state => state.updateSessionState);
  const incrementStat = useSessionKeeperStore(state => state.incrementStat);
  const loadConfig = useSessionKeeperStore(state => state.loadConfig);
  const loadLogs = useSessionKeeperStore(state => state.loadLogs);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);
  const hasSwitchedRef = useRef(false);

  // Load configuration and logs on mount
  useEffect(() => {
    loadConfig();
    loadLogs();
  }, [loadConfig, loadLogs]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!config.isEnabled || !client) {
      if (config.isEnabled && !client) console.warn('[SessionKeeper] Enabled but no client available');
      setStatusSummary({
        monitoringCount: 0,
        lastAction: 'Disabled',
        nextCheckIn: 0
      });
      return;
    }

    const runLoop = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      hasSwitchedRef.current = false;

      try {
        const sessions = await client.listSessions();
        // Filter out archived if we had a way to check, for now assume all returned are relevant
        const monitoredSessions = sessions;

        setStatusSummary({
          monitoringCount: monitoredSessions.length,
          lastAction: 'Checked ' + new Date().toLocaleTimeString(),
          nextCheckIn: Date.now() + (config.checkIntervalSeconds * 1000)
        });

        // Load Supervisor State
        const savedState = localStorage.getItem('jules_supervisor_state');
        const supervisorState: SupervisorState = savedState ? JSON.parse(savedState) : {};
        let stateChanged = false;

        const generateMessage = async (session: Session) => {
            let messageToSend = '';

            // DEBATE MODE OR SMART PILOT
            if ((config.debateEnabled && config.debateParticipants && config.debateParticipants.length > 0) || (config.smartPilotEnabled && config.supervisorApiKey)) {
              try {
                // Fetch ALL activities
                const activities = await client.listActivities(session.id);
                if (session.prompt && !activities.some((a: Activity) => a.content === session.prompt)) {
                    activities.unshift({
                        id: 'initial-prompt',
                        sessionId: session.id,
                        type: 'message',
                        role: 'user',
                        content: session.prompt,
                        createdAt: session.createdAt
                    } as Activity);
                }
                const sortedActivities = activities.sort((a: Activity, b: Activity) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                // Debate / Conference Logic
                let mode = 'single';
                let isDebateOrConference = !!config.debateEnabled;
                
                if (isDebateOrConference) {
                    mode = 'debate';
                }
                
                // Double-check safeguard
                if (mode === 'single') {
                    isDebateOrConference = false;
                }

                if (isDebateOrConference && config.debateParticipants && config.debateParticipants.length > 0) {
                    // Validate participants have API keys
                    const validParticipants = config.debateParticipants.filter(p => p.apiKey && p.apiKey.trim().length > 0);
                    
                    if (validParticipants.length === 0) {
                        throw new Error(`No valid participants for ${mode}. Please check API keys in Session Keeper settings.`);
                    }

                    addLog(`Convening ${mode === 'conference' ? 'Conference' : 'Council'} (${validParticipants.length} members)...`, 'info');

                    // Prepare simple history for debate (stateless usually)
                    const history = sortedActivities.map((a: Activity) => ({
                        role: a.role === 'agent' ? 'assistant' : 'user',
                        content: a.content
                    })).slice(-config.contextMessageCount);

                    const response = await fetch('/api/supervisor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: mode,
                            messages: history,
                            participants: validParticipants
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        messageToSend = data.content;
                        
                        // Save Debate Result
                        addDebate({
                            id: Date.now().toString(),
                            sessionId: session.id,
                            timestamp: Date.now(),
                            mode: mode as 'debate' | 'conference',
                            opinions: data.opinions || [],
                            finalInstruction: messageToSend
                        });

                        if (data.opinions) {
                            data.opinions.forEach((op: { participant: { provider: string }, content: string }) => {
                                addLog(`Member (${op.participant.provider}): ${op.content.substring(0, 30)}...`, 'info');
                            });
                        }
                        addLog(`${mode === 'conference' ? 'Conference' : 'Council'} Result: "${messageToSend.substring(0, 30)}..."`, 'action');
                        incrementStat('totalDebates');
                    } else {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(`${mode} failed: ${err.error || 'Unknown'}`);
                    }

                }
                // Single Supervisor Logic
                else if (config.smartPilotEnabled) {
                    addLog(`Asking Supervisor (${config.supervisorProvider})...`, 'info');

                    // State Management
                    if (!supervisorState[session.id]) {
                      supervisorState[session.id] = { lastProcessedActivityTimestamp: '', history: [] };
                    }
                    const sessionState = supervisorState[session.id];

                    // Identify NEW activities
                    let newActivities = sortedActivities;
                    if (sessionState.lastProcessedActivityTimestamp) {
                      newActivities = sortedActivities.filter((a: Activity) => new Date(a.createdAt).getTime() > new Date(sessionState.lastProcessedActivityTimestamp).getTime());
                    }

                    const isStateful = config.supervisorProvider === 'openai-assistants';
                    let messagesToSend: { role: string, content: string }[] = [];

                    if (newActivities.length > 0) {
                      if (sessionState.history.length === 0 && !sessionState.openaiThreadId) {
                        const fullSummary = newActivities.map((a: Activity) => `${a.role.toUpperCase()}: ${a.content}`).join('\n\n');
                        messagesToSend.push({ role: 'user', content: `Here is the full conversation history so far. Please analyze the state and provide the next instruction:\n\n${fullSummary}` });
                      } else {
                        const updates = newActivities.map((a: Activity) => `${a.role.toUpperCase()}: ${a.content}`).join('\n\n');
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
                console.error('Supervisor/Debate Error:', err);
                addLog(`Auto-Pilot error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
              }
            }

            // Fallback if smart pilot disabled or failed
            if (!messageToSend) {
              let messages = config.messages;
              if (config.customMessages && config.customMessages[session.id] && config.customMessages[session.id].length > 0) {
                messages = config.customMessages[session.id];
              }
              
              if (messages.length === 0) {
                return "Please resume working on this task.";
              }
              messageToSend = messages[Math.floor(Math.random() * messages.length)];
            }
            return messageToSend;
        };

        for (const session of monitoredSessions) {
          // Check if session is ignored due to error
          const { sessionStates } = useSessionKeeperStore.getState();
          const sessionState = sessionStates[session.id];
          if (sessionState?.ignoreUntil && sessionState.ignoreUntil > Date.now()) {
            continue;
          }

          try {
            // Helper to switch session safely
            const safeSwitch = (targetId: string) => {
              const cleanId = targetId.replace('sessions/', '');
              const targetPath = `/?sessionId=${cleanId}`;
              if (config.autoSwitch && !hasSwitchedRef.current) {
                 router.push(targetPath);
                 hasSwitchedRef.current = true;
              }
            };

            // Clear previous error if any
            if (sessionState?.error) {
              updateSessionState(session.id, { error: undefined });
            }

            // 0. CHECK FOR HANDOFF (30 Days Old)
            const createdTime = new Date(session.createdAt);
            const ageMs = Date.now() - createdTime.getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            const HANDOFF_THRESHOLD_DAYS = 30;

            if (ageDays >= HANDOFF_THRESHOLD_DAYS && session.status !== "completed" && session.status !== "failed") {
               addLog(`Session ${session.id.substring(0, 8)} is ${Math.floor(ageDays)} days old. Initiating handoff...`, "action");
               
               // 1. Fetch History
               const activities = await client.listActivities(session.id);
               const history = activities.map((a: Activity) => ({
                   role: a.role === "agent" ? "assistant" : "user",
                   content: a.content
               }));

               // 2. Summarize
               const summaryResponse = await fetch("/api/supervisor", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({
                       action: "handoff",
                       messages: history,
                       provider: config.supervisorProvider || "openai",
                       apiKey: config.supervisorApiKey,
                       model: config.supervisorModel
                   })
               });

               if (summaryResponse.ok) {
                   const { content: summary } = await summaryResponse.json();
                   
                  // 3. Create New Session
                  const newSession = await client.createSession(
                      session.sourceId,
                      session.prompt || "Continuing previous session",
                      `${session.title || "Untitled"} (Part 2)`
                  );

                   // 4. Inject Handoff Log
                   await client.createActivity({
                       sessionId: newSession.id,
                       content: `*** SESSION HANDOFF ***

Previous Session Summary:
${summary}

Original Start Date: ${session.createdAt}`,
                       type: "message"
                   });

                   addLog(`Created new session ${newSession.id.substring(0, 8)} with handoff log.`, "action");

                   // 5. Archive Old Session
                   await client.createActivity({
                       sessionId: session.id,
                       content: `*** SESSION ARCHIVED ***

This session has been handed off to ${newSession.id}. Marking as completed.`,
                       type: "message"
                   });
                   
                   safeSwitch(newSession.id);
                   continue; // Skip further processing for this old session
               } else {
                   addLog(`Handoff failed for ${session.id}: Supervisor error`, "error");
               }
            }
            // 1. Resume Paused/Completed/Failed (ONLY IF enabled in config)
            if (config.resumePaused && (session.status === 'paused' || session.status === 'completed' || session.status === 'failed')) {
               addLog(`Resuming ${session.status} session ${session.id.substring(0, 8)}...`, 'action');
               safeSwitch(session.id);
               
               const message = await generateMessage(session);
               await client.resumeSession(session.id, message);
               
               addLog(`Resumed ${session.id.substring(0, 8)}`, 'action');
               continue;
            }

            // 2. Approve Plans
            if (session.status === 'awaiting_approval' || session.rawState === 'AWAITING_PLAN_APPROVAL') {
              addLog(`Approving plan for session ${session.id.substring(0, 8)}...`, 'action');
              safeSwitch(session.id);
              await client.approvePlan(session.id);
              addLog(`Plan approved for ${session.id.substring(0, 8)}`, 'action');
              incrementStat('totalApprovals');
              continue;
            }

            // 3. Check for Inactivity & Nudge
            const lastActivityTime = session.lastActivityAt ? new Date(session.lastActivityAt) : new Date(session.updatedAt);
            const diffMs = Date.now() - lastActivityTime.getTime();
            const diffMinutes = diffMs / 60000;

            // Determine threshold
            let threshold = config.inactivityThresholdMinutes;
            if (session.rawState === 'IN_PROGRESS') {
               threshold = config.activeWorkThresholdMinutes;
               // Guard: If actively working (<30s), always skip
               if (diffMs < 30000) {
                 continue;
               }
            }

            if (diffMinutes > threshold) {
              safeSwitch(session.id);
              const messageToSend = await generateMessage(session);
              if (!messageToSend) {
                  addLog(`Skipped ${session.id.substring(0, 8)}: No messages configured`, 'skip');
                  continue;
              }
              
              addLog(`Sending nudge to ${session.id.substring(0, 8)} (${Math.round(diffMinutes)}m inactive)`, 'action');
              await client.createActivity({
                sessionId: session.id,
                content: messageToSend,
                type: 'message'
              });
              addLog(`Nudge sent`, 'action');
              incrementStat('totalNudges');
            } else if (diffMinutes > threshold * 0.8) {
               addLog(`Monitoring ${session.id.substring(0, 8)}: ${diffMinutes.toFixed(1)}m/${threshold}m inactive`, 'info');
            }
          } catch (err: unknown) {
            const error = err as { message?: string; status?: number };
            const isRateLimit = error.message?.includes('429') || error.status === 429;
            const errorMsg = isRateLimit ? 'Rate Limit (429)' : (error.message || 'Unknown error');
            
            addLog(`Error processing ${session.id.substring(0, 8)}: ${errorMsg}`, 'error');
            
            const ignoreDuration = isRateLimit ? 5 * 60 * 1000 : 0; // 5 minutes for 429

            updateSessionState(session.id, { 
              error: { 
                code: isRateLimit ? 429 : 500, 
                message: errorMsg, 
                timestamp: Date.now() 
              },
              ignoreUntil: isRateLimit ? Date.now() + ignoreDuration : undefined
            });
          }
          // Add a delay to prevent rate limiting (increased to 3s)
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Save State if changed
        if (stateChanged) {
          localStorage.setItem('jules_supervisor_state', JSON.stringify(supervisorState));
        }

      } catch (error) {
        addLog(`Error checking sessions: ${error}`, 'error');
      } finally {
        processingRef.current = false;
      }
    };

    // Initial check
    runLoop();
    intervalRef.current = setInterval(runLoop, config.checkIntervalSeconds * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, client, apiKey, addLog, setStatusSummary, incrementStat, updateSessionState]);

  return null;
}
