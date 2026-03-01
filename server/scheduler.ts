import { prisma } from '../lib/prisma';
import { audit, AuditActions } from '../lib/audit';

/**
 * Minimal cron expression parser.
 * Supports: minute hour day-of-month month day-of-week
 * Example: "0 * / 6 * * * " → every 6 hours at minute 0
 */
function parseCronField(field: string, now: number): boolean {
    if (field === '*') return true;
    if (field.startsWith('*/')) {
        const interval = parseInt(field.substring(2));
        return now % interval === 0;
    }
    const values = field.split(',').map(v => parseInt(v.trim()));
    return values.includes(now);
}

function shouldRunNow(cronExpr: string, date: Date): boolean {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) return false;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    return (
        parseCronField(minute ?? '*', date.getMinutes()) &&
        parseCronField(hour ?? '*', date.getHours()) &&
        parseCronField(dayOfMonth ?? '*', date.getDate()) &&
        parseCronField(month ?? '*', date.getMonth() + 1) &&
        parseCronField(dayOfWeek ?? '*', date.getDay())
    );
}

/**
 * Calculate the next run time for a cron expression.
 * Simple forward-scan up to 48 hours.
 */
function getNextRunTime(cronExpr: string, from: Date): Date | null {
    const candidate = new Date(from);
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);

    for (let i = 0; i < 2880; i++) { // 48 hours in minutes
        if (shouldRunNow(cronExpr, candidate)) {
            return candidate;
        }
        candidate.setMinutes(candidate.getMinutes() + 1);
    }
    return null;
}

/**
 * Tick the scheduler — call this from a setInterval or external cron.
 * Checks all active jobs and dispatches those whose time has come.
 */
export async function tickScheduler(): Promise<{ dispatched: string[] }> {
    const now = new Date();
    const dispatched: string[] = [];

    const jobs = await prisma.scheduledJob.findMany({
        where: { isActive: true }
    });

    for (const job of jobs) {
        if (!shouldRunNow(job.cronExpr, now)) continue;

        // Prevent double-runs within the same minute
        if (job.lastRunAt) {
            const lastRunMinute = Math.floor(job.lastRunAt.getTime() / 60000);
            const nowMinute = Math.floor(now.getTime() / 60000);
            if (lastRunMinute === nowMinute) continue;
        }

        try {
            let config: Record<string, unknown> = {};
            try { config = JSON.parse(job.jobConfig); } catch { /* fallback */ }

            const daemonUrl = process.env.DAEMON_URL || 'http://localhost:8080';

            // Dispatch based on job type
            switch (job.jobType) {
                case 'session': {
                    await fetch(`${daemonUrl}/api/sessions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: config.prompt || `Scheduled task: ${job.name}`,
                            repo: config.repo || undefined
                        })
                    });
                    break;
                }
                case 'swarm': {
                    await fetch(`${daemonUrl}/api/swarm`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: `Scheduled: ${job.name}`,
                            prompt: config.prompt || `Scheduled swarm: ${job.name}`
                        })
                    });
                    break;
                }
                case 'ci_check': {
                    await fetch(`${daemonUrl}/api/ci-fix`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ repo: config.repo })
                    });
                    break;
                }
            }

            // Update job state
            const nextRun = getNextRunTime(job.cronExpr, now);
            await prisma.scheduledJob.update({
                where: { id: job.id },
                data: {
                    lastRunAt: now,
                    nextRunAt: nextRun,
                    runCount: { increment: 1 }
                }
            });

            await audit({
                actor: 'scheduler',
                action: AuditActions.SCHEDULE_TRIGGERED,
                resource: 'schedule',
                resourceId: job.id,
                metadata: { jobType: job.jobType, name: job.name }
            });

            dispatched.push(job.id);
        } catch (err) {
            console.error(`[Scheduler] Failed to dispatch job ${job.id}:`, err);
        }
    }

    return { dispatched };
}
