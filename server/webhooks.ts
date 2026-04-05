import { prisma } from '../lib/prisma';
import { orchestratorQueue } from './queue';
import { emitDaemonEvent } from './index';
import { addLog } from './daemon';

interface BorgWebhookPayload {
    type: string;
    source?: string;
    data?: Record<string, unknown>;
}

export async function handleBorgWebhook(payload: BorgWebhookPayload) {
    const { type, data = {}, source } = payload;
    
    await addLog(`Received Borg signal: ${type} from ${source || 'unknown'}`, 'info', 'global');

    switch (type) {
        case 'repo_updated':
            // Borg detected a code change elsewhere, trigger a re-index
            await addLog(`Borg reported repo update. Enqueueing RAG re-index...`, 'action', 'global');
            await orchestratorQueue.add('index_codebase', {});
            break;

        case 'dependency_alert':
            // Borg detected a dependency change that might affect our fleet
            await addLog(`Borg Dependency Alert: ${data.dependency} updated to ${data.version}`, 'info', 'global');
            // We could optionally broadcast a nudge to all active sessions here
            break;

        case 'fleet_command':
            // A direct instruction from the Borg meta-orchestrator
            if (data.action === 'reindex_all') {
                await orchestratorQueue.add('index_codebase', {});
            } else if (data.action === 'clear_logs') {
                await prisma.keeperLog.deleteMany({});
            }
            break;

        case 'issue_detected':
            // Borg found a high-priority issue, trigger our autonomous conversion
            if (data.sourceId) {
                await addLog(`Borg detected urgent issue. Triggering session evaluation...`, 'action', 'global');
                await orchestratorQueue.add('check_issues', { sourceId: data.sourceId });
            }
            break;

        default:
            console.log(`[Webhooks] Received unhandled Borg event type: ${type}`);
    }

    emitDaemonEvent('borg_signal_received', { type, timestamp: new Date().toISOString() });
    return { success: true, processed: true };
}
