import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SessionKeeperConfig } from '@/types/jules';
import type { DebateResult as OrchestrationDebateResult } from '@jules/shared'; export interface Log {
  id?: string;
  time: string;
  message: string;
  type: 'info' | 'action' | 'error' | 'skip';
  details?: any;
}

export interface DebateOpinion {
  participant: {
    provider: string;
    model: string;
    role?: string;
  };
  content: string;
  error?: string;
}

export interface DebateResult extends OrchestrationDebateResult {
  id: string;
  sessionId: string;
  timestamp: number;
  mode: 'debate' | 'conference';
  opinions: DebateOpinion[];
  finalInstruction: string;
}

export interface StatusSummary {
  monitoringCount: number;
  lastAction: string;
  nextCheckIn: number;
}

export interface SessionState {
  error?: { code: number; message: string; timestamp: number };
  ignoreUntil?: number;
  lastActivitySnippet?: string;
}

export interface SessionKeeperStats {
  totalNudges: number;
  totalApprovals: number;
  totalDebates: number;
}

interface SessionKeeperState {
  config: SessionKeeperConfig;
  logs: Log[];
  debates: DebateResult[];
  statusSummary: StatusSummary;
  sessionStates: Record<string, SessionState>;
  stats: SessionKeeperStats;
  isLoading: boolean;
  isPausedAll: boolean;
  lastForcedCheckAt: number;

  // Actions
  loadConfig: () => Promise<void>;
  setConfig: (config: SessionKeeperConfig) => void;
  saveConfig: (config: SessionKeeperConfig) => Promise<void>;

  loadLogs: () => Promise<void>;
  addLog: (message: string, type: Log['type'], details?: any) => Promise<void>;
  addDebate: (debate: DebateResult) => void;

  clearLogs: () => void;
  refreshSessionStates: () => void;

  setStatusSummary: (summary: Partial<StatusSummary>) => void;
  updateSessionState: (sessionId: string, state: Partial<SessionState>) => void;
  incrementStat: (stat: keyof SessionKeeperStats) => void;

  setPausedAll: (isPaused: boolean) => void;
  interruptAll: () => Promise<void>;
  continueAll: () => Promise<void>;
}

const DEFAULT_CONFIG: SessionKeeperConfig = {
  isEnabled: false,
  autoSwitch: true,
  checkIntervalSeconds: 30,
  inactivityThresholdMinutes: 1,
  activeWorkThresholdMinutes: 30,
  messages: [
    "Great! Please keep going as you advise!",
    "Yes! Please continue to proceed as you recommend!",
    "This looks correct. Please proceed.",
    "Excellent plan. Go ahead.",
    "Looks good to me. Continue.",
  ],
  customMessages: {},
  smartPilotEnabled: false,
  supervisorProvider: 'openai',
  supervisorApiKey: '',
  supervisorModel: '',
  contextMessageCount: 20,
  debateEnabled: false,
  debateParticipants: []
};

export const useSessionKeeperStore = create<SessionKeeperState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      logs: [],
      debates: [],
      statusSummary: { monitoringCount: 0, lastAction: 'None', nextCheckIn: 0 },
      sessionStates: {},
      stats: { totalNudges: 0, totalApprovals: 0, totalDebates: 0 },
      isLoading: false,
      isPausedAll: false,
      lastForcedCheckAt: 0,

      loadConfig: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/settings/keeper');
          if (res.ok) {
            const config = await res.json();
            set({ config });

            const statusRes = await fetch('/api/daemon/status');
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              set((state) => ({
                config: { ...state.config, isEnabled: statusData.isEnabled },
                logs: statusData.logs.map((l: any) => ({
                  id: l.id,
                  time: new Date(l.createdAt).toLocaleTimeString(),
                  message: l.message,
                  type: l.type,
                  details: l.metadata ? JSON.parse(l.metadata) : undefined
                }))
              }));
            }
          }
        } catch (error) {
          console.warn('Session Keeper: Backend not reachable. Is the server running? (bun run server/index.ts)');
        } finally {
          set({ isLoading: false });
        }
      },

      setConfig: (config) => set({ config }),

      saveConfig: async (config) => {
        set({ config, isLoading: true });
        try {
          await fetch('/api/settings/keeper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
          });

          await fetch('/api/daemon/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: config.isEnabled ? 'start' : 'stop' })
          });

        } catch (error) {
          console.error('Failed to save keeper config:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadLogs: async () => {
        try {
          const res = await fetch('/api/daemon/status');
          if (res.ok) {
            const statusData = await res.json();
            const mappedLogs: Log[] = statusData.logs.map((l: any) => ({
              id: l.id,
              time: new Date(l.createdAt).toLocaleTimeString(),
              message: l.message,
              type: l.type as Log['type'],
              details: l.metadata ? JSON.parse(l.metadata) : undefined
            }));
            set({ logs: mappedLogs });
          }
        } catch (error) {
          // Silent fail for logs polling/loading if backend is down
          if (process.env.NODE_ENV === 'development') {
            console.warn('Session Keeper: Failed to load logs (backend offline?)');
          }
        }
      },

      addLog: async (message, type, details) => {
        const newLog: Log = {
          time: new Date().toLocaleTimeString(),
          message,
          type,
          details
        };

        set((state) => ({
          logs: [newLog, ...state.logs].slice(0, 100)
        }));

        try {
          await fetch('/api/logs/keeper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              type,
              details,
              sessionId: 'global'
            }),
          });
        } catch (error) {
          console.error('Failed to persist log:', error);
        }
      },

      addDebate: (debate) => set((state) => ({
        debates: [debate, ...state.debates].slice(0, 50)
      })),

      clearLogs: () => set({ logs: [] }),

      refreshSessionStates: () => {
        const { addLog } = get();
        set({ sessionStates: {}, lastForcedCheckAt: Date.now() });
        addLog('Manual refresh: Resetting session states and forcing re-check.', 'info');
      },

      setStatusSummary: (summary) => set((state) => ({
        statusSummary: { ...state.statusSummary, ...summary }
      })),

      updateSessionState: (sessionId, newState) => set((state) => ({
        sessionStates: {
          ...state.sessionStates,
          [sessionId]: {
            ...state.sessionStates[sessionId],
            ...newState
          }
        }
      })),

      incrementStat: (stat) => set((state) => ({
        stats: { ...state.stats, [stat]: state.stats[stat] + 1 }
      })),

      setPausedAll: (isPausedAll) => set({ isPausedAll }),

      interruptAll: async () => {
        const { addLog } = get();
        set({ isPausedAll: true });
        try {
          const res = await fetch('/api/sessions/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'interrupt-all' })
          });
          if (res.ok) {
            const data = await res.json();
            await addLog(`Global Interrupt: ${data.interruptedCount} sessions paused.`, 'action');
          } else {
            await addLog('Global Interrupt: All background processing paused.', 'info');
          }
        } catch (error) {
          console.error('Failed to interrupt all sessions:', error);
          await addLog('Global Interrupt: All background processing paused (local only).', 'info');
        }
      },

      continueAll: async () => {
        const { addLog } = get();
        set({ isPausedAll: false });
        try {
          const res = await fetch('/api/sessions/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'continue-all' })
          });
          if (res.ok) {
            const data = await res.json();
            await addLog(`Global Continue: ${data.continuedCount} sessions resumed.`, 'action');
          } else {
            await addLog('Global Continue: Background processing resumed.', 'info');
          }
        } catch (error) {
          console.error('Failed to continue all sessions:', error);
          await addLog('Global Continue: Background processing resumed (local only).', 'info');
        }
      },
    }),
    {
      name: 'jules-session-keeper-store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
      partialize: (state) => ({
        stats: state.stats,
        isPausedAll: state.isPausedAll,
        lastForcedCheckAt: state.lastForcedCheckAt,
        debates: state.debates
      }),
      skipHydration: true,
    }
  )
);
