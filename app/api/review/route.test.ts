/**
 * @jest-environment node
 */
import { POST } from './route';
import { NextRequest } from 'next/server';
import { runCodeReview } from '@jules/shared';

// Mock the review library
jest.mock('@jules/shared', () => ({
    runCodeReview: jest.fn()
}));

describe('API Route: /api/review', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if required fields are missing', async () => {
        const req = new NextRequest('http://localhost/api/review', {
            method: 'POST',
            body: JSON.stringify({
                // missing codeContext
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Missing required fields');
    });

    it('should successfully run a review', async () => {
        (runCodeReview as jest.Mock).mockResolvedValue({
            summary: 'Good code',
            score: 90,
            issues: []
        });

        const req = new NextRequest('http://localhost/api/review', {
            method: 'POST',
            body: JSON.stringify({
                codeContext: 'const x = 1;',
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                outputFormat: 'json'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        
        const data = await res.json();
        expect(data).toEqual({
            summary: 'Good code',
            score: 90,
            issues: []
        });

        expect(runCodeReview).toHaveBeenCalledWith(expect.objectContaining({
            codeContext: 'const x = 1;',
            provider: 'openai',
            outputFormat: 'json'
        }));
    });

    it('should handle internal errors', async () => {
        (runCodeReview as jest.Mock).mockRejectedValue(new Error('Review failed'));

        const req = new NextRequest('http://localhost/api/review', {
            method: 'POST',
            body: JSON.stringify({
                codeContext: 'const x = 1;',
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        
        const data = await res.json();
        expect(data.error).toBe('Review failed');
    });
});
