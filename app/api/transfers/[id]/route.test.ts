/**
 * @jest-environment node
 */
import { GET, PATCH } from './route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/session', () => ({
    getSession: jest.fn().mockResolvedValue({
        workspaceId: 'ws-test-123',
        user: { id: 'user-1', workspaceId: 'ws-test-123' },
        apiKey: 'authenticated-via-oauth',
    }),
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        sessionTransfer: {
            findUnique: jest.fn(),
            update: jest.fn()
        }
    }
}));

describe('API Route: /api/transfers/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    describe('GET', () => {
        it('should return 404 if transfer does not exist', async () => {
            (prisma.sessionTransfer.findUnique as jest.Mock).mockResolvedValue(null);

            const req = new NextRequest('http://localhost/api/transfers/no-uuid');
            const res = await GET(req, { params: Promise.resolve({ id: 'no-uuid' }) });

            expect(res.status).toBe(404);
            expect(await res.text()).toBe('Not found');
        });

        it('should return 200 with transfer data if exists', async () => {
            const mockData = { id: 'transfer-1', status: 'ready', workspaceId: 'ws-test-123' };
            (prisma.sessionTransfer.findUnique as jest.Mock).mockResolvedValue(mockData);

            const req = new NextRequest('http://localhost/api/transfers/transfer-1');
            const res = await GET(req, { params: Promise.resolve({ id: 'transfer-1' }) });

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual(mockData);
        });
    });

    describe('PATCH', () => {
        it('should return 422 for invalid patch payload', async () => {
            const req = new NextRequest('http://localhost/api/transfers/transfer-1', {
                method: 'PATCH',
                body: JSON.stringify({ status: 'invalid_status_enum' })
            });
            const res = await PATCH(req, { params: Promise.resolve({ id: 'transfer-1' }) });

            expect(res.status).toBe(422);
            const data = await res.json();
            // Zod error issues array
            expect(Array.isArray(data)).toBe(true);
        });

        it('should successfully update transfer status', async () => {
            const mockUpdated = { id: 'transfer-1', status: 'preparing', workspaceId: 'ws-test-123' };
            (prisma.sessionTransfer.findUnique as jest.Mock).mockResolvedValue({ id: 'transfer-1', workspaceId: 'ws-test-123' });
            (prisma.sessionTransfer.update as jest.Mock).mockResolvedValue(mockUpdated);

            const req = new NextRequest('http://localhost/api/transfers/transfer-1', {
                method: 'PATCH',
                body: JSON.stringify({ status: 'preparing' })
            });
            const res = await PATCH(req, { params: Promise.resolve({ id: 'transfer-1' }) });

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual(mockUpdated);
            expect(prisma.sessionTransfer.update).toHaveBeenCalledWith({
                where: { id: 'transfer-1' },
                data: expect.objectContaining({ status: 'preparing' })
            });
        });

        it('should handle internal errors', async () => {
            (prisma.sessionTransfer.findUnique as jest.Mock).mockResolvedValue({ id: 'transfer-1', workspaceId: 'ws-test-123' });
            (prisma.sessionTransfer.update as jest.Mock).mockRejectedValue(new Error('DB Crash'));

            const req = new NextRequest('http://localhost/api/transfers/transfer-1', {
                method: 'PATCH',
                body: JSON.stringify({ status: 'failed', errorReason: 'Network timeout' })
            });
            const res = await PATCH(req, { params: Promise.resolve({ id: 'transfer-1' }) });

            expect(res.status).toBe(500);
            expect(await res.text()).toBe('Internal error');
        });
    });
});
