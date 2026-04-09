import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
  ProviderHealth,
} from '@/types/cloud-dev';

export class ManusProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('manus', apiKey);
  }

  private mockSessions: UnifiedSession[] = [
    {
      id: 'manus:mock-alpha',
      providerId: 'manus',
      providerSessionId: 'mock-alpha',
      title: 'Write Unit Tests',
      status: 'paused',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
      url: 'https://manus.ai/session/alpha',
      repository: { owner: 'robertpelloni', name: 'jules-ui', url: 'https://github.com/robertpelloni/jules-ui' }
    }
  ];

  async listSessions(): Promise<UnifiedSession[]> {
    if (this.isMock) {
        return this.mockSessions;
    }
    throw new ProviderNotImplementedError('manus', 'listSessions');
  }

  async getHealth(): Promise<ProviderHealth> {
      if (this.isMock) {
          return { status: 'healthy', latencyMs: 120, lastChecked: new Date().toISOString() };
      }
      return super.getHealth();
  }

  async getSession(sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) {
        return this.mockSessions.find(s => s.id === sessionId || s.providerSessionId === sessionId) || null;
    }
    throw new ProviderNotImplementedError('manus', 'getSession');
  }

  async createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) {
        const newSession: UnifiedSession = {
            id: `manus:mock-${Date.now()}`,
            providerId: 'manus',
            providerSessionId: `mock-${Date.now()}`,
            title: request.title || 'New Manus Session',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
            url: `https://manus.ai/session/mock-${Date.now()}`,
            repository: request.repositoryUrl ? { owner: 'mock', name: 'repo', url: request.repositoryUrl } : undefined
        };
        this.mockSessions.unshift(newSession);
        return newSession;
    }
    throw new ProviderNotImplementedError('manus', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('manus', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('manus', 'deleteSession');
  }

  async pauseSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('manus', 'pauseSession');
  }

  async resumeSession(_sessionId: string, _message?: string): Promise<void> {
    throw new ProviderNotImplementedError('manus', 'resumeSession');
  }

  async cancelSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('manus', 'cancelSession');
  }

  async listActivities(sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) {
        return [
            {
                id: 'act-m1',
                sessionId: sessionId,
                providerId: 'manus',
                type: 'message',
                role: 'assistant',
                content: 'Manus AI is initializing context...',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
                id: 'act-m2',
                sessionId: sessionId,
                providerId: 'manus',
                type: 'message',
                role: 'user',
                content: 'Please write unit tests for the auth module.',
                createdAt: new Date(Date.now() - 3500000).toISOString(),
            },
            {
                id: 'act-m3',
                sessionId: sessionId,
                providerId: 'manus',
                type: 'plan',
                role: 'assistant',
                content: 'Plan:\n1. Analyze auth.ts\n2. Create auth.test.ts\n3. Run tests',
                createdAt: new Date(Date.now() - 3400000).toISOString(),
            }
        ];
    }
    throw new ProviderNotImplementedError('manus', 'listActivities');
  }

  async sendMessage(sessionId: string, content: string): Promise<UnifiedActivity> {
    if (this.isMock) {
        return {
            id: `act-mock-${Date.now()}`,
            sessionId: sessionId,
            providerId: 'manus',
            type: 'message',
            role: 'assistant',
            content: `[Mock Response] I received your message: "${content}"`,
            createdAt: new Date().toISOString(),
        };
    }
    throw new ProviderNotImplementedError('manus', 'sendMessage');
  }
}
