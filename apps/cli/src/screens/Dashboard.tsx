import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../hooks/useAppState.js';

interface DashboardProps {
  onNavigate: (screen: 'dashboard' | 'sessions' | 'session-detail' | 'logs' | 'settings') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { 
    daemonStatus, 
    logs,
    refreshStatus,
    startDaemon,
    stopDaemon,
    interruptAllSessions,
    continueAllSessions
  } = useAppStore();

  useEffect(() => {
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useInput((input, key) => {
    if (input === 's') {
      if (daemonStatus?.isEnabled) {
        stopDaemon();
      } else {
        startDaemon();
      }
    }
    if (input === 'i') interruptAllSessions();
    if (input === 'c') continueAllSessions();
    if (input === 'r') refreshStatus();
  });

  const recentLogs = logs.slice(0, 10);
  const activeCount = logs.filter(l => l.type === 'action').length;
  const errorCount = logs.filter(l => l.type === 'error').length;

  return (
    <Box flexDirection="column" gap={1}>
      <Box borderStyle="round" paddingX={2} paddingY={1}>
        <Box flexDirection="column" gap={1}>
          <Text bold>Daemon Status</Text>
          <Box gap={4}>
            <Box flexDirection="column">
              <Text>Status:</Text>
              <Text color={daemonStatus?.isEnabled ? 'green' : 'yellow'}>
                {daemonStatus?.isEnabled ? '● Running' : '○ Stopped'}
              </Text>
            </Box>
            <Box flexDirection="column">
              <Text>Last Check:</Text>
              <Text dimColor>
                {daemonStatus?.lastCheck 
                  ? new Date(daemonStatus.lastCheck).toLocaleTimeString() 
                  : 'Never'}
              </Text>
            </Box>
            <Box flexDirection="column">
              <Text>Actions:</Text>
              <Text color="cyan">{activeCount}</Text>
            </Box>
            <Box flexDirection="column">
              <Text>Errors:</Text>
              <Text color={errorCount > 0 ? 'red' : 'green'}>{errorCount}</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box borderStyle="round" paddingX={2} paddingY={1} flexDirection="column">
        <Text bold>Quick Actions</Text>
        <Box gap={2} marginTop={1}>
          <Text color="cyan">[S]</Text>
          <Text>{daemonStatus?.isEnabled ? 'Stop Daemon' : 'Start Daemon'}</Text>
          <Text dimColor>│</Text>
          <Text color="cyan">[I]</Text>
          <Text>Interrupt All</Text>
          <Text dimColor>│</Text>
          <Text color="cyan">[C]</Text>
          <Text>Continue All</Text>
          <Text dimColor>│</Text>
          <Text color="cyan">[R]</Text>
          <Text>Refresh</Text>
        </Box>
      </Box>

      <Box borderStyle="round" paddingX={2} paddingY={1} flexDirection="column" flexGrow={1}>
        <Text bold>Recent Activity</Text>
        <Box flexDirection="column" marginTop={1}>
          {recentLogs.length === 0 ? (
            <Text dimColor>No recent activity</Text>
          ) : (
            recentLogs.map((log, i) => (
              <Box key={log.id || i} gap={1}>
                <Text dimColor>{new Date(log.createdAt).toLocaleTimeString()}</Text>
                <Text color={
                  log.type === 'error' ? 'red' : 
                  log.type === 'action' ? 'green' : 
                  log.type === 'skip' ? 'yellow' : 'white'
                }>
                  [{log.type.toUpperCase().padEnd(6)}]
                </Text>
                <Text>{log.message.slice(0, 60)}{log.message.length > 60 ? '...' : ''}</Text>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
