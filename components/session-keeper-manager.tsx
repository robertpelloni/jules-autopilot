'use client';

import { useEffect, useRef } from 'react';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { decideNextAction } from '@/lib/orchestration/supervisor';
import { Activity } from '@/types/jules';

export function SessionKeeperManager() {
  const { client } = useJules();
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
        const monitoredSessions = sessions.filter(s => s.status !== 'failed' && s.status !== 'completed'); // Only monitor active sessions for nudges?
        // Actually, requirements say "continuously loops through all sessions... sends... 'Please continue' if no activity".
        // But looping completed sessions is wasteful. However, the user might want to resume them.
        // Let's stick to the previous logic: monitor all, but treat completed/failed specially if needed.
        // Wait, previous logic in SessionKeeper.tsx *did* monitor completed/failed and auto-resumed them!
        // "If completed or failed, force resume message". I will keep that behavior.

        setStatusSummary({
          monitoringCount: sessions.length,
          lastAction: 'Checked ' + new Date().toLocaleTimeString(),
          nextCheckIn: config.checkIntervalSeconds
        });

        for (const session of sessions) {
          // Get all activities
          let activities: Activity[] = [];
          try {
             activities = await client.listActivities(session.id);
          } catch (e) {
             console.error(`Failed to list activities for ${session.id}`, e);
             continue;
          }

          if (activities.length === 0) {
             // If no activities, treat as inactive? Or new session?
             // If it has a prompt, maybe we should start it?
             // For now, skip empty sessions to avoid loops.
             continue;
          }

          // Sort Descending (Newest First)
          activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          const lastActivity = activities[0];
          const lastActivityTime = new Date(lastActivity.createdAt).getTime();
          const now = Date.now();
          const inactiveMinutes = (now - lastActivityTime) / (1000 * 60);

          // Determine threshold
          let threshold = config.inactivityThresholdMinutes;
          // Use working threshold for active states
          if (['active', 'in_progress', 'planning'].includes(session.status)) {
             threshold = config.activeWorkThresholdMinutes;
          }

          // Check for plan approval (High Priority)
          // Look for latest 'plan' activity
          if (lastActivity.type === 'plan' && !lastActivity.metadata?.planApproved) {
             addLog(`Approving plan for session ${session.id}`, 'action');
             await client.approvePlan(session.id);
             continue;
          }

          // Also check explicit "AWAITING_PLAN_APPROVAL" state if API provides it
          if (session.status === 'awaiting_approval') {
             addLog(`Approving plan for session ${session.id} (State: Awaiting Approval)`, 'action');
             await client.approvePlan(session.id);
             continue;
          }

          // Check for inactivity
          if (inactiveMinutes > threshold) {
             let message = '';

             // 1. DEBATE MODE
             if (config.debateEnabled && config.debateParticipants && config.debateParticipants.length > 0) {
                addLog(`Convening Council for ${session.id}...`, 'info');
                try {
                    // Prepare context (Oldest first for context)
                    const contextActivities = [...activities].reverse().slice(-config.contextMessageCount);
                    const history = contextActivities.map(a => ({
                        role: a.role === 'agent' ? 'assistant' : 'user',
                        content: a.content
                    }));

                    const response = await fetch('/api/supervisor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'debate',
                            messages: history,
                            participants: config.debateParticipants
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        message = data.content;
                        addLog(`Council Verdict: "${message.substring(0, 30)}..."`, 'action');
                    } else {
                        addLog('Council debate failed, falling back.', 'error');
                    }
                } catch (e) {
                    addLog(`Council error: ${e}`, 'error');
                }
             }

             // 2. SMART PILOT (Single Supervisor)
             if (!message && config.smartPilotEnabled && config.supervisorApiKey) {
                addLog(`Consulting Supervisor for ${session.id}...`, 'info');
                try {
                  const contextActivities = [...activities].reverse().slice(-config.contextMessageCount);
                  const context = contextActivities.map(a => `${a.role.toUpperCase()}: ${a.content}`).join('\n');

                  const supervisorMessage = await decideNextAction(
                    config.supervisorProvider,
                    config.supervisorApiKey,
                    config.supervisorModel,
                    `The user is inactive. The last activity was: ${lastActivity.content}. \n\n Recent Context:\n ${context}`
                  );

                  if (supervisorMessage) {
                    message = supervisorMessage;
                  }
                } catch (e) {
                  addLog(`Supervisor failed: ${e}`, 'error');
                }
             }

             // 3. FALLBACK MESSAGES
             if (!message) {
                 // Custom messages
                 if (config.customMessages[session.id] && config.customMessages[session.id].length > 0) {
                    const customList = config.customMessages[session.id];
                    message = customList[Math.floor(Math.random() * customList.length)];
                 } else {
                    // Global messages
                    message = config.messages[Math.floor(Math.random() * config.messages.length)];
                 }

                 // Force resume message if completed/failed
                 if (session.status === 'completed' || session.status === 'failed') {
                    message = "Please resume working on this task.";
                 }
             }

             addLog(`Sending nudge to ${session.id} (${inactiveMinutes.toFixed(1)}m > ${threshold}m): "${message}"`, 'action');
             await client.createActivity({
               sessionId: session.id,
               content: message,
               type: 'message'
             });
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
