import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/marketplace/install — Install a plugin from the marketplace
 * by downloading its Wasm binary and registering it locally.
 */
export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as { pluginId?: string };

    if (!body.pluginId) {
        return NextResponse.json({ error: 'Missing pluginId' }, { status: 400 });
    }

    const plugin = await prisma.marketplacePlugin.findUnique({
        where: { id: body.pluginId }
    });

    if (!plugin) {
        return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    if (!plugin.wasmUrl) {
        return NextResponse.json({ error: 'Plugin has no wasmUrl' }, { status: 400 });
    }

    // Download the Wasm binary from the registry URL
    let wasmPayload: Buffer;
    try {
        const res = await fetch(plugin.wasmUrl);
        if (!res.ok) {
            return NextResponse.json({
                error: `Failed to download Wasm binary: ${res.status}`
            }, { status: 502 });
        }
        const arrayBuffer = await res.arrayBuffer();
        wasmPayload = Buffer.from(arrayBuffer);
    } catch (err) {
        return NextResponse.json({
            error: `Download error: ${err instanceof Error ? err.message : String(err)}`
        }, { status: 502 });
    }

    // Parse capabilities from marketplace metadata
    let capabilities: string[] = [];
    if (plugin.capabilities) {
        try {
            capabilities = JSON.parse(plugin.capabilities) as string[];
        } catch {
            // Default to empty capabilities
        }
    }

    // Register locally as a PluginManifest record
    const localPlugin = await prisma.pluginManifest.upsert({
        where: { id: plugin.name },
        update: {
            description: plugin.description,
            version: plugin.version,
            wasmPayload,
            wasmUrl: plugin.wasmUrl,
            capabilities: JSON.stringify(capabilities),
            status: 'active'
        },
        create: {
            id: plugin.name,
            name: plugin.name,
            description: plugin.description,
            author: plugin.author,
            version: plugin.version,
            capabilities: JSON.stringify(capabilities),
            status: 'active',
            wasmPayload,
            wasmUrl: plugin.wasmUrl
        }
    });

    // Mark as installed in the marketplace and increment download count
    await prisma.marketplacePlugin.update({
        where: { id: plugin.id },
        data: {
            installedAt: new Date(),
            downloads: { increment: 1 }
        }
    });

    return NextResponse.json({
        success: true,
        localPluginId: localPlugin.id,
        name: plugin.name,
        version: plugin.version
    }, { status: 200 });
}
