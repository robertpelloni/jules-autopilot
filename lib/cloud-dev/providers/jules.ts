// @ts-nocheck
import { BaseCloudDevProvider, ProviderNotImplementedError } from './base';
import type {
  UnifiedSession,
  UnifiedActivity,
  CreateCloudDevSessionRequest,
  UnifiedSessionStatus,
} from '@/types/cloud-dev';
import type { Session, Activity } from '@jules/shared';
import { JulesClient } from '@/lib/jules/client';

function mapJulesStatusToUnified(status: Session['status']): UnifiedSessionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'paused':
      return 'paused';
    case 'awaiting_approval':
      return 'awaiting_approval';
    default:
      return 'active';
  }
}

function mapJulesSessionToUnified(session: Session): UnifiedSession {
  return {
    id: `jules:${session.id}`,
    providerId: 'jules',
    providerSessionId: session.id,
    title: session.title || 'Untitled',
    prompt: session.prompt,
    status: mapJulesStatusToUnified(session.status),
    repository: session.sourceId
      ? {
          provider: 'github',
          owner: session.sourceId.split('/')[0] || '',
          name: session.sourceId.split('/')[1] || '',
          branch: session.branch,
          url: `https://github.com/${session.sourceId}`,
        }
      : undefined,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastActivityAt: session.lastActivityAt,
    summary: session.summary,
    metadata: {
      providerSpecific: {
        rawState: session.rawState,
        outputs: session.outputs,
      },
    },
  };
}

function mapJulesActivityToUnified(activity: Activity): UnifiedActivity {
  return {
    id: `jules:${activity.id}`,
    sessionId: activity.sessionId,
    providerId: 'jules',
    type: mapActivityType(activity.type),
    role: activity.role as 'user' | 'agent' | 'system',
    content: activity.content,
    diff: activity.diff,
    bashOutput: activity.bashOutput,
    media: activity.media,
    createdAt: activity.createdAt,
    metadata: activity.metadata,
  };
}

function mapActivityType(type: string): UnifiedActivity['type'] {
  switch (type) {
    case 'plan':
      return 'plan';
    case 'progress':
      return 'progress';
    case 'result':
      return 'result';
    case 'error':
      return 'error';
    default:
      return 'message';
  }
}

export class JulesProvider extends BaseCloudDevProvider {
  private client: JulesClient;

  constructor(apiKey?: string) {
    super('jules', apiKey);
    this.client = new JulesClient(apiKey);
  }

  async listSessions(): Promise<UnifiedSession[]> {
    const sessions = await this.client.listSessions();
    return sessions.map(mapJulesSessionToUnified);
  }

  async getSession(sessionId: string): Promise<UnifiedSession | null> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    const session = await this.client.getSession(providerSessionId);
    return session ? mapJulesSessionToUnified(session) : null;
  }

  async createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession> {
    const sourceId = request.repository
      ? `sources/github/${request.repository.owner}/${request.repository.name}`
      : '';

    const session = await this.client.createSession(
      sourceId,
      request.prompt,
      request.title
    );

    return mapJulesSessionToUnified(session);
  }

  async updateSession(
    sessionId: string,
    _updates: Partial<UnifiedSession>
  ): Promise<UnifiedSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  async deleteSession(_sessionId: string): Promise<void> {
    throw new ProviderNotImplementedError('jules', 'deleteSession');
  }

  async pauseSession(sessionId: string): Promise<void> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    await this.client.updateSession(providerSessionId, { status: 'paused' });
  }

  async resumeSession(sessionId: string, message?: string): Promise<void> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    await this.client.resumeSession(providerSessionId, message);
  }

  async cancelSession(sessionId: string): Promise<void> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    await this.client.updateSession(providerSessionId, { status: 'failed' });
  }

  async listActivities(sessionId: string): Promise<UnifiedActivity[]> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    const activities = await this.client.listActivities(providerSessionId);
    return activities.map(mapJulesActivityToUnified);
  }

  async sendMessage(sessionId: string, content: string): Promise<UnifiedActivity> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    await this.client.resumeSession(providerSessionId, content);
    
    const activities = await this.client.listActivities(providerSessionId);
    const latest = activities[activities.length - 1];
    return mapJulesActivityToUnified(latest || {
      id: crypto.randomUUID(),
      sessionId: providerSessionId,
      type: 'message',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    });
  }

  async approvePlan(sessionId: string): Promise<void> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    await this.client.approvePlan(providerSessionId);
  }

  async rejectPlan(sessionId: string, _reason?: string): Promise<void> {
    const providerSessionId = sessionId.startsWith('jules:')
      ? sessionId.slice(6)
      : sessionId;
    await this.client.updateSession(providerSessionId, { status: 'failed' });
  }
}
