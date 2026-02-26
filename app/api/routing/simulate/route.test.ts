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
        workspace: {
            findUnique: jest.fn()
        },
        providerTelemetry: {
            aggregate: jest.fn()
        },
        routingPolicy: {
            findUnique: jest.fn()
        }
    }
}));

describe('API Route: /api/routing/simulate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });

        // By default, the workspace exists and has a generous budget ($100).
        (getSession as jest.Mock).mockResolvedValue({ workspaceId: 'ws-test-123' });
        (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
            id: 'ws-test-123',
            monthlyBudget: 100.00
        });

        // Zero dollars spent this month by default.
        ((prisma as any).providerTelemetry.aggregate as jest.Mock).mockResolvedValue({
            _sum: { estimatedCostUSD: 0 }
        });

        // No custom policy defined.
        ((prisma as any).routingPolicy.findUnique as jest.Mock).mockResolvedValue(null);
    });

    const createRequest = (body: any) => {
        return new NextRequest('http://localhost/api/routing/simulate', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    };

    it('should return 401 Unauthorized without session', async () => {
        (getSession as jest.Mock).mockResolvedValue(null);
        const req = createRequest({ taskType: 'code_review', promptTokens: 100, completionTokens: 100 });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should fall back to defaults effectively if valid payload is passed', async () => {
        const req = createRequest({
            taskType: 'code_review',
            promptTokens: 1_000_000,
            completionTokens: 1_000_000
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        // Defaults: anthropic claude-3-5-sonnet. pricing: 3.0 prompt, 15.0 completion -> 18 USD total.
        expect(data.selectedProvider).toBe('anthropic');
        expect(data.selectedModel).toBe('claude-3-5-sonnet');
        expect(data.estimatedCost).toBe(18.0);
        expect(data.budgetRemainingBefore).toBe(100.0);
        expect(data.budgetRemainingAfter).toBe(82.0); // 100 - 18
        expect(data.policyReason).toContain('Using default configured model for task type');
    });

    it('should trigger Cost Efficiency mode when budget drops below $10', async () => {
        // Spent 95.00 this month, leaving 5.00 remaining.
        ((prisma as any).providerTelemetry.aggregate as jest.Mock).mockResolvedValue({
            _sum: { estimatedCostUSD: 95.00 }
        });

        const req = createRequest({
            taskType: 'code_review',
            promptTokens: 1_000_000, // using efficient haiku: 0.25 + 1.25 = 1.50
            completionTokens: 1_000_000
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.selectedProvider).toBe('anthropic');
        expect(data.selectedModel).toBe('claude-3-haiku'); // Successfully fell back to efficient tier
        expect(data.estimatedCost).toBe(1.50);
        expect(data.budgetRemainingBefore).toBe(5.0);
        expect(data.budgetRemainingAfter).toBe(3.5);
        expect(data.policyReason).toContain('Forced cost-efficiency fallback');
    });

    it('should honor custom Routing Policies configured by workspace unless overridden by budget guardrails', async () => {
        ((prisma as any).routingPolicy.findUnique as jest.Mock).mockResolvedValue({
            preferredProvider: 'openai',
            preferredModel: 'gpt-4o'
        });

        const req = createRequest({
            taskType: 'code_review', // Default is normally anthropic, but policy prefers OpenAI for this type
            promptTokens: 1_000,
            completionTokens: 1_000
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.selectedProvider).toBe('openai');
        expect(data.selectedModel).toBe('gpt-4o');
        expect(data.policyReason).toContain('Applied workspace routing policy override');
    });

    it('should block execution with 402 if budget is wholly consumed', async () => {
        // 100 limit, 100 spent = 0 balance.
        ((prisma as any).providerTelemetry.aggregate as jest.Mock).mockResolvedValue({
            _sum: { estimatedCostUSD: 100.00 }
        });

        const req = createRequest({ taskType: 'code_review', promptTokens: 10, completionTokens: 10 });
        const res = await POST(req);

        expect(res.status).toBe(402);
        const data = await res.json();
        expect(data.error).toBe('Payment Required');
        expect(data.message).toContain('budget has been fully consumed');
    });
});
