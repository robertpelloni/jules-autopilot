import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * GitHub Webhook handler for `workflow_run.completed` events.
 * Validates the signature, persists failing runs to the CIRun table,
 * and enqueues a ci_fix job to BullMQ for autonomous remediation.
 */
export async function POST(req: Request): Promise<Response> {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'GITHUB_WEBHOOK_SECRET not configured' }, { status: 500 });
    }

    // Read the raw body for signature verification
    const rawBody = await req.text();

    // Verify X-Hub-Signature-256
    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) {
        return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Parse the event
    const event = req.headers.get('x-github-event');
    if (event !== 'workflow_run') {
        return NextResponse.json({ ignored: true, reason: `Unhandled event: ${event}` }, { status: 200 });
    }

    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const action = payload.action as string;
    if (action !== 'completed') {
        return NextResponse.json({ ignored: true, reason: `Unhandled action: ${action}` }, { status: 200 });
    }

    const workflowRun = payload.workflow_run as Record<string, unknown>;
    const conclusion = workflowRun.conclusion as string;
    const runId = String(workflowRun.id);
    const repo = (payload.repository as Record<string, unknown>).full_name as string;
    const headSha = workflowRun.head_sha as string;
    const workflowName = workflowRun.name as string || 'unknown';

    // Persist the CI run
    const ciRun = await prisma.cIRun.upsert({
        where: { runId },
        update: {
            status: 'completed',
            conclusion,
            headSha,
            workflowName
        },
        create: {
            runId,
            repo,
            headSha,
            workflowName,
            status: 'completed',
            conclusion
        }
    });

    // If the run failed, notify the daemon to enqueue a ci_fix job
    // We use an HTTP call to the daemon instead of importing server/queue directly,
    // which would pull the excluded server/ directory into the Next.js tsc graph.
    if (conclusion === 'failure') {
        try {
            const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';
            await fetch(`${daemonUrl}/api/ci-fix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ciRunId: ciRun.id,
                    runId,
                    repo,
                    headSha
                })
            });
        } catch (err) {
            console.error('[CI Webhook] Failed to notify daemon for ci_fix:', err);
        }
    }

    return NextResponse.json({
        success: true,
        ciRunId: ciRun.id,
        conclusion,
        fixEnqueued: conclusion === 'failure'
    }, { status: 200 });
}
