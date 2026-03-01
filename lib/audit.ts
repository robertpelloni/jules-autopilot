import { prisma } from './prisma';

/**
 * Structured audit logging for compliance and traceability.
 * Every orchestrator action should be logged through this utility.
 */
export async function audit(params: {
    actor: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    apiKeyId?: string;
}): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                actor: params.actor,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId || null,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                ipAddress: params.ipAddress || null,
                apiKeyId: params.apiKeyId || null
            }
        });
    } catch (err) {
        // Audit logging should never crash the application
        console.error('[Audit] Failed to write audit log:', err);
    }
}

/**
 * Common audit action constants for type safety.
 */
export const AuditActions = {
    SESSION_CREATED: 'session.created',
    SESSION_NUDGED: 'session.nudged',
    SESSION_APPROVED: 'session.approved',
    SESSION_HANDOFF: 'session.handoff',
    SWARM_CREATED: 'swarm.created',
    SWARM_DISPATCHED: 'swarm.dispatched',
    SWARM_COMPLETED: 'swarm.completed',
    PLUGIN_INSTALLED: 'plugin.installed',
    PLUGIN_PUBLISHED: 'plugin.published',
    CI_FIX_TRIGGERED: 'ci.fix_triggered',
    CI_FIX_COMPLETED: 'ci.fix_completed',
    API_KEY_CREATED: 'api_key.created',
    API_KEY_REVOKED: 'api_key.revoked',
    CIRCUIT_OPENED: 'circuit.opened',
    CIRCUIT_CLOSED: 'circuit.closed',
    SCHEDULE_CREATED: 'schedule.created',
    SCHEDULE_TRIGGERED: 'schedule.triggered'
} as const;
