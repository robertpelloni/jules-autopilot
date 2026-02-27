'use client';

import { useEffect } from 'react';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { useEventStream } from '@/lib/hooks/use-event-stream';

export function SessionKeeperManager() {
  const config = useSessionKeeperStore(state => state.config);
  const loadConfig = useSessionKeeperStore(state => state.loadConfig);
  const loadLogs = useSessionKeeperStore(state => state.loadLogs);
  const setStatusSummary = useSessionKeeperStore(state => state.setStatusSummary);
  const addLog = useSessionKeeperStore(state => state.addLog);

  // Replaces the deprecated daemon websocket with Next.js SSE
  useEventStream({
    autoConnect: true,
    onEvent: (event) => {
      try {
        if (event.type === 'connected') {
          setStatusSummary({ lastAction: 'SSE Connected' });
        } else if (event.type === 'keeper:action') {
          // SSE pushing new keeper logs in real-time
          const data = event.data as any;
          if (data && data.message) {
            // Append directly to the Zustand store
            addLog(data.message, data.type || 'info');
            setStatusSummary({ lastAction: data.message.substring(0, 40) });
          }
        }
      } catch (e) {
        // Silently ignore format errors
      }
    }
  });

  useEffect(() => {
    loadConfig();
    // Initial fetch of historical logs
    loadLogs();
  }, [loadConfig, loadLogs]);

  useEffect(() => {
    if (!config.isEnabled) {
      setStatusSummary({
        monitoringCount: 0,
        lastAction: 'Disabled',
        nextCheckIn: 0
      });
    }
  }, [config.isEnabled, setStatusSummary]);

  return null;
}
