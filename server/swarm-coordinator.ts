import { prisma } from '../lib/prisma';
import { getProvider } from '@jules/shared';
import { emitDaemonEvent } from './index';
import { addLog } from './daemon';

interface SwarmConfig {
    name: string;
    prompt: string;
    maxParallelTasks?: number;
}

/**
 * Swarm Coordinator — decomposes a high-level task prompt into
 * parallelizable sub-tasks using LLM analysis, then dispatches
 * each as an independent Jules session.
 */
export class SwarmCoordinator {
    private config: SwarmConfig;

    private constructor(config: SwarmConfig) {
        this.config = config;
    }

    /**
     * Get the consolidated context of all completed tasks in a swarm.
     */
    static async getSwarmContext(swarmId: string): Promise<string> {
        const tasks = await prisma.swarmTask.findMany({
            where: { swarmId, status: 'completed' }
        });

        if (tasks.length === 0) return "No task results available yet.";

        return tasks
            .map(t => `### ${t.title} ###\n${t.result || '(No output)'}`)
            .join('\n\n');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static async persistEvent(swarmId: string, event: { type: string; data: any }) {
        const swarm = await prisma.agentSwarm.findUnique({ where: { id: swarmId } });
        if (!swarm) return;

        const events = JSON.parse(swarm.metadata || '[]');
        events.push({ ...event, timestamp: Date.now() });

        await prisma.agentSwarm.update({
            where: { id: swarmId },
            data: { metadata: JSON.stringify(events.slice(-100)) } // Keep last 100 events
        });
    }

    /**
     * Step 1: Decompose the prompt into sub-tasks via LLM.
     */
    async decompose(): Promise<string> {
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings) throw new Error('No keeper settings found');

        // Create the swarm record
        const swarm = await prisma.agentSwarm.create({
            data: {
                name: this.config.name,
                prompt: this.config.prompt,
                status: 'decomposing'
            }
        });

        emitDaemonEvent('swarm_created', {
            swarmId: swarm.id, name: swarm.name
        });
        emitDaemonEvent('swarm:task_pondering', { swarmId: swarm.id, taskId: 'root', message: 'Analyzing task requirements...' });

        await SwarmCoordinator.persistEvent(swarm.id, { type: 'swarm_created', data: { name: swarm.name } });
        await SwarmCoordinator.persistEvent(swarm.id, { type: 'swarm:task_pondering', data: { taskId: 'root', message: 'Analyzing task requirements...' } });

        const provider = getProvider(settings.supervisorProvider);
        if (!provider) throw new Error(`Provider '${settings.supervisorProvider}' not available`);

        // Ask the LLM to decompose the task
        const result = await provider.complete({
            messages: [{
                role: 'user',
                content: `Decompose the following software engineering task into 2-6 independent, parallelizable sub-tasks. Each sub-task should be self-contained and achievable by a single AI coding agent.

Format your response as a JSON array of objects with "title" and "prompt" fields. Example:
[{"title": "Add user model", "prompt": "Create a User model in prisma/schema.prisma with id, email, name, and createdAt fields."}]

Task to decompose:
${this.config.prompt}`
            }],
            apiKey: settings.supervisorApiKey || process.env.OPENAI_API_KEY || '',
            model: settings.supervisorModel,
            systemPrompt: 'You are a senior engineering manager decomposing tasks for a team of AI coding agents. Each sub-task must be independent and parallelizable. Return ONLY valid JSON, no markdown.'
        });

        // Parse the decomposed tasks
        let tasks: Array<{ title: string; prompt: string; dependsOn?: string }>;
        try {
            const content = result.content.trim();
            // Handle potential markdown code fences
            const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            tasks = JSON.parse(jsonStr);
        } catch {
            await prisma.agentSwarm.update({
                where: { id: swarm.id },
                data: { status: 'failed', result: 'Failed to parse LLM decomposition output' }
            });
            throw new Error('Failed to parse task decomposition');
        }

        // Create SwarmTask records
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (!task) continue;
            await prisma.swarmTask.create({
                data: {
                    swarmId: swarm.id,
                    title: task.title,
                    prompt: task.prompt,
                    dependsOn: task.dependsOn || null,
                    priority: i
                }
            });
        }

        // Update swarm status
        await prisma.agentSwarm.update({
            where: { id: swarm.id },
            data: {
                status: 'running',
                totalTasks: tasks.length
            }
        });

        emitDaemonEvent('swarm:task_finalizing', { swarmId: swarm.id, taskId: 'root', message: 'Task decomposition complete.' });
        await SwarmCoordinator.persistEvent(swarm.id, { type: 'swarm:task_finalizing', data: { taskId: 'root', message: 'Task decomposition complete.' } });

        emitDaemonEvent('swarm_updated', {
            swarmId: swarm.id,
            status: 'running',
            totalTasks: tasks.length
        });

        await addLog(`Swarm "${this.config.name}" decomposed into ${tasks.length} sub-tasks`, 'action');

        return swarm.id;
    }

    /**
     * Step 2: Dispatch pending sub-tasks as Jules sessions.
     */
    static async dispatchPendingTasks(swarmId: string): Promise<void> {
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        if (!settings) return;

        const apiKey = settings.julesApiKey || process.env.JULES_API_KEY;
        if (!apiKey) return;

        const swarm = await prisma.agentSwarm.findUnique({
            where: { id: swarmId },
            include: { tasks: true }
        });

        if (!swarm || swarm.status !== 'running') {
            if (swarm?.status === 'paused') {
                console.log(`[Swarm] Dispatcher skipped for swarm ${swarmId} (PAUSED)`);
            }
            return;
        }

        const maxParallel = 3; // Jules concurrent limit
        const runningTasks = swarm.tasks.filter(t => t.status === 'dispatched' || t.status === 'running');
        const pendingTasks = swarm.tasks.filter(t => t.status === 'pending');

        // Check dependency resolution
        const completedIds = new Set(swarm.tasks.filter(t => t.status === 'completed').map(t => t.id));
        const availableTasks = pendingTasks.filter(t => {
            if (!t.dependsOn) return true;
            return t.dependsOn.split(',').every(depId => completedIds.has(depId.trim()));
        });

        const slotsAvailable = maxParallel - runningTasks.length;
        const tasksToDispatch = availableTasks.slice(0, slotsAvailable);

        for (const task of tasksToDispatch) {
            try {
                // Step 2a: Swarm Memory - Gather context from dependencies
                let augmentedPrompt = task.prompt;
                if (task.dependsOn) {
                    const depIds = task.dependsOn.split(',').map(id => id.trim());
                    const dependencies = swarm.tasks.filter(t => depIds.includes(t.id) && t.status === 'completed');

                    if (dependencies.length > 0) {
                        const contextHeader = "\n\n### SWARM CONTEXT FROM DEPENDENCIES ###\n";
                        const contextBody = dependencies
                            .map(dep => `[Output of "${dep.title}"]: ${dep.result || 'No output recorded.'}`)
                            .join('\n\n');
                        augmentedPrompt = `${contextHeader}${contextBody}\n\n### ORIGINAL TASK PROMPT ###\n${task.prompt}`;
                    }
                }

                // Step 2b: Adaptive Escalation - Add hint if escalated
                if ((task as any).isEscalated) {
                    augmentedPrompt = `[MODE: HIGH_PRECISION_ESCALATION]\n${augmentedPrompt}`;
                }

                // Dynamically import JulesClient to avoid server/ tsc graph issues
                const { JulesClient } = await import('../lib/jules/client');
                const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const session = await client.createSession(
                    undefined as any,
                    augmentedPrompt,
                    `[Swarm] ${task.title}`
                );

                await prisma.swarmTask.update({
                    where: { id: task.id },
                    data: { status: 'dispatched', sessionId: session.id }
                });

                emitDaemonEvent('swarm_task_updated', {
                    swarmId,
                    taskId: task.id,
                    status: 'dispatched',
                    sessionId: session.id
                });

                emitDaemonEvent('swarm:task_executing', {
                    swarmId,
                    taskId: task.id,
                    sessionId: session.id,
                    message: `Jules session ${session.id.substring(0, 8)} started.`
                });

                await SwarmCoordinator.persistEvent(swarmId, {
                    type: 'swarm:task_executing',
                    data: { taskId: task.id, sessionId: session.id, message: `Jules session ${session.id.substring(0, 8)} started.` }
                });

                await addLog(`Dispatched swarm task "${task.title}" → session ${session.id.substring(0, 8)}`, 'action');
            } catch (err) {
                console.error(`[Swarm] Failed to dispatch task ${task.id}:`, err);
                await prisma.swarmTask.update({
                    where: { id: task.id },
                    data: { status: 'failed', result: err instanceof Error ? err.message : String(err) }
                });
            }
        }

        // Sync statuses for dispatched tasks
        await SwarmCoordinator.syncTaskStatuses(swarmId);

        // Check if all tasks are completed
        const freshSwarm = await prisma.agentSwarm.findUnique({
            where: { id: swarmId },
            include: { tasks: true }
        });

        if (freshSwarm) {
            const doneCount = freshSwarm.tasks.filter(t => t.status === 'completed').length;
            const failedCount = freshSwarm.tasks.filter(t => t.status === 'failed').length;

            await prisma.agentSwarm.update({
                where: { id: swarmId },
                data: { doneTasks: doneCount }
            });

            if (doneCount + failedCount >= freshSwarm.totalTasks) {
                const finalStatus = failedCount > 0 ? 'completed' : 'completed';
                const results = freshSwarm.tasks
                    .filter(t => t.result)
                    .map(t => `## ${t.title}\n${t.result}`)
                    .join('\n\n');

                await prisma.agentSwarm.update({
                    where: { id: swarmId },
                    data: {
                        status: finalStatus,
                        result: results || 'All tasks completed.',
                        doneTasks: doneCount
                    }
                });

                emitDaemonEvent('swarm_completed', { swarmId, status: finalStatus });
                await SwarmCoordinator.persistEvent(swarmId, { type: 'swarm_completed', data: { status: finalStatus, message: 'Swarm execution finalized.' } });
                await addLog(`Swarm "${freshSwarm.name}" completed (${doneCount}/${freshSwarm.totalTasks} succeeded)`, 'action');
            }
        }
    }

    /**
     * Pause an individual task.
     */
    static async pauseTask(taskId: string): Promise<void> {
        const task = await prisma.swarmTask.findUnique({ where: { id: taskId } });
        if (!task || task.status !== 'pending') return;

        await prisma.swarmTask.update({
            where: { id: taskId },
            data: { status: 'paused' }
        });

        emitDaemonEvent('swarm_task_updated', {
            swarmId: task.swarmId,
            taskId: task.id,
            status: 'paused'
        });

        await SwarmCoordinator.persistEvent(task.swarmId, {
            type: 'swarm:task_paused',
            data: { taskId: task.id, title: task.title }
        });
    }

    /**
     * Resume a paused task.
     */
    static async resumeTask(taskId: string): Promise<void> {
        const task = await prisma.swarmTask.findUnique({ where: { id: taskId } });
        if (!task || task.status !== 'paused') return;

        await prisma.swarmTask.update({
            where: { id: taskId },
            data: { status: 'pending' }
        });

        emitDaemonEvent('swarm_task_updated', {
            swarmId: task.swarmId,
            taskId: task.id,
            status: 'pending'
        });

        await SwarmCoordinator.persistEvent(task.swarmId, {
            type: 'swarm:task_resumed',
            data: { taskId: task.id, title: task.title }
        });

        // Trigger dispatcher
        await SwarmCoordinator.dispatchPendingTasks(task.swarmId);
    }

    /**
     * Update token usage and cost for a task and its swarm.
     */
    static async updateTaskMetrics(taskId: string, metrics: { inputTokens: number; outputTokens: number; costCents: number }): Promise<void> {
        const task = await prisma.swarmTask.findUnique({ where: { id: taskId } });
        if (!task) return;

        await prisma.swarmTask.update({
            where: { id: taskId },
            data: {
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                costCents: metrics.costCents
            } as any // eslint-disable-line @typescript-eslint/no-explicit-any
        });

        // Atomic update of the swarm's global metrics
        await prisma.agentSwarm.update({
            where: { id: task.swarmId },
            data: {
                totalTokens: { increment: metrics.inputTokens + metrics.outputTokens },
                totalCostCents: { increment: metrics.costCents }
            } as any // eslint-disable-line @typescript-eslint/no-explicit-any
        });

        emitDaemonEvent('swarm_metrics_updated' as any, { // eslint-disable-line @typescript-eslint/no-explicit-any
            swarmId: task.swarmId,
            taskId: task.id,
            ...metrics
        });
    }

    /**
     * Sync status of all dispatched tasks with the Jules API.
     * Triggers verification logic if tasks are completed.
     */
    static async syncTaskStatuses(swarmId: string): Promise<void> {
        const swarm = await prisma.agentSwarm.findUnique({
            where: { id: swarmId },
            include: { tasks: true }
        });
        if (!swarm) return;

        const dispatchedTasks = swarm.tasks.filter(t => t.status === 'dispatched');
        if (dispatchedTasks.length === 0) return;

        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
        const apiKey = settings?.julesApiKey || process.env.JULES_API_KEY;
        if (!apiKey) return;

        const { JulesClient } = await import('../lib/jules/client');
        const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');

        for (const task of dispatchedTasks) {
            if (!task.sessionId) continue;
            try {
                const session = await client.getSession(task.sessionId);
                if (session.status === 'completed') {
                    // Task finished!
                    // Extract result from outputs if available
                    const sessionAny = session as any;
                    const result = sessionAny.outputs?.[0]?.pullRequest?.url ||
                        sessionAny.outputs?.[0]?.summary ||
                        'Task completed successfully.';

                    await prisma.swarmTask.update({
                        where: { id: task.id },
                        data: {
                            status: 'completed',
                            result
                        }
                    });

                    emitDaemonEvent('swarm_task_updated', {
                        swarmId,
                        taskId: task.id,
                        status: 'completed'
                    });

                    await SwarmCoordinator.persistEvent(swarmId, {
                        type: 'swarm:task_completed',
                        data: { taskId: task.id, title: task.title }
                    });

                    // --- Phase 83: Automated Peer Review ---
                    if (!(task as any).isVerification) {
                        await SwarmCoordinator.spawnVerifier(swarmId, task.id);
                    } else if ((task as any).reviewedTaskId) {
                        // Verification task completed, update the target task's reviewStatus
                        const isSuccess = result.toLowerCase().includes('pass') || !result.toLowerCase().includes('fail');
                        await prisma.swarmTask.update({
                            where: { id: (task as any).reviewedTaskId },
                            data: { reviewStatus: isSuccess ? 'passed' : 'failed' }
                        } as any);

                        if (!isSuccess) {
                            await SwarmCoordinator.handleReviewFailure(swarmId, task.id);
                        }
                    }
                } else if (session.status === 'failed') {
                    await prisma.swarmTask.update({
                        where: { id: task.id },
                        data: { status: 'failed', result: (session as any).error || 'Unknown session failure' }
                    });
                    emitDaemonEvent('swarm_task_updated', { swarmId, taskId: task.id, status: 'failed' });
                }
            } catch (err) {
                console.error(`[Swarm] Sync error for task ${task.id}:`, err);
            }
        }
    }

    /**
     * Spawn a verifier task for a completed task.
     */
    private static async spawnVerifier(swarmId: string, targetTaskId: string): Promise<void> {
        const targetTask = await prisma.swarmTask.findUnique({ where: { id: targetTaskId } });
        if (!targetTask) return;

        const verifierTitle = `Verify: ${targetTask.title}`;
        const verifierPrompt = `Review the following task output for correctness and quality. 
Output "PASS" if the work is correct. 
If there are errors, identify them specifically and output "FAIL" followed by the issues.

TASK TITLE: ${targetTask.title}
TASK PROMPT: ${targetTask.prompt}
AGENT OUTPUT:
${targetTask.result}`;

        await prisma.swarmTask.create({
            data: {
                swarmId,
                title: verifierTitle,
                prompt: verifierPrompt,
                isVerification: true,
                reviewedTaskId: targetTaskId,
                priority: targetTask.priority + 10,
                status: 'pending'
            } as any
        });

        await SwarmCoordinator.persistEvent(swarmId, {
            type: 'swarm:verifier_spawned',
            data: { targetTaskId, verifierTitle }
        });

        emitDaemonEvent('swarm_updated', { swarmId });
    }

    /**
     * Handle a failed review by re-decomposing the failing branch.
     */
    private static async handleReviewFailure(swarmId: string, verifierTaskId: string): Promise<void> {
        const verifierTask = await prisma.swarmTask.findUnique({ where: { id: verifierTaskId } });
        if (!verifierTask || !(verifierTask as any).reviewedTaskId) return;

        const targetTask = await prisma.swarmTask.findUnique({ where: { id: (verifierTask as any).reviewedTaskId } });
        if (!targetTask) return;

        await SwarmCoordinator.persistEvent(swarmId, {
            type: 'swarm:replanning',
            data: { taskId: targetTask.id, reason: 'Review failed' }
        });

        emitDaemonEvent('swarm:task_pondering', {
            swarmId,
            taskId: targetTask.id,
            message: 'Review failed. Re-planning corrective actions...'
        });

        // Simplified re-planning: mark the task as pending again but with the review feedback augmented
        const correctivePrompt = `[CORRECTIVE ACTION] Your previous attempt failed review.
ISSUES CITED BY REVIEWER:
${verifierTask.result}

ORIGINAL PROMPT:
${targetTask.prompt}`;

        await prisma.swarmTask.update({
            where: { id: targetTask.id },
            data: {
                status: 'pending',
                prompt: correctivePrompt,
                retryCount: { increment: 1 },
                isEscalated: true,
                reviewStatus: 'pending'
            } as any
        });

        emitDaemonEvent('swarm_task_updated', { swarmId, taskId: targetTask.id, status: 'pending' });
    }
}
