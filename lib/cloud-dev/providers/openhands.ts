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
    throw new ProviderNotImplementedError('openhands', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    throw new ProviderNotImplementedError('openhands', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('openhands', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('openhands', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('openhands', 'deleteSession');
  }

  async pauseSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('openhands', 'pauseSession');
  }

  async resumeSession(_sessionId: string, _message?: string): Promise<void> {
    throw new ProviderNotImplementedError('openhands', 'resumeSession');
  }

  async cancelSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('openhands', 'cancelSession');
  }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    throw new ProviderNotImplementedError('openhands', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    throw new ProviderNotImplementedError('openhands', 'sendMessage');
  }
}
