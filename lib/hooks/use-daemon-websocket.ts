'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSessionKeeperStore, Log } from '@/lib/stores/session-keeper';

const WS_URL = process.env.NEXT_PUBLIC_DAEMON_WS_URL || 'ws://localhost:8080/ws';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export interface DaemonEvent {
  type: 'daemon_status' | 'log_added' | 'sessions_interrupted' | 'sessions_continued' | 'session_updated' | 'session_nudged' | 'session_approved';
  data: any;
}

export function useDaemonWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const config = useSessionKeeperStore(state => state.config);
  const setStatusSummary = useSessionKeeperStore(state => state.setStatusSummary);
  const setPausedAll = useSessionKeeperStore(state => state.setPausedAll);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: DaemonEvent = JSON.parse(event.data);
      
      switch (message.type) {
        case 'daemon_status':
          setStatusSummary({
            monitoringCount: message.data.sessionCount || 0,
            lastAction: 'WS: ' + new Date().toLocaleTimeString(),
          });
          break;

        case 'log_added':
          const logData = message.data;
          const newLog: Log = {
            id: logData.id,
            time: new Date(logData.createdAt || Date.now()).toLocaleTimeString(),
            message: logData.message,
            type: logData.type as Log['type'],
            details: logData.metadata ? JSON.parse(logData.metadata) : undefined
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [newLog, ...state.logs].slice(0, 100)
          }));
          break;

        case 'sessions_interrupted':
          setPausedAll(true);
          break;

        case 'sessions_continued':
          setPausedAll(false);
          break;

        case 'session_updated':
          setStatusSummary({
            lastAction: `Session ${message.data.sessionId?.slice(-6) || 'unknown'} updated`,
          });
          break;

        case 'session_nudged':
          const nudgeLog: Log = {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            message: `Nudged session ${message.data.sessionId?.slice(0, 8)} (${message.data.inactiveMinutes}m inactive)`,
            type: 'action',
            details: { nudgeMessage: message.data.message }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [nudgeLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Nudged ${message.data.sessionTitle || message.data.sessionId?.slice(0, 8)}`,
          });
          break;

        case 'session_approved':
          const approveLog: Log = {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            message: `Auto-approved plan for ${message.data.sessionId?.slice(0, 8)}`,
            type: 'action'
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [approveLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Approved ${message.data.sessionTitle || message.data.sessionId?.slice(0, 8)}`,
          });
          break;

        default:
          console.log('[WS] Unknown event type:', message.type);
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }, [setStatusSummary, setPausedAll]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected to daemon');
        reconnectAttemptsRef.current = 0;
        setStatusSummary({
          lastAction: 'WS Connected',
        });
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        wsRef.current = null;

        if (config.isEnabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`[WS] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatusSummary({
            lastAction: 'WS: Max reconnect attempts reached',
          });
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WS] Failed to connect:', error);
    }
  }, [config.isEnabled, handleMessage, setStatusSummary]);

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

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send message, not connected');
    }
  }, []);

  useEffect(() => {
    if (config.isEnabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [config.isEnabled, connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send,
    reconnect: connect,
  };
}
