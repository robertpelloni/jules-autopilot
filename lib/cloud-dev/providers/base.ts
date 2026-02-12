import type {
  CloudDevProviderId,
  CloudDevProviderConfig,
  CloudDevProviderInterface,
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
  SessionExportData,
  ProviderHealth,
} from '@/types/cloud-dev';
import { CLOUD_DEV_PROVIDERS } from '@/types/cloud-dev';

export abstract class BaseCloudDevProvider implements CloudDevProviderInterface {
  id: CloudDevProviderId;
  config: CloudDevProviderConfig;
  protected apiKey?: string;
  protected baseUrl: string;
  protected isMock: boolean;

  constructor(id: CloudDevProviderId, apiKey?: string) {
    this.id = id;
    const providerDef = CLOUD_DEV_PROVIDERS[id];
    // Enable if API key is present OR if we force mock mode (e.g. for demo)
    // For now, we infer mock mode if apiKey is 'mock'
    this.isMock = apiKey === 'mock';

    this.config = {
      ...providerDef,
      isEnabled: !!apiKey,
      apiKey,
    };
    this.apiKey = apiKey;
    this.baseUrl = providerDef.apiBaseUrl || '';
  }

  protected async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new CloudDevProviderError(
        this.id,
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        error
      );
    }

    return response.json();
  }

  abstract listSessions(): Promise<UnifiedSession[]>;
  abstract getSession(sessionId: string): Promise<UnifiedSession | null>;
  abstract createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession>;
  abstract updateSession(sessionId: string, updates: Partial<UnifiedSession>): Promise<UnifiedSession>;
  abstract deleteSession(sessionId: string): Promise<void>;
  abstract pauseSession(sessionId: string): Promise<void>;
  abstract resumeSession(sessionId: string, message?: string): Promise<void>;
  abstract cancelSession(sessionId: string): Promise<void>;
  abstract listActivities(sessionId: string): Promise<UnifiedActivity[]>;
  abstract sendMessage(sessionId: string, content: string): Promise<UnifiedActivity>;

  async exportSession(sessionId: string): Promise<SessionExportData> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new CloudDevProviderError(this.id, `Session ${sessionId} not found`, 404);
    }

    const activities = await this.listActivities(sessionId);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      sourceProvider: this.id,
      session,
      activities,
    };
  }

  async getHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      await this.fetch('/health');
      return {
        status: 'healthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unavailable',
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  }
}

export class CloudDevProviderError extends Error {
  constructor(
    public providerId: CloudDevProviderId,
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(`[${providerId}] ${message}`);
    this.name = 'CloudDevProviderError';
  }
}

export class ProviderNotImplementedError extends CloudDevProviderError {
  constructor(providerId: CloudDevProviderId, method: string) {
    super(providerId, `Method '${method}' is not yet implemented for ${providerId}`);
    this.name = 'ProviderNotImplementedError';
  }
}
