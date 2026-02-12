import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class CodexProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('codex', apiKey);
  }

  async listSessions(): Promise<UnifiedSession[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('codex', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) return null;
    throw new ProviderNotImplementedError('codex', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) return {
      id: `codex:mock-${Date.now()}`,
      providerId: 'codex',
      providerSessionId: `mock-${Date.now()}`,
      title: _request.title || 'New Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    throw new ProviderNotImplementedError('codex', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    if (this.isMock) {
        const session = { id: _sessionId, providerId: 'codex' as const, providerSessionId: _sessionId, title: 'Mock', status: 'active' as const, createdAt: '', updatedAt: '' };
        return { ...session, ..._updates };
    }
    throw new ProviderNotImplementedError('codex', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('codex', 'deleteSession'); }
  async pauseSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('codex', 'pauseSession'); }
  async resumeSession(_sessionId: string, _message?: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('codex', 'resumeSession'); }
  async cancelSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('codex', 'cancelSession'); }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('codex', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    if (this.isMock) return { id: `act-${Date.now()}`, sessionId: _sessionId, type: 'message', role: 'user', content: _content, createdAt: new Date().toISOString() };
    throw new ProviderNotImplementedError('codex', 'sendMessage');
  }
}
