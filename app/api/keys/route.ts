import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * GET /api/keys — List all API keys (masked).
 * POST /api/keys — Create a new API key.
 * DELETE /api/keys — Revoke an API key.
 */
export async function GET(): Promise<Response> {
    const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            keyPrefix: true,
            scopes: true,
            rateLimit: true,
            quotaCents: true,
            usedCents: true,
            requestCount: true,
            lastUsedAt: true,
            expiresAt: true,
            isActive: true,
            createdAt: true
        }
    });

    return NextResponse.json({ keys });
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as {
        name?: string;
        scopes?: string;
        rateLimit?: number;
        quotaCents?: number;
        expiresInDays?: number;
    };

    if (!body.name) {
        return NextResponse.json({ error: 'Missing "name" field' }, { status: 400 });
    }

    // Generate a secure API key
    const rawKey = `jk_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 11); // "jk_" + first 8 hex chars

    const expiresAt = body.expiresInDays
        ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const key = await prisma.apiKey.create({
        data: {
            name: body.name,
            keyHash,
            keyPrefix,
            scopes: body.scopes || 'read,write',
            rateLimit: body.rateLimit || 100,
            quotaCents: body.quotaCents || null,
            expiresAt
        }
    });

    // Return the raw key ONLY on creation — it's never shown again
    return NextResponse.json({
        key: {
            id: key.id,
            name: key.name,
            keyPrefix: key.keyPrefix,
            rawKey, // Only returned once!
            scopes: key.scopes,
            rateLimit: key.rateLimit,
            expiresAt: key.expiresAt,
            createdAt: key.createdAt
        }
    }, { status: 201 });
}

export async function DELETE(req: Request): Promise<Response> {
    const body = await req.json() as { keyId?: string };

    if (!body.keyId) {
        return NextResponse.json({ error: 'Missing "keyId"' }, { status: 400 });
    }

    await prisma.apiKey.update({
        where: { id: body.keyId },
        data: { isActive: false }
    });

    return NextResponse.json({ success: true, revoked: body.keyId });
}
