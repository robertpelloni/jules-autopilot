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
      const response = await this.fetch<{ sessions: any[] }>('/api/sessions');
      return response.sessions.map((s) => ({
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id,
        title: s.title || 'OpenHands Session',
        status: s.status === 'RUNNING' ? 'active' : 'completed',
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at || new Date().toISOString(),
      }));
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to list sessions: ${err.message}`, err.statusCode);
    }
  }

  async getSession(sessionId: string): Promise<UnifiedSession | null> {
    try {
      const s = await this.fetch<any>(`/api/sessions/${sessionId}`);
      return {
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id,
        title: s.title || 'OpenHands Session',
        status: s.status === 'RUNNING' ? 'active' : 'completed',
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at || new Date().toISOString(),
      };
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw new CloudDevProviderError('openhands', `Failed to get session: ${err.message}`, err.statusCode);
    }
  }

  async createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    try {
      const s = await this.fetch<any>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: request.title,
          system_prompt: request.prompt,
        }),
      });
      return {
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id,
        title: s.title || request.title || 'New Session',
        status: 'active',
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at || new Date().toISOString(),
      };
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to create session: ${err.message}`, err.statusCode);
    }
  }

  async updateSession(sessionId: string, updates: Partial<UnifiedSession>): Promise<UnifiedSession> {
    try {
      const s = await this.fetch<any>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: updates.title,
          status: updates.status === 'active' ? 'RUNNING' : 'STOPPED'
        }),
      });
      return {
        id: `openhands:${s.id}`,
        providerId: 'openhands',
        providerSessionId: s.id,
        title: s.title || 'OpenHands Session',
        status: s.status === 'RUNNING' ? 'active' : 'completed',
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at || new Date().toISOString(),
      };
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to update session: ${err.message}`, err.statusCode);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to delete session: ${err.message}`, err.statusCode);
    }
  }

  // --- Session Control ---

  async pauseSession(sessionId: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}/pause`, { method: 'POST' });
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to pause session: ${err.message}`, err.statusCode);
    }
  }

  async resumeSession(sessionId: string, message?: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}/resume`, {
        method: 'POST',
        body: message ? JSON.stringify({ message }) : undefined
      });
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to resume session: ${err.message}`, err.statusCode);
    }
  }

  async cancelSession(sessionId: string): Promise<void> {
    try {
      await this.fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to cancel session: ${err.message}`, err.statusCode);
    }
  }

  // --- Activity Stream ---

  async listActivities(sessionId: string): Promise<UnifiedActivity[]> {
    try {
      const response = await this.fetch<{ events: any[] }>(`/api/sessions/${sessionId}/events`);
      return response.events.map(event => ({
        id: `act-${event.id}`,
        sessionId,
        providerId: 'openhands',
        type: event.type === 'message' ? 'message' : event.type === 'action' ? 'action' : 'system',
        role: event.source === 'user' ? 'user' : 'assistant',
        content: event.content || '',
        createdAt: event.timestamp || new Date().toISOString()
      }));
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to list activities: ${err.message}`, err.statusCode);
    }
  }

  async sendMessage(sessionId: string, content: string): Promise<UnifiedActivity> {
    try {
      const event = await this.fetch<any>(`/api/sessions/${sessionId}/events`, {
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
        content: event.content || content,
        createdAt: event.timestamp || new Date().toISOString()
      };
    } catch (err: any) {
      throw new CloudDevProviderError('openhands', `Failed to send message: ${err.message}`, err.statusCode);
    }
  }

  // --- Health Override ---

  async getHealth(): Promise<{ status: 'healthy' | 'unavailable' | 'degraded', latencyMs: number, message?: string, lastChecked: string }> {
    const startTime = Date.now();
    try {
      const res = await this.fetch<any>('/api/health');
      return {
        status: res.status === 'OK' ? 'healthy' : 'degraded',
        latencyMs: Date.now() - startTime,
        message: res.version ? `v${res.version}` : undefined,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'unavailable',
        latencyMs: Date.now() - startTime,
        message: err.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }
}
