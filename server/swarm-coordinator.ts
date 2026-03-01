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

    constructor(config: SwarmConfig) {
        this.config = config;
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

        emitDaemonEvent('swarm_created', { swarmId: swarm.id, name: swarm.name });
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
                // Dynamically import JulesClient to avoid server/ tsc graph issues
                const { JulesClient } = await import('../lib/jules/client');
                const client = new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');

                const session = await client.createSession(
                    undefined,
                    task.prompt,
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
}
