import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PluginRegistryItem } from '@/lib/schemas/plugins';
import { handleInternalError } from '@/lib/api/error';

const SEED_PLUGINS = [
    {
        id: 'jira-integration',
        name: 'Jira Integration',
        description: 'Connect tasks directly to Jira tickets and sync status updates.',
        author: 'Atlassian',
        version: '1.2.0',
        capabilities: '["network:http"]',
    },
    {
        id: 'slack-notifications',
        name: 'Slack Notifications',
        description: 'Get real-time updates in your Slack channels for critical events.',
        author: 'Slack',
        version: '2.0.1',
        capabilities: '["network:http"]',
    },
    {
        id: 'figma-to-code',
        name: 'Figma to Code',
        description: 'Convert Figma designs into React components automatically.',
        author: 'Figma',
        version: '0.9.5',
        capabilities: '["filesystem:write", "network:http"]',
    },
    {
        id: 'sentry-reporting',
        name: 'Sentry Reporting',
        description: 'Automatically log errors and exceptions to Sentry.',
        author: 'Sentry',
        version: '3.1.0',
        capabilities: '["network:http"]',
    },
    {
        id: 'vscode-sync',
        name: 'VS Code Sync',
        description: 'Sync your local VS Code workspace settings with Jules.',
        author: 'Microsoft',
        version: '1.0.0',
        capabilities: '["filesystem:read", "filesystem:write"]',
    },
    {
        id: 'github-copilot-bridge',
        name: 'GitHub Copilot Bridge',
        description: 'Use Copilot suggestions within the Jules terminal.',
        author: 'GitHub',
        version: '1.5.2',
        capabilities: '["mcp:invoke_tool"]',
    }
];

export async function GET(req: Request) {
    try {
        // 1. Check if registry is empty. If so, seed it.
        const count = await prisma.pluginManifest.count();
        if (count === 0) {
            console.log('[Plugins API] Registry empty, seeding initial plugins...');
            for (const plugin of SEED_PLUGINS) {
                await prisma.pluginManifest.create({
                    data: plugin
                });
            }
        }

        // 2. Fetch all manifests
        const manifests = await prisma.pluginManifest.findMany({
            orderBy: { name: 'asc' }
        });

        // 3. Fetch all active user installations
        const installations = await prisma.installedPlugin.findMany();
        const installedMap = new Map(installations.map(inst => [inst.pluginId, inst]));

        // 4. Map to unified registry items
        const registryItems: PluginRegistryItem[] = manifests.map(manifest => {
            const dbInstall = installedMap.get(manifest.id);

            return {
                id: manifest.id,
                name: manifest.name,
                description: manifest.description,
                author: manifest.author,
                version: manifest.version,
                capabilities: JSON.parse(manifest.capabilities),
                configSchema: manifest.configSchema ? JSON.parse(manifest.configSchema) : undefined,
                createdAt: manifest.createdAt.toISOString(),
                updatedAt: manifest.updatedAt.toISOString(),

                isInstalled: !!dbInstall,
                isEnabled: dbInstall?.isEnabled,
                userConfig: dbInstall?.config ? JSON.parse(dbInstall.config) : undefined
            };
        });

        return NextResponse.json({ plugins: registryItems });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
