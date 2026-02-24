// @ts-nocheck
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
    console.warn('[ManusProvider] Running in Mock/Preview mode. This provider is not yet production-ready.');
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
      return [{
        id: 'manus:mock-1',
        providerId: 'manus',
        providerSessionId: 'mock-1',
        title: 'Project Setup',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      }];
    }
    throw new ProviderNotImplementedError('manus', 'listSessions');
  }

  async getSession(sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) return (await this.listSessions()).find(s => s.id === sessionId) || null;
    throw new ProviderNotImplementedError('manus', 'getSession');
  }

  async createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) return {
      id: `manus:mock-${Date.now()}`,
      providerId: 'manus',
      providerSessionId: `mock-${Date.now()}`,
      title: request.title || 'New Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    throw new ProviderNotImplementedError('manus', 'createSession');
  }

  async updateSession(sessionId: string, updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    if (this.isMock) {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');
      return { ...session, ...updates };
    }
    throw new ProviderNotImplementedError('manus', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('manus', 'deleteSession'); }
  async pauseSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('manus', 'pauseSession'); }
  async resumeSession(_sessionId: string, _message?: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('manus', 'resumeSession'); }
  async cancelSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('manus', 'cancelSession'); }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) return [{ id: 'act-1', sessionId: _sessionId, type: 'message', role: 'user', content: 'Initial prompt', createdAt: new Date().toISOString() }];
    throw new ProviderNotImplementedError('manus', 'listActivities');
  }

  async sendMessage(_sessionId: string, content: string): Promise<UnifiedActivity> {
    if (this.isMock) return { id: `act-${Date.now()}`, sessionId: _sessionId, type: 'message', role: 'user', content, createdAt: new Date().toISOString() };
    throw new ProviderNotImplementedError('manus', 'sendMessage');
  }
}
