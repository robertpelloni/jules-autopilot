import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class OpenHandsProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('openhands', apiKey);
  }

  async listSessions(): Promise<UnifiedSession[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('openhands', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) return null;
    throw new ProviderNotImplementedError('openhands', 'getSession');
  }

  async createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) return {
      id: `openhands:mock-${Date.now()}`,
      providerId: 'openhands',
      providerSessionId: `mock-${Date.now()}`,
      title: request.title || 'New Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    throw new ProviderNotImplementedError('openhands', 'createSession');
  }

  async updateSession(sessionId: string, updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    if (this.isMock) {
        const session = { id: sessionId, providerId: 'openhands' as const, providerSessionId: sessionId, title: 'Mock', status: 'active' as const, createdAt: '', updatedAt: '' }; // Mock retrieval
        return { ...session, ...updates };
    }
    throw new ProviderNotImplementedError('openhands', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('openhands', 'deleteSession'); }
  async pauseSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('openhands', 'pauseSession'); }
  async resumeSession(_sessionId: string, _message?: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('openhands', 'resumeSession'); }
  async cancelSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('openhands', 'cancelSession'); }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('openhands', 'listActivities');
  }

  async sendMessage(_sessionId: string, content: string): Promise<UnifiedActivity> {
    if (this.isMock) return { id: `act-${Date.now()}`, sessionId: _sessionId, type: 'message', role: 'user', content, createdAt: new Date().toISOString() };
    throw new ProviderNotImplementedError('openhands', 'sendMessage');
  }
}
