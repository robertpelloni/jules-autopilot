import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const ProviderConfigSchema = z.object({
    providerId: z.string().min(1),
    apiKey: z.string().optional(),
    isEnabled: z.boolean().default(true),
    priority: z.number().int().min(0).default(0),
    maxConcurrent: z.number().int().min(1).max(20).default(3),
    metadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * GET /api/providers — List all provider configurations for the current workspace.
 * POST /api/providers — Upsert a provider configuration.
 */
export async function GET(): Promise<Response> {
    const session = await getSession();
    if (!session?.workspaceId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await prisma.providerConfig.findMany({
        where: { workspaceId: session.workspaceId },
        orderBy: { priority: 'desc' },
        select: {
            id: true,
            providerId: true,
            isEnabled: true,
            priority: true,
            maxConcurrent: true,
            metadata: true,
            createdAt: true,
            updatedAt: true
            // Deliberately exclude apiKey from list responses
        }
    });

    return NextResponse.json({ configs });
}

export async function POST(req: Request): Promise<Response> {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parseResult = ProviderConfigSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const data = parseResult.data;

        const config = await prisma.providerConfig.upsert({
            where: {
                workspaceId_providerId: {
                    workspaceId: session.workspaceId,
                    providerId: data.providerId
                }
            },
            update: {
                apiKey: data.apiKey ?? undefined,
                isEnabled: data.isEnabled,
                priority: data.priority,
                maxConcurrent: data.maxConcurrent,
                metadata: data.metadata ? JSON.stringify(data.metadata) : undefined
            },
            create: {
                workspaceId: session.workspaceId,
                providerId: data.providerId,
                apiKey: data.apiKey || null,
                isEnabled: data.isEnabled,
                priority: data.priority,
                maxConcurrent: data.maxConcurrent,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null
            }
        });

        return NextResponse.json({
            success: true,
            config: {
                id: config.id,
                providerId: config.providerId,
                isEnabled: config.isEnabled,
                priority: config.priority,
                maxConcurrent: config.maxConcurrent,
                hasApiKey: !!config.apiKey
            }
        });

    } catch (error) {
        console.error('Failed to upsert provider config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
