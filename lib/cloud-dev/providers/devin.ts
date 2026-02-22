// @ts-nocheck
import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class DevinProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('devin', apiKey);
  }

  async listSessions(): Promise<UnifiedSession[]> {
    throw new ProviderNotImplementedError('devin', 'listSessions');
  }

  async getSession(_sessionId: string): Promise<UnifiedSession | null> {
    throw new ProviderNotImplementedError('devin', 'getSession');
  }

  async createSession(_request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('devin', 'createSession');
  }

  async updateSession(_sessionId: string, _updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    throw new ProviderNotImplementedError('devin', 'updateSession');
  }

  async deleteSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'deleteSession');
  }

  async pauseSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'pauseSession');
  }

  async resumeSession(_sessionId: string, _message?: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'resumeSession');
  }

  async cancelSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('devin', 'cancelSession');
  }

  async listActivities(_sessionId: string): Promise<UnifiedActivity[]> {
    throw new ProviderNotImplementedError('devin', 'listActivities');
  }

  async sendMessage(_sessionId: string, _content: string): Promise<UnifiedActivity> {
    throw new ProviderNotImplementedError('devin', 'sendMessage');
  }
}
