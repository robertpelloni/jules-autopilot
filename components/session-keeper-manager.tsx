'use client';

import { useEffect, useRef } from 'react';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';

export function SessionKeeperManager() {
  const { client } = useJules();
  
  const config = useSessionKeeperStore(state => state.config);
  const isPausedAll = useSessionKeeperStore(state => state.isPausedAll);
  const setStatusSummary = useSessionKeeperStore(state => state.setStatusSummary);
  const loadConfig = useSessionKeeperStore(state => state.loadConfig);
  const loadLogs = useSessionKeeperStore(state => state.loadLogs);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, [loadConfig, loadLogs]);

  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (!config.isEnabled || !client) {
      setStatusSummary({
        monitoringCount: 0,
        lastAction: 'Disabled',
        nextCheckIn: 0
      });
      return;
    }

    const pollStatus = async () => {
      if (isPausedAll) {
        setStatusSummary({
          lastAction: 'Global Pause Active',
        });
        return;
      }

      try {
        await loadLogs();
        
        setStatusSummary({
          lastAction: 'Sync: ' + new Date().toLocaleTimeString(),
          nextCheckIn: Date.now() + 30000
        });
      } catch (error) {
        console.error('[SessionKeeper] Sync Error:', error);
      }
    };

    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, 30000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [config.isEnabled, isPausedAll, client, loadLogs, setStatusSummary]);

  return null;
}
