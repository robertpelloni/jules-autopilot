/**
 * Webhook Dispatcher
 * 
 * Securely fires outbound webhooks to configured URLs when specific
 * agent events occur (e.g., session complete, agent blocked, cost alert).
 * Includes signature generation and automatic retries.
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { withRetry, RETRY_POLICIES } from '../lib/retry-policy';

export interface WebhookPayload {
    event: 'session.completed' | 'session.failed' | 'alert.triggered' | 'budget.exceeded';
    workspaceId: string;
    resourceId: string;
    data: Record<string, unknown>;
    timestamp: string;
}

/**
 * Generate HMAC SHA-256 signature for webhook payload.
 */
function generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatch a webhook to a specific route.
 */
async function sendWebhook(
    url: string,
    secret: string | null,
    payload: WebhookPayload
): Promise<boolean> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Jules-Webhook-Dispatcher/1.0'
    };

    if (secret) {
        headers['X-Jules-Signature'] = `sha256=${generateSignature(body, secret)}`;
    }

    const { success, error } = await withRetry(async () => {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body,
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            throw new Response(res.statusText, { status: res.status });
        }
    }, RETRY_POLICIES.conservative);

    if (!success) {
        console.error(`Failed to dispatch webhook to ${url}:`, error);
        return false;
    }

    return true;
}

/**
 * Broadcast an event to all configured webhooks for a workspace.
 */
export async function dispatchEvent(
    workspaceId: string,
    event: WebhookPayload['event'],
    resourceId: string,
    data: Record<string, unknown>
): Promise<{ dispatched: number; failed: number }> {
    // Fetch configured outbound webhooks from Notification model
    const records = await prisma.notification.findMany({
        where: { type: 'system', resourceType: 'outbound_webhook' }
    });

    if (records.length === 0) return { dispatched: 0, failed: 0 };

    interface OutboundRoute { url: string; secret: string | null; events: string[] }

    const routes: OutboundRoute[] = records.map(r => {
        try { return JSON.parse(r.body) as OutboundRoute; }
        catch { return null; }
    }).filter((r): r is OutboundRoute => r !== null && (r.events.includes('*') || r.events.includes(event)));

    if (routes.length === 0) return { dispatched: 0, failed: 0 };

    const payload: WebhookPayload = {
        event,
        workspaceId,
        resourceId,
        data,
        timestamp: new Date().toISOString()
    };

    const results = await Promise.all(
        routes.map(r => sendWebhook(r.url, r.secret, payload))
    );

    const dispatched = results.filter(Boolean).length;
    const failed = results.length - dispatched;

    return { dispatched, failed };
}
