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

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    throw new ProviderNotImplementedError('manus', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    throw new ProviderNotImplementedError('manus', 'sendMessage');
  }
}
