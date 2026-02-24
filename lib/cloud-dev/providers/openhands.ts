import { BaseCloudDevProvider, ProviderNotImplementedError, CloudDevProviderError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
} from '@/types/cloud-dev';

export class OpenHandsProvider extends BaseCloudDevProvider {
  constructor(apiKey?: string) {
    super('openhands', apiKey);
  }

  // --- Session Management ---

  async listSessions(): Promise<UnifiedSession[]> {
    try {
      const response = await this.fetch<{ sessions: Record<string, unknown>[] }>('/api/sessions');
      return response.sessions.map((s: Record<string, unknown>) => ({
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id as string,
        title: (s.title as string) || 'OpenHands Session',
        status: s.status === 'RUNNING' ? 'active' : 'completed',
        createdAt: (s.created_at as string) || new Date().toISOString(),
        updatedAt: (s.updated_at as string) || new Date().toISOString(),
      }));
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to list sessions: ${error.message}`, error.statusCode);
    }
  }

  async getSession(sessionId: string): Promise<UnifiedSession | null> {
    try {
      const s = await this.fetch<Record<string, unknown>>(`/api/sessions/${sessionId}`);
      return {
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id as string,
        title: (s.title as string) || 'OpenHands Session',
        status: s.status === 'RUNNING' ? 'active' : 'completed',
        createdAt: (s.created_at as string) || new Date().toISOString(),
        updatedAt: (s.updated_at as string) || new Date().toISOString(),
      };
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      if (error.statusCode === 404) return null;
      throw new CloudDevProviderError('openhands', `Failed to get session: ${error.message}`, error.statusCode);
    }
  }

  async createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    try {
      const s = await this.fetch<Record<string, unknown>>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: request.title,
          system_prompt: request.prompt,
        }),
      });
      return {
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id as string,
        title: (s.title as string) || request.title || 'New Session',
        status: 'active',
        createdAt: (s.created_at as string) || new Date().toISOString(),
        updatedAt: (s.updated_at as string) || new Date().toISOString(),
      };
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to create session: ${error.message}`, error.statusCode);
    }
  }

  async updateSession(sessionId: string, updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    try {
      const s = await this.fetch<Record<string, unknown>>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: updates.title,
          status: updates.status === 'active' ? 'RUNNING' : 'STOPPED'
        }),
      });
      return {
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id as string,
        title: (s.title as string) || 'OpenHands Session',
        status: s.status === 'RUNNING' ? 'active' : 'completed',
        createdAt: (s.created_at as string) || new Date().toISOString(),
        updatedAt: (s.updated_at as string) || new Date().toISOString(),
      };
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to update session: ${error.message}`, error.statusCode);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to delete session: ${error.message}`, error.statusCode);
    }
  }

  // --- Session Control ---

  async pauseSession(sessionId: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}/pause`, { method: 'POST' });
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to pause session: ${error.message}`, error.statusCode);
    }
  }

  async resumeSession(sessionId: string, message?: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}/resume`, {
        method: 'POST',
        body: message ? JSON.stringify({ message }) : undefined
      });
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to resume session: ${error.message}`, error.statusCode);
    }
  }

  async cancelSession(sessionId: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to cancel session: ${error.message}`, error.statusCode);
    }
  }

  // --- Activity Stream ---

  async listActivities(sessionId: string): Promise<UnifiedActivity[]> {
    try {
      const response = await this.fetch<{ events: Record<string, unknown>[] }>(`/api/sessions/${sessionId}/events`);
      return response.events.map(event => ({
        id: `act-${event.id}`,
        sessionId,
        providerId: 'openhands',
        type: event.type === 'message' ? 'message' : event.type === 'action' ? 'tool_use' : 'progress',
        role: event.source === 'user' ? 'user' : 'agent',
        content: (event.content as string) || '',
        createdAt: (event.timestamp as string) || new Date().toISOString()
      }));
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to list activities: ${error.message}`, error.statusCode);
    }
  }

  async sendMessage(sessionId: string, content: string): Promise<UnifiedActivity> {
    try {
      const event = await this.fetch<Record<string, unknown>>(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'message',
          content
        })
      });
      return {
        id: `act-${event.id}`,
        sessionId,
        providerId: 'openhands',
        type: 'message',
        role: 'user',
        content: (event.content as string) || content,
        createdAt: (event.timestamp as string) || new Date().toISOString()
      };
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      throw new CloudDevProviderError('openhands', `Failed to send message: ${error.message}`, error.statusCode);
    }
  }

  // --- Health Override ---

  async getHealth(): Promise<{ status: 'healthy' | 'unavailable' | 'degraded', latencyMs: number, message?: string, lastChecked: string }> {
    const startTime = Date.now();
    try {
      const res = await this.fetch<Record<string, unknown>>('/api/health');
      return {
        status: res.status === 'OK' ? 'healthy' : 'degraded',
        latencyMs: Date.now() - startTime,
        message: res.version ? `v${res.version}` : undefined,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const error = err as { message?: string };
      return {
        status: 'unavailable',
        latencyMs: Date.now() - startTime,
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }
}
