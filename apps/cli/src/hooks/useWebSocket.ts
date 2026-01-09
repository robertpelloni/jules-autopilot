import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from './useAppState';

const WS_URL = process.env.JULES_WS_URL || 'ws://localhost:8080/ws';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface DaemonEvent {
  type: string;
  timestamp?: number;
  [key: string]: any;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: DaemonEvent = JSON.parse(event.data);
      
      switch (message.type) {
        case 'connected':
          useAppStore.setState({ isConnected: true, error: null });
          break;

        case 'daemon_status':
          useAppStore.setState(state => ({
            daemonStatus: state.daemonStatus ? {
              ...state.daemonStatus,
              isEnabled: message.status === 'running',
              lastCheck: new Date().toISOString()
            } : {
              isEnabled: message.status === 'running',
              lastCheck: new Date().toISOString(),
              logs: []
            }
          }));
          break;

        case 'log_added':
          const log = message.log;
          if (log) {
            useAppStore.setState(state => ({
              logs: [log, ...state.logs].slice(0, 100)
            }));
          }
          break;

        case 'sessions_interrupted':
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: 'global',
              type: 'action' as const,
              message: `Interrupted ${message.count} sessions`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;

        case 'sessions_continued':
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: 'global',
              type: 'action' as const,
              message: `Continued ${message.count} sessions`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;

        case 'session_nudged':
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: message.sessionId,
              type: 'action' as const,
              message: `Nudged ${message.sessionId?.slice(0, 8)} (${message.inactiveMinutes}m inactive)`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;

        case 'session_approved':
          useAppStore.setState(state => ({
            logs: [{
              id: Date.now(),
              sessionId: message.sessionId,
              type: 'action' as const,
              message: `Auto-approved plan for ${message.sessionId?.slice(0, 8)}`,
              createdAt: new Date().toISOString()
            }, ...state.logs].slice(0, 100)
          }));
          break;

        case 'pong':
          break;

        default:
          break;
      }
    } catch {
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        useAppStore.setState({ isConnected: true, error: null });
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        wsRef.current = null;
        useAppStore.setState({ isConnected: false });

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        } else {
          useAppStore.setState({ error: 'Max reconnect attempts reached' });
        }
      };

      ws.onerror = () => {
        useAppStore.setState({ error: 'WebSocket error' });
      };

      wsRef.current = ws;
    } catch {
      useAppStore.setState({ error: 'Failed to connect' });
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  useEffect(() => {
    connect();
    
    const pingInterval = setInterval(sendPing, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect,
    disconnect
  };
}
