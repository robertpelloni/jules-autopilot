import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InstallPluginPayloadSchema } from '@/lib/schemas/plugins';

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const pluginId = params.id;

        // 1. Verify manifest exists
        const manifest = await prisma.pluginManifest.findUnique({
            where: { id: pluginId }
        });

        if (!manifest) {
            return NextResponse.json(
                { error: 'Plugin manifest not found in registry' },
                { status: 404 }
            );
        }

        // 2. Validate payload configuration
        let body;
        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const parseResult = InstallPluginPayloadSchema.safeParse({
            pluginId,
            config: body.config
        });

        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid installation payload', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        // 3. Upsert installation
        const installed = await prisma.installedPlugin.upsert({
            where: {
                id: pluginId, // Using pluginId as primary key for 1:1 relation constraint conceptually
            },
            update: {
                isEnabled: true,
                // Only update config if provided in request
                ...(parseResult.data.config ? { config: JSON.stringify(parseResult.data.config) } : {})
            },
            create: {
                id: pluginId, // Enforcing 1 installation per plugin ID
                pluginId: pluginId,
                config: parseResult.data.config ? JSON.stringify(parseResult.data.config) : undefined,
                isEnabled: true
            }
        });

        return NextResponse.json({ success: true, installation: installed });

    } catch (error) {
        console.error('[Plugins API] Installation failed:', error);
        return NextResponse.json(
            { error: 'Internal server error during plugin installation' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const pluginId = params.id;

        // Hard delete the installation record
        await prisma.installedPlugin.delete({
            where: { id: pluginId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        // Prisma RecordNotFound error code P2025
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Plugin is not currently installed' },
                { status: 404 }
            );
        }

        console.error('[Plugins API] Uninstallation failed:', error);
        return NextResponse.json(
            { error: 'Internal server error during plugin uninstallation' },
            { status: 500 }
        );
    }
}
