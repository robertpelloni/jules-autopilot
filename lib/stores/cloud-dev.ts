import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CloudDevProviderId,
  CloudDevProviderConfig,
  UnifiedSession,
  UnifiedActivity,
  SessionTransfer,
  CreateCloudDevSessionRequest,
  CloudDevProviderInterface,
} from '@/types/cloud-dev';
import { CLOUD_DEV_PROVIDERS } from '@/types/cloud-dev';
import { createProvider, createProviders } from '@/lib/cloud-dev/providers';
import { SessionTransferService } from '@/lib/cloud-dev/transfer';

export interface CloudDevApiKeys {
  jules?: string;
  devin?: string;
  manus?: string;
  openhands?: string;
  'github-spark'?: string;
  blocks?: string;
  'claude-code'?: string;
  codex?: string;
}

interface CloudDevState {
  activeProviderId: CloudDevProviderId;
  apiKeys: CloudDevApiKeys;
  sessions: UnifiedSession[];
  selectedSessionId: string | null;
  activities: UnifiedActivity[];
  transfers: SessionTransfer[];
  isLoading: boolean;
  error: string | null;

  providers: Map<CloudDevProviderId, CloudDevProviderInterface>;
  transferService: SessionTransferService | null;

  setActiveProvider: (providerId: CloudDevProviderId) => void;
  setApiKey: (providerId: CloudDevProviderId, apiKey: string) => void;
  initializeProviders: () => void;

  fetchSessions: (providerId?: CloudDevProviderId) => Promise<void>;
  fetchAllSessions: () => Promise<void>;
  selectSession: (sessionId: string | null) => void;
  fetchActivities: (sessionId: string) => Promise<void>;

  createSession: (request: CreateCloudDevSessionRequest) => Promise<UnifiedSession>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string, message?: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;

  initiateTransfer: (
    sourceSessionId: string,
    targetProviderId: CloudDevProviderId,
    options?: { continueFromLastState?: boolean; newPrompt?: string }
  ) => Promise<SessionTransfer>;

  getProviderConfig: (providerId: CloudDevProviderId) => Omit<CloudDevProviderConfig, 'isEnabled' | 'apiKey'>;
  getConfiguredProviders: () => CloudDevProviderId[];
  clearError: () => void;
}

function getProviderIdFromSessionId(sessionId: string): CloudDevProviderId {
  const colonIndex = sessionId.indexOf(':');
  if (colonIndex > 0) {
    return sessionId.slice(0, colonIndex) as CloudDevProviderId;
  }
  return 'jules';
}

export const useCloudDevStore = create<CloudDevState>()(
  persist(
    (set, get) => ({
      activeProviderId: 'jules',
      apiKeys: {},
      sessions: [],
      selectedSessionId: null,
      activities: [],
      transfers: [],
      isLoading: false,
      error: null,
      providers: new Map(),
      transferService: null,

      setActiveProvider: (providerId) => {
        set({ activeProviderId: providerId, selectedSessionId: null, activities: [] });
        get().fetchSessions(providerId);
      },

      setApiKey: (providerId, apiKey) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [providerId]: apiKey },
        }));
        get().initializeProviders();
      },

      initializeProviders: () => {
        const { apiKeys } = get();
        const providers = createProviders(apiKeys);
        const transferService = new SessionTransferService(providers);
        set({ providers, transferService });
      },

      fetchSessions: async (providerId) => {
        const { providers, activeProviderId } = get();
        const targetProviderId = providerId || activeProviderId;
        const provider = providers.get(targetProviderId);

        if (!provider) {
          set({ error: `Provider ${targetProviderId} not configured` });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const sessions = await provider.listSessions();
          set((state) => {
            const otherSessions = state.sessions.filter(
              (s) => s.providerId !== targetProviderId
            );
            return { sessions: [...otherSessions, ...sessions] };
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch sessions' });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchAllSessions: async () => {
        const { providers } = get();
        set({ isLoading: true, error: null });

        const allSessions: UnifiedSession[] = [];
        const errors: string[] = [];

        await Promise.all(
          Array.from(providers.entries()).map(async ([providerId, provider]) => {
            try {
              const sessions = await provider.listSessions();
              allSessions.push(...sessions);
            } catch (error) {
              errors.push(
                `${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
            }
          })
        );

        set({
          sessions: allSessions,
          isLoading: false,
          error: errors.length > 0 ? errors.join('; ') : null,
        });
      },

      selectSession: (sessionId) => {
        set({ selectedSessionId: sessionId, activities: [] });
        if (sessionId) {
          get().fetchActivities(sessionId);
        }
      },

      fetchActivities: async (sessionId) => {
        const { providers } = get();
        const providerId = getProviderIdFromSessionId(sessionId);
        const provider = providers.get(providerId);

        if (!provider) {
          set({ error: `Provider ${providerId} not configured` });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const activities = await provider.listActivities(sessionId);
          set({ activities });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch activities' });
        } finally {
          set({ isLoading: false });
        }
      },

      createSession: async (request) => {
        const { providers, activeProviderId } = get();
        const provider = providers.get(activeProviderId);

        if (!provider) {
          throw new Error(`Provider ${activeProviderId} not configured`);
        }

        set({ isLoading: true, error: null });
        try {
          const session = await provider.createSession(request);
          set((state) => ({ sessions: [session, ...state.sessions] }));
          return session;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create session';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      pauseSession: async (sessionId) => {
        const { providers } = get();
        const providerId = getProviderIdFromSessionId(sessionId);
        const provider = providers.get(providerId);

        if (!provider) {
          throw new Error(`Provider ${providerId} not configured`);
        }

        await provider.pauseSession(sessionId);
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, status: 'paused' as const } : s
          ),
        }));
      },

      resumeSession: async (sessionId, message) => {
        const { providers } = get();
        const providerId = getProviderIdFromSessionId(sessionId);
        const provider = providers.get(providerId);

        if (!provider) {
          throw new Error(`Provider ${providerId} not configured`);
        }

        await provider.resumeSession(sessionId, message);
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, status: 'active' as const } : s
          ),
        }));
      },

      cancelSession: async (sessionId) => {
        const { providers } = get();
        const providerId = getProviderIdFromSessionId(sessionId);
        const provider = providers.get(providerId);

        if (!provider) {
          throw new Error(`Provider ${providerId} not configured`);
        }

        await provider.cancelSession(sessionId);
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, status: 'failed' as const } : s
          ),
        }));
      },

      initiateTransfer: async (sourceSessionId, targetProviderId, options) => {
        const { transferService, sessions } = get();

        if (!transferService) {
          throw new Error('Transfer service not initialized');
        }

        const sourceSession = sessions.find((s) => s.id === sourceSessionId);
        if (!sourceSession) {
          throw new Error('Source session not found');
        }

        set({ isLoading: true, error: null });
        try {
          const transfer = await transferService.initiateTransfer({
            sourceProvider: sourceSession.providerId,
            sourceSessionId: sourceSession.providerSessionId,
            targetProvider: targetProviderId,
            options: {
              continueFromLastState: options?.continueFromLastState,
              newPrompt: options?.newPrompt,
              includeActivities: true,
            },
          });

          set((state) => ({
            transfers: [transfer, ...state.transfers],
          }));

          get().fetchAllSessions();

          return transfer;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Transfer failed';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      getProviderConfig: (providerId) => {
        return CLOUD_DEV_PROVIDERS[providerId];
      },

      getConfiguredProviders: () => {
        const { apiKeys } = get();
        return Object.entries(apiKeys)
          .filter(([, key]) => !!key)
          .map(([id]) => id as CloudDevProviderId);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'jules-cloud-dev-store',
      partialize: (state) => ({
        activeProviderId: state.activeProviderId,
        apiKeys: state.apiKeys,
        transfers: state.transfers.slice(0, 50),
      }),
    }
  )
);
