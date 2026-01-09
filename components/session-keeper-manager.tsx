'use client';

import { useEffect } from 'react';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { useDaemonWebSocket } from '@/lib/hooks/use-daemon-websocket';

export function SessionKeeperManager() {
  const config = useSessionKeeperStore(state => state.config);
  const loadConfig = useSessionKeeperStore(state => state.loadConfig);
  const loadLogs = useSessionKeeperStore(state => state.loadLogs);
  const setStatusSummary = useSessionKeeperStore(state => state.setStatusSummary);

  useDaemonWebSocket();

  useEffect(() => {
    loadConfig();
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
