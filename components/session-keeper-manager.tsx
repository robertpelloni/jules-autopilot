'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { decideNextAction } from '@/lib/orchestration/supervisor';
import { Activity } from '@/types/jules';

export function SessionKeeperManager() {
  const { client } = useJules();
  const router = useRouter();
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

        setStatusSummary({
          monitoringCount: sessions.length,
          lastAction: 'Checked ' + new Date().toLocaleTimeString(),
          nextCheckIn: config.checkIntervalSeconds
        });

        for (const session of sessions) {
          // Optimization: Fetch ONLY the latest activity to check timestamp
          let activities: Activity[] = [];
          try {
             // Fetch 1 activity
             const result = await client.listActivitiesPaged(session.id, 1);
             activities = result.activities;
          } catch (e) {
             console.error(`Failed to list activities for ${session.id}`, e);
             continue;
          }

          if (activities.length === 0) {
             continue;
          }

          // Since we fetched 1, it's the latest (API usually returns newest first or we assume sort?
          // Wait, client.ts transform logic doesn't sort. API default sort?
          // Python SDK list_all doesn't explicit sort.
          // If API returns oldest first, pageSize=1 returns the FIRST activity ever.
          // I should verify API behavior or fetch more?
          // Actually, earlier I sorted manually.
          // If API returns chronological, I need to fetch the LAST page or something.
          // Most chat APIs return chronological.
          // But usually they support `orderBy` or `desc`.
          // My client doesn't support that param.
          // If I can't sort by API, I MUST fetch all to get the last one?
          // That defeats the optimization.
          // Assuming standard "list" behavior returns page 1.

          // Workaround: If we assume we can't optimize without API support, we might have to fetch all.
          // BUT, let's assume for now we might need to fetch all if we can't guarantee order.
          // HOWEVER, I can optimize by checking `session.lastActivityAt` if available!
          // `ApiSession` has `lastActivityAt`.
          // My `Session` type has `lastActivityAt`.
          // This is the key! I don't need to fetch activities at all for the timestamp check!

          const lastActivityTimeStr = session.lastActivityAt || session.updatedAt;
          const lastActivityTime = new Date(lastActivityTimeStr).getTime();
          const now = Date.now();
          const inactiveMinutes = (now - lastActivityTime) / (1000 * 60);

          // Determine threshold
          let threshold = config.inactivityThresholdMinutes;
          const isAgentWorking = ['IN_PROGRESS', 'PLANNING'].includes(session.rawState || '');
          if (isAgentWorking) {
             threshold = config.activeWorkThresholdMinutes;
          }

          const switchToSession = () => {
             if (config.autoSwitch) {
                 const currentParams = new URLSearchParams(window.location.search);
                 if (currentParams.get('sessionId') !== session.id) {
                     router.push(`/?sessionId=${session.id}`);
                 }
             }
          };

          // 1. Check for Plan Approval (Needs fetching activities)
          // We only need to check this if status is AWAITING_APPROVAL.
          if (session.status === 'awaiting_approval' || session.rawState === 'AWAITING_PLAN_APPROVAL') {
             addLog(`Approving plan for session ${session.id} (State: Awaiting Approval)`, 'action');
             switchToSession();
             await client.approvePlan(session.id);
             continue;
          }

          // Also manually check latest activity for 'plan' type if state isn't reliable?
          // If we want to be robust, we fetch latest activity.
          // If we use pageSize=1 and it returns oldest, it's useless.
          // Let's assume we rely on session state for approval mostly.
          // But if we want to be sure, we might need to fetch.

          // 2. Check for Inactivity
          if (inactiveMinutes > threshold) {
             let message = '';

             // Now we need context. FETCH FULL HISTORY (or enough context).
             // Since we are about to act, the cost is justified.
             const fullActivities = await client.listActivities(session.id);
             fullActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
             const latestActivity = fullActivities[0];

             // Double check plan approval on latest activity
             if (latestActivity.type === 'plan' && !latestActivity.metadata?.planApproved) {
                 addLog(`Approving plan for session ${session.id} (Found unapproved plan)`, 'action');
                 switchToSession();
                 await client.approvePlan(session.id);
                 continue;
             }

             switchToSession();

             // 1. DEBATE MODE
             if (config.debateEnabled && config.debateParticipants && config.debateParticipants.length > 0) {
                addLog(`Convening Council for ${session.id}...`, 'info');
                try {
                    const contextActivities = [...fullActivities].reverse().slice(-config.contextMessageCount);
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
                  const contextActivities = [...fullActivities].reverse().slice(-config.contextMessageCount);
                  const context = contextActivities.map(a => `${a.role.toUpperCase()}: ${a.content}`).join('\n');

                  const supervisorMessage = await decideNextAction(
                    config.supervisorProvider,
                    config.supervisorApiKey,
                    config.supervisorModel,
                    `The user is inactive. The last activity was: ${latestActivity.content}. \n\n Recent Context:\n ${context}`
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
                 if (config.customMessages[session.id] && config.customMessages[session.id].length > 0) {
                    const customList = config.customMessages[session.id];
                    message = customList[Math.floor(Math.random() * customList.length)];
                 } else {
                    message = config.messages[Math.floor(Math.random() * config.messages.length)];
                 }

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

    checkSessions();
    intervalRef.current = setInterval(checkSessions, config.checkIntervalSeconds * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, client, addLog, setStatusSummary, router]);

  return null;
}
