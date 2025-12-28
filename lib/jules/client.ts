import { Session, Activity, Source, Artifact, SessionTemplate } from '@/types/jules';

const API_BASE_URL = '/api/jules';

export class JulesClient {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Handle 401 specifically?
      if (response.status === 401) {
          // Could trigger a re-login flow or event
      }
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async listSessions(): Promise<Session[]> {
    return this.fetch<Session[]>('/sessions');
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.fetch<Session>(`/sessions/${sessionId}`);
  }

  async createSession(sourceId: string, prompt: string, title?: string, branch?: string): Promise<Session> {
    return this.fetch<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ sourceId, prompt, title, branch }),
    });
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    return this.fetch<Session>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async listActivities(sessionId: string, limit: number = 50, offset: number = 0): Promise<Activity[]> {
    return this.fetch<Activity[]>(`/sessions/${sessionId}/activities?limit=${limit}&offset=${offset}`);
  }

  async createActivity(params: { sessionId: string; content: string; type?: string; metadata?: any }): Promise<Activity> {
    return this.fetch<Activity>(`/sessions/${params.sessionId}/activities`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listSources(): Promise<Source[]> {
    return this.fetch<Source[]>('/sources');
  }

  async listArtifacts(sessionId: string): Promise<Artifact[]> {
    return this.fetch<Artifact[]>(`/sessions/${sessionId}/artifacts`);
  }

  async getArtifact(sessionId: string, artifactId: string): Promise<Artifact> {
    return this.fetch<Artifact>(`/sessions/${sessionId}/artifacts/${artifactId}`);
  }

  async approvePlan(sessionId: string): Promise<void> {
    return this.fetch<void>(`/sessions/${sessionId}/approve`, {
      method: 'POST',
    });
  }

  async listTemplates(): Promise<SessionTemplate[]> {
    return this.fetch<SessionTemplate[]>('/templates');
  }

  async createTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionTemplate> {
    return this.fetch<SessionTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(id: string, template: Partial<SessionTemplate>): Promise<SessionTemplate> {
    return this.fetch<SessionTemplate>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.fetch<void>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }
}
