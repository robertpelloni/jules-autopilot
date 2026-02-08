import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class GitHubSparkProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('github-spark', apiKey);
  }

  async listSessions(): Promise<UnifiedSession[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('github-spark', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    if (this.isMock) return null;
    throw new ProviderNotImplementedError('github-spark', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    if (this.isMock) return {
      id: `github-spark:mock-${Date.now()}`,
      providerId: 'github-spark',
      providerSessionId: `mock-${Date.now()}`,
      title: _request.title || 'New Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    throw new ProviderNotImplementedError('github-spark', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    if (this.isMock) {
        const session = { id: _sessionId, providerId: 'github-spark' as const, providerSessionId: _sessionId, title: 'Mock', status: 'active' as const, createdAt: '', updatedAt: '' };
        return { ...session, ..._updates };
    }
    throw new ProviderNotImplementedError('github-spark', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('github-spark', 'deleteSession'); }
  async pauseSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('github-spark', 'pauseSession'); }
  async resumeSession(_sessionId: string, _message?: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('github-spark', 'resumeSession'); }
  async cancelSession(_sessionId: string): Promise<void> { if (this.isMock) return; throw new ProviderNotImplementedError('github-spark', 'cancelSession'); }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    if (this.isMock) return [];
    throw new ProviderNotImplementedError('github-spark', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    if (this.isMock) return { id: `act-${Date.now()}`, sessionId: _sessionId, type: 'message', role: 'user', content: _content, createdAt: new Date().toISOString() };
    throw new ProviderNotImplementedError('github-spark', 'sendMessage');
  }
}
