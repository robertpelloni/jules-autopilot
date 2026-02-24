// @ts-nocheck
import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
  ProviderHealth,
} from '@/types/cloud-dev';

export class DevinProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('devin', apiKey);
    console.warn('[DevinProvider] Running in Mock/Preview mode. This provider is not yet production-ready.');
  }

  private mockSessions: UnifiedSession[] = [
    {
      id: 'devin:mock-1',
      providerId: 'devin',
      providerSessionId: 'mock-1',
      title: 'Refactor Auth System',
      status: 'active',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      url: 'https://preview.devin.ai/mock-1',
      repository: { owner: 'robertpelloni', name: 'jules-ui', url: 'https://github.com/robertpelloni/jules-ui' }
    },
    {
      id: 'devin:mock-2',
      providerId: 'devin',
      providerSessionId: 'mock-2',
      title: 'Optimize Database Queries',
      status: 'completed',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
      lastActivityAt: new Date(Date.now() - 43200000).toISOString(),
      url: 'https://preview.devin.ai/mock-2',
      repository: { owner: 'robertpelloni', name: 'jules-ui', url: 'https://github.com/robertpelloni/jules-ui' }
    }
  ];

  async listSessions(): Promise<UnifiedSession[]> {
    if (this.isMock) {
      return this.mockSessions;
    }
    throw new ProviderNotImplementedError('devin', 'listSessions');
  }

  async getHealth(): Promise<ProviderHealth> {
    if (this.isMock) {
      return { status: 'healthy', latencyMs: 50, lastChecked: new Date().toISOString() };
    }
    return super.getHealth();
  }

  async getSession(sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) {
      return this.mockSessions.find(s => s.id === sessionId || s.providerSessionId === sessionId) || null;
    }
    throw new ProviderNotImplementedError('devin', 'getSession');
  }

  async createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) {
      const newSession: UnifiedSession = {
        id: `devin:mock-${Date.now()}`,
        providerId: 'devin',
        providerSessionId: `mock-${Date.now()}`,
        title: request.title || 'New Devin Session',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        url: `https://preview.devin.ai/mock-${Date.now()}`,
        repository: request.repositoryUrl ? { owner: 'mock', name: 'repo', url: request.repositoryUrl } : undefined
      };
      this.mockSessions.unshift(newSession);
      return newSession;
    }
    throw new ProviderNotImplementedError('devin', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('devin', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'deleteSession');
  }

  async pauseSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'pauseSession');
  }

  async resumeSession(_sessionId: string, _message?: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'resumeSession');
  }

  async cancelSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'cancelSession');
  }

  async listActivities(sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) {
      // Return some dummy activities
      return [
        {
          id: 'act-1',
          sessionId: sessionId,
          providerId: 'devin',
          type: 'message',
          role: 'assistant',
          content: 'I am analyzing the codebase...',
          createdAt: new Date(Date.now() - 300000).toISOString(),
        },
        {
          id: 'act-2',
          sessionId: sessionId,
          providerId: 'devin',
          type: 'command',
          content: 'npm install',
          metadata: { exitCode: 0 },
          createdAt: new Date(Date.now() - 200000).toISOString(),
        }
      ];
    }
    throw new ProviderNotImplementedError('devin', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    throw new ProviderNotImplementedError('devin', 'sendMessage');
  }
}
