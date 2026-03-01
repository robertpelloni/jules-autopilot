import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/schedules — List all scheduled jobs.
 * POST /api/schedules — Create a new scheduled job.
 * DELETE /api/schedules — Deactivate a scheduled job.
 */
export async function GET(): Promise<Response> {
    const jobs = await prisma.scheduledJob.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ jobs });
}

export async function POST(req: Request): Promise<Response> {
    const body = await req.json() as {
        name?: string;
        cronExpr?: string;
        timezone?: string;
        jobType?: string;
        jobConfig?: Record<string, unknown>;
    };

    if (!body.name || !body.cronExpr || !body.jobType) {
        return NextResponse.json({
            error: 'Missing required fields: name, cronExpr, jobType'
        }, { status: 400 });
    }

    const validTypes = ['session', 'swarm', 'ci_check'];
    if (!validTypes.includes(body.jobType)) {
        return NextResponse.json({
            error: `Invalid jobType. Must be one of: ${validTypes.join(', ')}`
        }, { status: 400 });
    }

    // Simple forward-scan to calculate next run time
    const now = new Date();
    let nextRunAt: Date | null = null;
    const candidate = new Date(now);
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);
    const parts = body.cronExpr.trim().split(/\s+/);
    if (parts.length === 5) {
        for (let i = 0; i < 2880; i++) {
            const match = parts.every((field, idx) => {
                const vals = [candidate.getMinutes(), candidate.getHours(), candidate.getDate(), candidate.getMonth() + 1, candidate.getDay()];
                if (field === '*') return true;
                if (field.startsWith('*/')) return vals[idx] % parseInt(field.substring(2)) === 0;
                return field.split(',').map(Number).includes(vals[idx]);
            });
            if (match) { nextRunAt = new Date(candidate); break; }
            candidate.setMinutes(candidate.getMinutes() + 1);
        }
    }

    const job = await prisma.scheduledJob.create({
        data: {
            name: body.name,
            cronExpr: body.cronExpr,
            timezone: body.timezone || 'UTC',
            jobType: body.jobType,
            jobConfig: JSON.stringify(body.jobConfig || {}),
            nextRunAt
        }
    });

    return NextResponse.json({ job }, { status: 201 });
}

export async function DELETE(req: Request): Promise<Response> {
    const body = await req.json() as { jobId?: string };
    if (!body.jobId) {
        return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    await prisma.scheduledJob.update({
        where: { id: body.jobId },
        data: { isActive: false }
    });

    return NextResponse.json({ success: true, deactivated: body.jobId });
}
