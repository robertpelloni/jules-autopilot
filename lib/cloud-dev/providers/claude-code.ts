import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class ClaudeCodeProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('claude-code', apiKey);
  }

  async listSessions(): Promise<UnifiedSession[]> {
    throw new ProviderNotImplementedError('claude-code', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    throw new ProviderNotImplementedError('claude-code', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('claude-code', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('claude-code', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('claude-code', 'deleteSession');
  }

  async pauseSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('claude-code', 'pauseSession');
  }

  async resumeSession(_sessionId: string, _message?: string): Promise<void> {
    throw new ProviderNotImplementedError('claude-code', 'resumeSession');
  }

  async cancelSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('claude-code', 'cancelSession');
  }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    throw new ProviderNotImplementedError('claude-code', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    throw new ProviderNotImplementedError('claude-code', 'sendMessage');
  }
}
