import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../hooks/useAppState.js';

interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

export default function SessionDetail({ sessionId, onBack }: SessionDetailProps) {
  const { sessions, activities, fetchActivities } = useAppStore();
  const session = sessions.find(s => s.id === sessionId);
  const [scrollIndex, setScrollIndex] = useState(0);

  useEffect(() => {
    fetchActivities(sessionId);
    // Refresh every 10 seconds as a fallback if WS doesn't trigger
    const interval = setInterval(() => fetchActivities(sessionId), 10000);
    return () => clearInterval(interval);
  }, [sessionId, fetchActivities]);

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      onBack();
    }
    if (key.upArrow) {
      setScrollIndex(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollIndex(prev => Math.min(Math.max(0, activities.length - 5), prev + 1));
    }
    if (input === 'r') {
      fetchActivities(sessionId);
    }
  });

  if (!session) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Session not found: {sessionId}</Text>
        <Text dimColor>Press [B]ack to return</Text>
      </Box>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user': return 'yellow';
      case 'agent': return 'green';
      case 'system': return 'blue';
      default: return 'white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'plan': return '📝';
      case 'progress': return '⚙️';
      case 'result': return '✅';
      case 'action': return '⚡';
      default: return '•';
    }
  };

  const visibleActivities = activities.slice(scrollIndex, scrollIndex + 10);

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold color="cyan">Session: {session.title || session.id}</Text>
        <Text dimColor> ({session.status})</Text>
        <Box flexGrow={1} />
        <Text dimColor>[R]efresh │ [B]ack</Text>
      </Box>

      <Box borderStyle="round" paddingX={1} flexDirection="column">
        <Box gap={2}>
          <Text bold>Repo:</Text>
          <Text>{session.sourceId}</Text>
          <Text bold>Branch:</Text>
          <Text>{session.branch || 'main'}</Text>
        </Box>
        <Box gap={2}>
          <Text bold>Created:</Text>
          <Text>{new Date(session.createdAt).toLocaleString()}</Text>
        </Box>
      </Box>

      <Text bold>Activity Feed ({activities.length})</Text>
      <Box borderStyle="single" flexDirection="column" paddingX={1} flexGrow={1} minHeight={12}>
        {activities.length === 0 ? (
          <Text dimColor>No activities found.</Text>
        ) : (
          visibleActivities.map((activity, index) => (
            <Box key={activity.id} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <Text color={getRoleColor(activity.role)}>[{activity.role.toUpperCase()}]</Text>
                <Text>{getTypeIcon(activity.type)}</Text>
                <Text dimColor>{new Date(activity.createdAt).toLocaleTimeString()}</Text>
              </Box>
              <Box paddingLeft={2}>
                <Text wrap="truncate-end">{activity.content.split('\n')[0]}</Text>
              </Box>
              {activity.diff && (
                <Box paddingLeft={2}>
                  <Text color="green">+ Git Patch Attached</Text>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>
      
      {activities.length > 10 && (
        <Box justifyContent="center">
          <Text dimColor>
            ↑↓ Scroll (Showing {scrollIndex + 1}-{Math.min(scrollIndex + 10, activities.length)} of {activities.length})
          </Text>
        </Box>
      )}
    </Box>
  );
}
