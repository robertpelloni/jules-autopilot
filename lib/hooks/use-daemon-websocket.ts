'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSessionKeeperStore, Log } from '@/lib/stores/session-keeper';
import type {
  DaemonEvent,
  DaemonStatusPayload,
  LogAddedPayload,
  SessionNudgedPayload,
  SessionApprovedPayload,
} from '@jules/shared';
import { WS_DEFAULTS } from '@jules/shared';
import { emitDaemonEvent } from './use-daemon-events';

const WS_URL = process.env.NEXT_PUBLIC_DAEMON_WS_URL || 'ws://localhost:8080/ws';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export function useDaemonWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(0);

  useEffect(() => {
    lastPongRef.current = Date.now();
  }, []);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [latency, setLatency] = useState<number | null>(null);

  const config = useSessionKeeperStore(state => state.config);
  const setStatusSummary = useSessionKeeperStore(state => state.setStatusSummary);
  const setPausedAll = useSessionKeeperStore(state => state.setPausedAll);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: DaemonEvent = JSON.parse(event.data);
      
      emitDaemonEvent(message);
      
      switch (message.type) {
        case 'daemon_status': {
          const payload = message.data as DaemonStatusPayload;
          setStatusSummary({
            monitoringCount: payload?.sessionCount || 0,
            lastAction: 'WS: ' + new Date().toLocaleTimeString(),
          });
          break;
        }

        case 'log_added': {
          const payload = message.data as LogAddedPayload;
          if (payload?.log) {
            const newLog: Log = {
              id: String(payload.log.id),
              time: new Date(payload.log.createdAt || Date.now()).toLocaleTimeString(),
              message: payload.log.message,
              type: payload.log.type as Log['type'],
              details: payload.log.metadata ? JSON.parse(payload.log.metadata) : undefined
            };
            useSessionKeeperStore.setState((state) => ({
              logs: [newLog, ...state.logs].slice(0, 100)
            }));
          }
          break;
        }

        case 'sessions_interrupted':
          setPausedAll(true);
          break;

        case 'sessions_continued':
          setPausedAll(false);
          break;

        case 'session_updated': {
          const payload = message.data as { sessionId?: string };
          setStatusSummary({
            lastAction: `Session ${payload?.sessionId?.slice(-6) || 'unknown'} updated`,
          });
          break;
        }

        case 'session_nudged': {
          const payload = message.data as SessionNudgedPayload;
          const nudgeLog: Log = {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            message: `Nudged session ${payload?.sessionId?.slice(0, 8)} (${payload?.inactiveMinutes ?? 0}m inactive)`,
            type: 'action',
            details: { nudgeMessage: payload?.message }
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [nudgeLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Nudged ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'session_approved': {
          const payload = message.data as SessionApprovedPayload;
          const approveLog: Log = {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            message: `Auto-approved plan for ${payload?.sessionId?.slice(0, 8)}`,
            type: 'action'
          };
          useSessionKeeperStore.setState((state) => ({
            logs: [approveLog, ...state.logs].slice(0, 100)
          }));
          setStatusSummary({
            lastAction: `Approved ${payload?.sessionTitle || payload?.sessionId?.slice(0, 8)}`,
          });
          break;
        }

        case 'pong': {
          lastPongRef.current = Date.now();
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          const pingTime = (message.data as { timestamp?: number })?.timestamp;
          if (pingTime) {
            setLatency(Date.now() - pingTime);
          }
          break;
        }

        default:
          break;
      }
    } catch {
    }
  }, [setStatusSummary, setPausedAll]);

  const connectRef = useRef<() => void>(() => {});

  const attemptConnection = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setConnectionState('connected');
        lastPongRef.current = Date.now();
        setStatusSummary({
          lastAction: 'WS Connected',
        });
        
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const pingTime = Date.now();
            wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: pingTime }));
            
            pongTimeoutRef.current = setTimeout(() => {
              const timeSinceLastPong = Date.now() - lastPongRef.current;
              if (timeSinceLastPong > WS_DEFAULTS.PING_INTERVAL * 2) {
                setConnectionState('reconnecting');
                wsRef.current?.close(4000, 'Ping timeout');
              }
            }, WS_DEFAULTS.PING_INTERVAL);
          }
        }, WS_DEFAULTS.PING_INTERVAL);
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        wsRef.current = null;
        setConnectionState('disconnected');

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        if (pongTimeoutRef.current) {
          clearTimeout(pongTimeoutRef.current);
          pongTimeoutRef.current = null;
        }

        if (config.isEnabled && reconnectAttemptsRef.current < WS_DEFAULTS.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          setConnectionState('reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), WS_DEFAULTS.RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= WS_DEFAULTS.MAX_RECONNECT_ATTEMPTS) {
          setStatusSummary({
            lastAction: 'WS: Max reconnect attempts reached',
          });
        }
      };

      ws.onerror = () => {
      };

      wsRef.current = ws;
    } catch {
    }
  }, [config.isEnabled, handleMessage, setStatusSummary]);

  useEffect(() => {
    connectRef.current = attemptConnection;
  }, [attemptConnection]);

  const connect = useCallback(() => {
    attemptConnection();
  }, [attemptConnection]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (config.isEnabled) {
      connect();
    } else {
      // Wrap in setTimeout to avoid synchronous state update warning during effect
      setTimeout(() => disconnect(), 0);
    }

    return () => {
      disconnect();
    };
  }, [config.isEnabled, connect, disconnect]);

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    latency,
    send,
    reconnect: connect,
  };
}
