/**
 * @jest-environment node
 */
import { GET, POST } from './route';
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
        sessionTemplate: {
            findMany: jest.fn(),
            create: jest.fn()
        }
    }
}));

describe('API Route: /api/templates', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createPostRequest = (body: any) => {
        return new NextRequest('http://localhost/api/templates', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    };

    describe('GET', () => {
        it('should return empty list if no templates exist and seeding is skipped (mocked)', async () => {
            // Let's mock the initial empty DB, then the seeded DB to return 4 default templates
            (prisma.sessionTemplate.findMany as jest.Mock)
                .mockResolvedValueOnce([]) // First check
                .mockResolvedValueOnce([ // After seed
                    { id: '1', name: 'T1', tags: 'a,b', createdAt: new Date(), updatedAt: new Date() }
                ]);
            (prisma.sessionTemplate.create as jest.Mock).mockResolvedValue({});

            const req = new NextRequest('http://localhost/api/templates');
            const res = await GET(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.length).toBe(1);
            expect(data[0].name).toBe('T1');
            expect(data[0].tags).toEqual(['a', 'b']);
        });

        it('should return existing templates', async () => {
            const mockDate = new Date();
            (prisma.sessionTemplate.findMany as jest.Mock).mockResolvedValue([
                { id: '2', name: 'Existing', tags: 'x', createdAt: mockDate, updatedAt: mockDate }
            ]);

            const req = new NextRequest('http://localhost/api/templates');
            const res = await GET(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.length).toBe(1);
            expect(data[0].name).toBe('Existing');
        });

        it('should handle internal errors gracefully via handleInternalError', async () => {
            (prisma.sessionTemplate.findMany as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
            const req = new NextRequest('http://localhost/api/templates');
            const res = await GET(req);

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBeDefined();
        });
    });

    describe('POST', () => {
        it('should create a new template', async () => {
            const mockDate = new Date();
            (prisma.sessionTemplate.create as jest.Mock).mockResolvedValue({
                id: 'new-id',
                name: 'New Template',
                tags: 'custom,tag',
                createdAt: mockDate,
                updatedAt: mockDate
            });

            const req = createPostRequest({
                name: 'New Template',
                prompt: 'Test prompt',
                tags: ['custom', 'tag']
            });

            const res = await POST(req);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.id).toBe('new-id');
            expect(data.tags).toEqual(['custom', 'tag']);
            expect(prisma.sessionTemplate.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'New Template',
                    tags: 'custom,tag'
                })
            });
        });
    });
});
