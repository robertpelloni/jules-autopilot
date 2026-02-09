import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class BlocksProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('blocks', apiKey);
  }

  async listSessions(): Promise<UnifiedSession[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('blocks', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) return null;
    throw new ProviderNotImplementedError('blocks', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) return {
      id: `blocks:mock-${Date.now()}`,
      providerId: 'blocks',
      providerSessionId: `mock-${Date.now()}`,
      title: _request.title || 'New Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    throw new ProviderNotImplementedError('blocks', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    if (this.isMock) {
        const session = { id: _sessionId, providerId: 'blocks' as const, providerSessionId: _sessionId, title: 'Mock', status: 'active' as const, createdAt: '', updatedAt: '' };
        return { ...session, ..._updates };
    }
    throw new ProviderNotImplementedError('blocks', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('blocks', 'deleteSession'); }
  async pauseSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('blocks', 'pauseSession'); }
  async resumeSession(_sessionId: string, _message?: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('blocks', 'resumeSession'); }
  async cancelSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('blocks', 'cancelSession'); }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('blocks', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    if (this.isMock) return { id: `act-${Date.now()}`, sessionId: _sessionId, type: 'message', role: 'user', content: _content, createdAt: new Date().toISOString() };
    throw new ProviderNotImplementedError('blocks', 'sendMessage');
  }
}
