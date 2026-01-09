export type DaemonEventType =
  | 'connected'
  | 'daemon_status'
  | 'log_added'
  | 'sessions_interrupted'
  | 'sessions_continued'
  | 'session_updated'
  | 'session_nudged'
  | 'session_approved'
  | 'ping'
  | 'pong';

export interface DaemonEvent<T = unknown> {
  type: DaemonEventType;
  timestamp?: number;
  data?: T;
}

export interface DaemonStatusPayload {
  status: 'running' | 'stopped';
  sessionCount: number;
}

export interface LogAddedPayload {
  log: KeeperLog;
}

export interface SessionsInterruptedPayload {
  count: number;
  sessionIds: string[];
}

export interface SessionsContinuedPayload {
  count: number;
  sessionIds: string[];
}

export interface SessionUpdatedPayload {
  sessionId: string;
}

export interface SessionNudgedPayload {
  sessionId: string;
  sessionTitle?: string;
  inactiveMinutes: number;
  message: string;
}

export interface SessionApprovedPayload {
  sessionId: string;
  sessionTitle?: string;
}

export type LogType = 'info' | 'action' | 'error' | 'warn' | 'skip';

export interface KeeperLog {
  id: number;
  sessionId: string;
  type: LogType;
  message: string;
  metadata?: string | null;
  createdAt: string;
}

export function createDaemonEvent<T>(type: DaemonEventType, data?: T): DaemonEvent<T> {
  return {
    type,
    timestamp: Date.now(),
    data,
  };
}

export const WS_DEFAULTS = {
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
  PING_INTERVAL: 30000,
} as const;
