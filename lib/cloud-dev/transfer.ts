import type {
  CloudDevProviderId,
  CloudDevProviderInterface,
  SessionTransfer,
  SessionTransferRequest,
  SessionExportData,
  UnifiedSession,
} from '@/types/cloud-dev';

export class SessionTransferService {
  private providers: Map<CloudDevProviderId, CloudDevProviderInterface>;
  private activeTransfers: Map<string, SessionTransfer> = new Map();

  constructor(providers: Map<CloudDevProviderId, CloudDevProviderInterface>) {
    this.providers = providers;
  }

  async initiateTransfer(request: SessionTransferRequest): Promise<SessionTransfer> {
    const sourceProvider = this.providers.get(request.sourceProvider);
    const targetProvider = this.providers.get(request.targetProvider);

    if (!sourceProvider) {
      throw new Error(`Source provider '${request.sourceProvider}' not configured`);
    }
    if (!targetProvider) {
      throw new Error(`Target provider '${request.targetProvider}' not configured`);
    }

    const transfer: SessionTransfer = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fromProvider: request.sourceProvider,
      fromSessionId: request.sourceSessionId,
      toProvider: request.targetProvider,
      status: 'pending',
      createdAt: new Date().toISOString(),
      transferredItems: { activities: 0, files: 0, artifacts: 0 },
    };

    this.activeTransfers.set(transfer.id, transfer);

    try {
      transfer.status = 'in_progress';

      const exportData = await sourceProvider.exportSession(request.sourceSessionId);

      const newPrompt = this.buildTransferPrompt(exportData, request);

      const newSession = await targetProvider.createSession({
        title: `[Transferred] ${exportData.session.title}`,
        prompt: newPrompt,
        repository: exportData.session.repository,
      });

      transfer.toSessionId = newSession.providerSessionId;
      transfer.status = 'completed';
      transfer.completedAt = new Date().toISOString();
      transfer.transferredItems = {
        activities: exportData.activities.length,
        files: exportData.files?.length || 0,
        artifacts: exportData.artifacts?.length || 0,
      };
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }

    return transfer;
  }

  private buildTransferPrompt(exportData: SessionExportData, request: SessionTransferRequest): string {
    const parts: string[] = [];

    if (request.options?.newPrompt) {
      parts.push(request.options.newPrompt);
    } else if (request.options?.continueFromLastState) {
      parts.push('Continue the following task from where it left off:\n');
      parts.push(`Original prompt: ${exportData.session.prompt || 'No prompt provided'}\n`);

      if (exportData.session.summary) {
        parts.push(`\nPrevious session summary: ${exportData.session.summary}\n`);
      }

      if (request.options?.includeActivities && exportData.activities.length > 0) {
        const recentActivities = exportData.activities.slice(-10);
        parts.push('\nRecent activity context:\n');
        for (const activity of recentActivities) {
          parts.push(`[${activity.role}] ${activity.content.slice(0, 500)}\n`);
        }
      }
    } else {
      parts.push(exportData.session.prompt || 'Continue previous work');
    }

    return parts.join('');
  }

  getTransfer(transferId: string): SessionTransfer | undefined {
    return this.activeTransfers.get(transferId);
  }

  getActiveTransfers(): SessionTransfer[] {
    return Array.from(this.activeTransfers.values()).filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    );
  }

  getAllTransfers(): SessionTransfer[] {
    return Array.from(this.activeTransfers.values());
  }
}

export function buildSessionContext(session: UnifiedSession): string {
  const parts: string[] = [];

  parts.push(`Session: ${session.title}`);
  parts.push(`Provider: ${session.providerId}`);
  parts.push(`Status: ${session.status}`);

  if (session.repository) {
    parts.push(`Repository: ${session.repository.owner}/${session.repository.name}`);
    if (session.repository.branch) {
      parts.push(`Branch: ${session.repository.branch}`);
    }
  }

  if (session.summary) {
    parts.push(`\nSummary: ${session.summary}`);
  }

  return parts.join('\n');
}

export function canTransferBetweenProviders(
  source: CloudDevProviderInterface,
  target: CloudDevProviderInterface
): { canTransfer: boolean; reason?: string } {
  if (!source.config.capabilities.supportsSessionExport) {
    return {
      canTransfer: false,
      reason: `${source.config.name} does not support session export`,
    };
  }

  if (target.config.capabilities.supportsSessionImport === false) {
    return {
      canTransfer: false,
      reason: `${target.config.name} does not support session import`,
    };
  }

  return { canTransfer: true };
}
