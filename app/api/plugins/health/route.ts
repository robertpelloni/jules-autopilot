import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleInternalError } from '@/lib/api/error';

export async function GET(req: Request) {
    try {
        const installations = await prisma.installedPlugin.findMany({
            include: { plugin: true }
        });

        const healthStatus = installations.map(inst => {
            // Mocking health check logic determining if a plugin's target is responsive
            // In a production system, this would ping the plugin's origin or MCP bridge
            const isHealthy = Math.random() > 0.1; // 10% chance to simulate degradation for testing UI robustness

            return {
                pluginId: inst.pluginId,
                name: inst.plugin.name,
                status: inst.isEnabled ? (isHealthy ? 'healthy' : 'degraded') : 'disabled',
                lastChecked: new Date().toISOString(),
                version: inst.plugin.version,
                message: isHealthy ? 'Responding normally' : 'High latency detected or timeout'
            };
        });

        return NextResponse.json({ health: healthStatus });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
