/**
 * @jest-environment node
 */
import { POST } from './route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

jest.mock('@/lib/session', () => ({
    getSession: jest.fn()
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        installedPlugin: {
            findUnique: jest.fn()
        },
        workspace: {
            findUnique: jest.fn()
        },
        pluginAuditLog: {
            count: jest.fn(),
            create: jest.fn()
        }
    }
}));

describe('API Route: /api/plugins/execute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'log').mockImplementation(() => { });

        // Default to a valid session and healthy quota limit
        (getSession as jest.Mock).mockResolvedValue({ workspaceId: 'ws-test-123' });
        (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
            id: 'ws-test-123',
            maxPluginExecutionsPerDay: 100
        });
        (prisma.pluginAuditLog.count as jest.Mock).mockResolvedValue(5);
        (prisma.pluginAuditLog.create as jest.Mock).mockResolvedValue({});
    });

    const createRequest = (body: any) => {
        return new NextRequest('http://localhost/api/plugins/execute', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    };

    it('should return 400 for invalid payload', async () => {
        const req = createRequest({ action: 'do_thing' }); // Missing pluginId and requiredCapability
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Invalid execution payload');
    });

    it('should return 404 if plugin is not installed', async () => {
        (prisma.installedPlugin.findUnique as jest.Mock).mockResolvedValue(null);

        const req = createRequest({
            pluginId: 'unknown',
            action: 'test',
            requiredCapability: 'filesystem:read'
        });
        const res = await POST(req);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toBe('Plugin is not installed');
    });

    it('should return 403 if plugin is installed but disabled', async () => {
        (prisma.installedPlugin.findUnique as jest.Mock).mockResolvedValue({
            id: 'test-plugin',
            isEnabled: false,
            plugin: { capabilities: '["filesystem:read"]' }
        });

        const req = createRequest({
            pluginId: 'test-plugin',
            action: 'test',
            requiredCapability: 'filesystem:read'
        });
        const res = await POST(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toBe('Plugin is installed but currently disabled');
    });

    it('should return 403 if required capability is not granted', async () => {
        (prisma.installedPlugin.findUnique as jest.Mock).mockResolvedValue({
            id: 'test-plugin',
            isEnabled: true,
            plugin: { capabilities: '["network:http"]' } // Missing filesystem:read
        });

        const req = createRequest({
            pluginId: 'test-plugin',
            action: 'steal_files',
            requiredCapability: 'filesystem:read'
        });
        const res = await POST(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('Capability not granted');
        expect(data.requestedCapability).toBe('filesystem:read');
    });

    it('should return 200 success if capability is granted', async () => {
        (prisma.installedPlugin.findUnique as jest.Mock).mockResolvedValue({
            id: 'test-plugin',
            isEnabled: true,
            plugin: { capabilities: '["filesystem:write"]' }
        });

        const req = createRequest({
            pluginId: 'test-plugin',
            action: 'write_file',
            requiredCapability: 'filesystem:write'
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.message).toContain('Executed write_file successfully');
        expect(prisma.pluginAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ success: true, workspaceId: 'ws-test-123' })
        }));
    });

    it('should return 429 if workspace execution quota is exceeded', async () => {
        // Mock that the workspace has 10 executions limit and already hit 10 today
        (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
            id: 'ws-test-123',
            maxPluginExecutionsPerDay: 10
        });
        (prisma.pluginAuditLog.count as jest.Mock).mockResolvedValue(10);

        const req = createRequest({
            pluginId: 'test-plugin',
            action: 'write_file',
            requiredCapability: 'filesystem:write'
        });

        const res = await POST(req);
        expect(res.status).toBe(429);
        const data = await res.json();
        expect(data.error).toBe('Execution Quota Exceeded');

        // Assert the failed attempt was still audited
        expect(prisma.pluginAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ success: false, workspaceId: 'ws-test-123' })
        }));
    });
});
