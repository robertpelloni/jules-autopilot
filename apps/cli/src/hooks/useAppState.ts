import { create } from 'zustand';
import type { KeeperLog } from '@jules/shared';

interface Session {
  id: string;
  sourceId: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'awaiting_approval';
  rawState?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  branch?: string;
}

interface Activity {
  id: string;
  sessionId: string;
  type: 'message' | 'plan' | 'progress' | 'result' | 'action';
  role: 'user' | 'agent' | 'system';
  content: string;
  createdAt: string;
  diff?: string;
  bashOutput?: string;
}

type LogEntry = KeeperLog;

interface DaemonStatus {
  isEnabled: boolean;
  lastCheck?: string;
  logs: LogEntry[];
}

interface AppState {
  isConnected: boolean;
  error: string | null;
  daemonStatus: DaemonStatus | null;
  sessions: Session[];
  selectedSession: Session | null;
  activities: Activity[];
  logs: LogEntry[];
  stats: {
    totalSessions: number;
    activeSessions: number;
    awaitingApproval: number;
  };
  
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshStatus: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  fetchActivities: (sessionId: string) => Promise<void>;
  indexCodebase: () => Promise<void>;
  startDaemon: () => Promise<void>;
  stopDaemon: () => Promise<void>;
  interruptAllSessions: () => Promise<void>;
  continueAllSessions: () => Promise<void>;
  setError: (error: string | null) => void;
}

const API_BASE = process.env.JULES_API_URL || 'http://localhost:8080';

export const useAppStore = create<AppState>((set, get) => ({
  isConnected: false,
  error: null,
  daemonStatus: null,
  sessions: [],
  selectedSession: null,
  activities: [],
  logs: [],
  stats: {
    totalSessions: 0,
    activeSessions: 0,
    awaitingApproval: 0
  },

  connect: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/status`);
      if (!response.ok) throw new Error('Failed to connect to daemon');
      
      const status = await response.json();
      set({ 
        isConnected: true, 
        error: null,
        daemonStatus: status,
        logs: status.logs || []
      });
      
      get().refreshSessions();
    } catch (error) {
      set({ 
        isConnected: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  },

  disconnect: () => {
    set({ isConnected: false, daemonStatus: null });
  },

  refreshStatus: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/status`);
      if (!response.ok) throw new Error('Failed to refresh status');
      
      const status = await response.json();
      set({ 
        daemonStatus: status,
        logs: status.logs || [],
        error: null
      });
      
      // Also refresh sessions to keep stats in sync
      get().refreshSessions();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Refresh failed' });
    }
  },

  refreshSessions: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      const sessions = data.sessions || [];
      
      const stats = {
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s: Session) => s.status === 'active').length,
        awaitingApproval: sessions.filter((s: Session) => s.status === 'awaiting_approval').length
      };

      set({ 
        sessions,
        stats,
        error: null
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Session refresh failed' });
    }
  },

  fetchActivities: async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/activities`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      set({ 
        activities: data.activities || [],
        error: null
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Activities fetch failed' });
    }
  },

  indexCodebase: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/index-codebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to trigger indexing');
      
      set({ error: null });
      // The daemon will add a log entry when it starts/finishes
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Indexing trigger failed' });
    }
  },

  startDaemon: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to start daemon');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Start failed' });
    }
  },

  stopDaemon: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/daemon/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to stop daemon');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Stop failed' });
    }
  },

  interruptAllSessions: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/interrupt-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to interrupt sessions');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Interrupt failed' });
    }
  },

  continueAllSessions: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sessions/continue-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to continue sessions');
      
      await get().refreshStatus();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Continue failed' });
    }
  },

  setError: (error: string | null) => set({ error })
}));
