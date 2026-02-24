// @ts-nocheck
import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class ClaudeCodeProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('claude-code', apiKey);
    console.warn('[ClaudeCodeProvider] Running in Mock/Preview mode. This provider is not yet production-ready.');
  }

  async listSessions(): Promise<UnifiedSession[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('claude-code', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) return null;
    throw new ProviderNotImplementedError('claude-code', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) return {
      id: `claude-code:mock-${Date.now()}`,
      providerId: 'claude-code',
      providerSessionId: `mock-${Date.now()}`,
      title: _request.title || 'New Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    throw new ProviderNotImplementedError('claude-code', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    if (this.isMock) {
      const session = { id: _sessionId, providerId: 'claude-code' as const, providerSessionId: _sessionId, title: 'Mock', status: 'active' as const, createdAt: '', updatedAt: '' };
      return { ...session, ..._updates };
    }
    throw new ProviderNotImplementedError('claude-code', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('claude-code', 'deleteSession'); }
  async pauseSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('claude-code', 'pauseSession'); }
  async resumeSession(_sessionId: string, _message?: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('claude-code', 'resumeSession'); }
  async cancelSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('claude-code', 'cancelSession'); }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('claude-code', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    if (this.isMock) return { id: `act-${Date.now()}`, sessionId: _sessionId, type: 'message', role: 'user', content: _content, createdAt: new Date().toISOString() };
    throw new ProviderNotImplementedError('claude-code', 'sendMessage');
  }
}
