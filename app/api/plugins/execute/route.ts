import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleInternalError } from '@/lib/api/error';
import { z } from 'zod';
import { PluginCapability } from '@/lib/schemas/plugins';
import { getSession } from '@/lib/session';

const ExecutionPayloadSchema = z.object({
    pluginId: z.string().min(1),
    action: z.string().min(1),
    requiredCapability: z.enum([
        'filesystem:read',
        'filesystem:write',
        'network:http',
        'system:execute',
        'mcp:invoke_tool'
    ]),
    payload: z.record(z.string(), z.unknown()).optional()
});

export async function POST(req: Request) {
    try {
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const parseResult = ExecutionPayloadSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid execution payload', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { pluginId, requiredCapability, action, payload } = parseResult.data;

        // 0. Authenticate Workspace and load usage quotas
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: session.workspaceId },
            select: { id: true, maxPluginExecutionsPerDay: true }
        });

        if (!workspace) {
            return new NextResponse('Workspace not found', { status: 404 });
        }

        // 1. Enforce Workspace Execution Quota (Rate Limiting)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const executionsToday = await prisma.pluginAuditLog.count({
            where: {
                workspaceId: workspace.id,
                timestamp: { gte: today }
            }
        });

        if (executionsToday >= workspace.maxPluginExecutionsPerDay) {
            // Log quota violation failure
            await prisma.pluginAuditLog.create({
                data: {
                    pluginId,
                    action,
                    capabilityRequested: requiredCapability,
                    success: false,
                    workspaceId: workspace.id
                }
            });

            return NextResponse.json(
                {
                    error: 'Execution Quota Exceeded',
                    details: `Workspace '${workspace.id}' has exceeded its daily limit of ${workspace.maxPluginExecutionsPerDay} plugin executions.`
                },
                { status: 429 }
            ); // 429 Too Many Requests
        }

        // 2. Verify plugin is installed and enabled
        const installedPlugin = await prisma.installedPlugin.findUnique({
            where: { id: pluginId },
            include: { plugin: true }
        });

        if (!installedPlugin) {
            return NextResponse.json({ error: 'Plugin is not installed' }, { status: 404 });
        }

        if (!installedPlugin.isEnabled) {
            return NextResponse.json({ error: 'Plugin is installed but currently disabled' }, { status: 403 });
        }

        // 2. Enforce Capability Boundaries
        let capabilities: PluginCapability[] = [];
        try {
            capabilities = JSON.parse(installedPlugin.plugin.capabilities);
        } catch {
            return NextResponse.json({ error: 'Corrupted plugin capabilities record' }, { status: 500 });
        }

        if (!capabilities.includes(requiredCapability as PluginCapability)) {
            console.warn(`[Plugins API] Security Boundary Blocked: Plugin ${pluginId} attempted to use ${requiredCapability} without permission.`);

            await prisma.pluginAuditLog.create({
                data: {
                    pluginId,
                    action,
                    capabilityRequested: requiredCapability,
                    success: false,
                    workspaceId: workspace.id
                }
            });

            return NextResponse.json(
                {
                    error: 'Security Boundary Violation: Capability not granted',
                    requestedCapability: requiredCapability,
                    grantedCapabilities: capabilities
                },
                { status: 403 }
            );
        }

        // 4. Simulate execution (In a real system, this would route to a Plugin Sandbox/VM or MCP Host)
        console.log(`[Plugins API] Executing ${action} for ${pluginId} using ${requiredCapability}...`, payload);

        // Mock successful execution
        await prisma.pluginAuditLog.create({
            data: {
                pluginId,
                action,
                capabilityRequested: requiredCapability,
                success: true,
                workspaceId: workspace.id
            }
        });

        return NextResponse.json({
            success: true,
            message: `Executed ${action} successfully`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return handleInternalError(req, error);
    }
}
