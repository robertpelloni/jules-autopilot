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

    // 1. Create the persistent transfer record via API
    let dbTransferId = '';
    let transfer: SessionTransfer = {
      id: `local-${Date.now()}`,
      fromProvider: request.sourceProvider,
      fromSessionId: request.sourceSessionId,
      toProvider: request.targetProvider,
      status: 'queued',
      createdAt: new Date().toISOString(),
      transferredItems: { activities: 0, files: 0, artifacts: 0 },
    };

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProvider: request.sourceProvider,
          sourceSessionId: request.sourceSessionId,
          targetProvider: request.targetProvider,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        dbTransferId = data.id;
        transfer.id = dbTransferId;
        this.activeTransfers.set(transfer.id, transfer);
      } else {
        throw new Error('Failed to create transfer record in database');
      }
    } catch (dbError) {
      console.warn('Backend transfer creation failed, falling back to local-only tracking:', dbError);
      this.activeTransfers.set(transfer.id, transfer);
    }

    const updateDBStatus = async (
      status: string,
      updates?: { targetSessionId?: string; transferredItems?: string; errorReason?: string }
    ) => {
      if (!dbTransferId) return;
      try {
        await fetch(`/api/transfers/${dbTransferId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, ...updates }),
        });
      } catch (err) {
        console.warn('Failed to update transfer status to backend:', err);
      }
    };

    try {
      transfer.status = 'preparing';
      await updateDBStatus('preparing');

      transfer.status = 'exporting';
      await updateDBStatus('exporting');
      const exportData = await sourceProvider.exportSession(request.sourceSessionId);

      transfer.status = 'importing';
      await updateDBStatus('importing');
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
        activities: exportData.activities?.length || 0,
        files: exportData.files?.length || 0,
        artifacts: exportData.artifacts?.length || 0,
      };

      await updateDBStatus('completed', {
        targetSessionId: newSession.providerSessionId,
        transferredItems: JSON.stringify(transfer.transferredItems),
      });

    } catch (error) {
      transfer.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      transfer.error = errorMessage;
      await updateDBStatus('failed', { errorReason: errorMessage });
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
