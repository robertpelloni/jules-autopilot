/**
 * In-Process Event Bus
 * 
 * Lightweight pub/sub for pushing daemon events to the frontend via SSE.
 * Uses Node.js EventEmitter pattern. In production, this would be backed
 * by Redis Pub/Sub for horizontal scaling.
 */

type EventHandler = (data: EventPayload) => void;

export interface EventPayload {
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
}

class EventBus {
    private listeners: Map<string, Set<EventHandler>> = new Map();

    /**
     * Subscribe to a named channel.
     */
    on(channel: string, handler: EventHandler): void {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, new Set());
        }
        this.listeners.get(channel)!.add(handler);
    }

    /**
     * Unsubscribe from a named channel.
     */
    off(channel: string, handler: EventHandler): void {
        this.listeners.get(channel)?.delete(handler);
    }

    /**
     * Emit an event to all subscribers of a channel.
     */
    emit(channel: string, payload: Omit<EventPayload, 'timestamp'>): void {
        const event: EventPayload = {
            ...payload,
            timestamp: new Date().toISOString()
        };

        // Channel-specific listeners
        this.listeners.get(channel)?.forEach(handler => {
            try { handler(event); } catch (e) { console.error('[EventBus] Handler error:', e); }
        });

        // Wildcard listeners (subscribe to '*' to get everything)
        this.listeners.get('*')?.forEach(handler => {
            try { handler(event); } catch (e) { console.error('[EventBus] Wildcard handler error:', e); }
        });
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Convenience helpers for common daemon events
export function emitSessionUpdate(sessionId: string, status: string, details?: Record<string, unknown>): void {
    eventBus.emit('session', { type: 'session_update', data: { sessionId, status, ...details } });
}

export function emitWorkflowUpdate(workflowId: string, stepId: string, status: string): void {
    eventBus.emit('workflow', { type: 'workflow_step_update', data: { workflowId, stepId, status } });
}

export function emitSystemAlert(severity: string, message: string): void {
    eventBus.emit('system', { type: 'system_alert', data: { severity, message } });
}
