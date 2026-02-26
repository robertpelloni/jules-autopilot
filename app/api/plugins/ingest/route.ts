import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleInternalError } from '@/lib/api/error';
import { PluginManifestSchema } from '@/lib/schemas/plugins';
import { verifyPluginManifest } from '@/lib/crypto/signatures';

export async function POST(req: Request) {
    try {
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const parseResult = PluginManifestSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid plugin manifest schema', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const manifest = parseResult.data;

        // Verify cryptographic signature to prevent supply-chain poisoning
        if (!verifyPluginManifest(manifest)) {
            return NextResponse.json(
                { error: 'Manifest signature verification failed. Invalid origin.' },
                { status: 403 }
            );
        }

        // Upsert into DB registry with 'pending' status for review, or 'active' if auto-approved
        const plugin = await prisma.pluginManifest.upsert({
            where: { id: manifest.id },
            update: {
                name: manifest.name,
                description: manifest.description,
                author: manifest.author,
                version: manifest.version,
                capabilities: JSON.stringify(manifest.capabilities),
                configSchema: manifest.configSchema ? JSON.stringify(manifest.configSchema) : null,
                signature: manifest.signature,
                publicKey: manifest.publicKey,
                status: 'active' // For the sake of the MVP marketplace, we default to active after passing signature verification
            },
            create: {
                id: manifest.id,
                name: manifest.name,
                description: manifest.description,
                author: manifest.author,
                version: manifest.version,
                capabilities: JSON.stringify(manifest.capabilities),
                configSchema: manifest.configSchema ? JSON.stringify(manifest.configSchema) : null,
                signature: manifest.signature,
                publicKey: manifest.publicKey,
                status: 'active'
            }
        });

        return NextResponse.json({
            success: true,
            pluginId: plugin.id,
            status: plugin.status,
            message: 'Plugin ingested and verified successfully.'
        }, { status: 201 });

    } catch (error) {
        return handleInternalError(req, error);
    }
}
