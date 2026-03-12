import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { handleInternalError } from '@/lib/api/error';

const DEFAULT_PREFS = {
    emailOnFailure: true,
    emailOnCompletion: false,
    slackWebhook: null,
    alertOnBudgetThreshold: true,
    budgetThresholdPct: 80,
    alertOnConsensusFailure: true,
    alertOnStalledSession: true,
    quietHoursStart: null,
    quietHoursEnd: null
};

/**
 * GET /api/notifications/preferences — Get notification preferences.
 * PUT /api/notifications/preferences — Update notification preferences.
 * 
 * Uses a sentinel Notification record (type='system', resourceType='preferences')
 * with the workspace ID stored in resourceId and JSON prefs in body.
 */
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const record = await prisma.notification.findFirst({
            where: { type: 'system', resourceType: 'preferences', resourceId: session.workspaceId }
        });

        if (!record) {
            return NextResponse.json(DEFAULT_PREFS);
        }

        const prefs = JSON.parse(record.body);
        return NextResponse.json({ ...DEFAULT_PREFS, ...prefs });
    } catch (error) {
        return handleInternalError(req, error);
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSession();
        if (!session?.workspaceId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();

        const existing = await prisma.notification.findFirst({
            where: { type: 'system', resourceType: 'preferences', resourceId: session.workspaceId }
        });

        const existingPrefs = existing ? JSON.parse(existing.body) : {};
        const merged = { ...existingPrefs, ...body };

        if (existing) {
            await prisma.notification.update({
                where: { id: existing.id },
                data: { body: JSON.stringify(merged) }
            });
        } else {
            await prisma.notification.create({
                data: {
                    type: 'system',
                    title: 'Notification Preferences',
                    body: JSON.stringify(merged),
                    resourceType: 'preferences',
                    resourceId: session.workspaceId
                }
            });
        }

        return NextResponse.json({ success: true, preferences: { ...DEFAULT_PREFS, ...merged } });
    } catch (error) {
        return handleInternalError(req, error);
    }
}
