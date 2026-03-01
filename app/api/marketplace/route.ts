import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/marketplace — List plugins with optional search.
 * POST /api/marketplace — Publish a new plugin to the registry.
 */
export async function GET(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const search = url.searchParams.get('q') || '';
    const tag = url.searchParams.get('tag') || '';

    const where: Record<string, unknown> = {};
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { description: { contains: search } },
            { author: { contains: search } }
        ];
    }
    if (tag) {
        where.tags = { contains: tag };
    }

    const plugins = await prisma.marketplacePlugin.findMany({
        where,
        orderBy: { downloads: 'desc' },
        take: 100
    });

    return NextResponse.json({ plugins });
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as {
        name?: string;
        description?: string;
        author?: string;
        version?: string;
        wasmUrl?: string;
        iconUrl?: string;
        signature?: string;
        capabilities?: string[];
        tags?: string[];
    };

    if (!body.name || !body.description || !body.author || !body.version || !body.wasmUrl) {
        return NextResponse.json({
            error: 'Missing required fields: name, description, author, version, wasmUrl'
        }, { status: 400 });
    }

    const plugin = await prisma.marketplacePlugin.upsert({
        where: { name: body.name },
        update: {
            description: body.description,
            author: body.author,
            version: body.version,
            wasmUrl: body.wasmUrl,
            iconUrl: body.iconUrl || null,
            signature: body.signature || null,
            capabilities: body.capabilities ? JSON.stringify(body.capabilities) : null,
            tags: body.tags ? body.tags.join(',') : null
        },
        create: {
            name: body.name,
            description: body.description,
            author: body.author,
            version: body.version,
            wasmUrl: body.wasmUrl,
            iconUrl: body.iconUrl || null,
            signature: body.signature || null,
            capabilities: body.capabilities ? JSON.stringify(body.capabilities) : null,
            tags: body.tags ? body.tags.join(',') : null
        }
    });

    return NextResponse.json({ plugin }, { status: 201 });
}
