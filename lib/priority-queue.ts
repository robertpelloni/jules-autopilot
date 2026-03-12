/**
 * Task Priority Queue
 * 
 * A priority-aware task queue that orders pending work by urgency,
 * deadline proximity, and manual priority overrides. Integrates with
 * the existing BullMQ queue for execution dispatch.
 */

export interface PrioritizedTask {
    id: string;
    title: string;
    priority: number; // Higher = more urgent
    deadline?: Date;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}

/**
 * Calculate effective priority score.
 * Factors: explicit priority, deadline urgency, age.
 */
export function calculateEffectivePriority(task: PrioritizedTask): number {
    let score = task.priority * 100;

    // Deadline urgency bonus (closer = higher priority)
    if (task.deadline) {
        const msUntilDeadline = task.deadline.getTime() - Date.now();
        if (msUntilDeadline <= 0) {
            score += 500; // Overdue — critical
        } else if (msUntilDeadline < 3600_000) {
            score += 300; // < 1 hour
        } else if (msUntilDeadline < 86400_000) {
            score += 100; // < 1 day
        }
    }

    // Age bonus (older tasks get slight priority boost to prevent starvation)
    const ageMs = Date.now() - task.createdAt.getTime();
    const ageHours = ageMs / 3600_000;
    score += Math.min(ageHours * 2, 50); // Max 50 points from age

    return Math.round(score);
}

/**
 * Sort tasks by effective priority (descending).
 */
export function sortByPriority(tasks: PrioritizedTask[]): PrioritizedTask[] {
    return [...tasks].sort((a, b) => calculateEffectivePriority(b) - calculateEffectivePriority(a));
}

/**
 * Get the next N highest-priority tasks.
 */
export function getTopPriority(tasks: PrioritizedTask[], n: number): PrioritizedTask[] {
    return sortByPriority(tasks).slice(0, n);
}

/**
 * Check if any tasks are overdue.
 */
export function getOverdueTasks(tasks: PrioritizedTask[]): PrioritizedTask[] {
    const now = Date.now();
    return tasks.filter(t => t.deadline && t.deadline.getTime() < now);
}
