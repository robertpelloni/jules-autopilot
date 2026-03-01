import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * Validates an API key from the Authorization header.
 * Returns the key record if valid, or null if invalid/expired/over-quota.
 */
export async function validateApiKey(
    authHeader: string | null
): Promise<{ valid: boolean; keyId?: string; scopes?: string[]; error?: string }> {
    if (!authHeader || !authHeader.startsWith('Bearer jk_')) {
        return { valid: false, error: 'Missing or malformed API key' };
    }

    const rawKey = authHeader.replace('Bearer ', '');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const key = await prisma.apiKey.findUnique({ where: { keyHash } });

    if (!key) {
        return { valid: false, error: 'Invalid API key' };
    }

    if (!key.isActive) {
        return { valid: false, error: 'API key has been revoked' };
    }

    if (key.expiresAt && new Date() > key.expiresAt) {
        return { valid: false, error: 'API key has expired' };
    }

    if (key.quotaCents !== null && key.usedCents >= key.quotaCents) {
        return { valid: false, error: 'API key quota exceeded' };
    }

    // Update usage stats
    await prisma.apiKey.update({
        where: { id: key.id },
        data: {
            requestCount: { increment: 1 },
            lastUsedAt: new Date()
        }
    });

    return {
        valid: true,
        keyId: key.id,
        scopes: key.scopes.split(',')
    };
}
