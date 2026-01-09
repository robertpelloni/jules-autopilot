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
    throw new ProviderNotImplementedError('blocks', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    throw new ProviderNotImplementedError('blocks', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('blocks', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('blocks', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('blocks', 'deleteSession');
  }

  async pauseSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('blocks', 'pauseSession');
  }

  async resumeSession(_sessionId: string, _message?: string): Promise<void> {
    throw new ProviderNotImplementedError('blocks', 'resumeSession');
  }

  async cancelSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('blocks', 'cancelSession');
  }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    throw new ProviderNotImplementedError('blocks', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    throw new ProviderNotImplementedError('blocks', 'sendMessage');
  }
}
