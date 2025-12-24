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

                  // Use the supervisor logic
                  // Note: Since we are in client side, we'd ideally proxy this.
                  // But for this feature implementation, assuming direct call is acceptable or key is safe in local storage.
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
