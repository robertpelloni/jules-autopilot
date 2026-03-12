import { prisma } from '../lib/prisma';
import { orchestratorQueue } from './queue';
import { checkArchitecturalCompliance } from './architecture-guard';

/**
 * Workflow Automation Engine
 * 
 * Executes multi-step pipelines in dependency order. Each step dispatches
 * work through the existing BullMQ queue infrastructure.
 */
export async function executeWorkflow(workflowId: string): Promise<void> {
    const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { steps: { orderBy: { order: 'asc' } } }
    });

    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
    if (workflow.status === 'running') throw new Error(`Workflow ${workflowId} is already running`);

    await prisma.workflow.update({
        where: { id: workflowId },
        data: { status: 'running' }
    });

    console.log(`[WorkflowEngine] Starting workflow "${workflow.name}" (${workflowId})`);

    for (const step of workflow.steps) {
        // Check dependency gate
        if (step.dependsOn) {
            const dep = await prisma.workflowStep.findUnique({ where: { id: step.dependsOn } });
            if (dep && dep.status !== 'completed') {
                await prisma.workflowStep.update({
                    where: { id: step.id },
                    data: { status: 'skipped', result: JSON.stringify({ reason: `Dependency ${dep.name} not completed` }) }
                });
                continue;
            }
        }

        // Mark step as running
        await prisma.workflowStep.update({
            where: { id: step.id },
            data: { status: 'running', startedAt: new Date() }
        });

        try {
            let config: Record<string, unknown> = {};
            try { config = JSON.parse(step.config); } catch { /* use defaults */ }

            let result: Record<string, unknown> = {};

            switch (step.stepType) {
                case 'session': {
                    const job = await orchestratorQueue.add('process_session', {
                        session: { prompt: config.prompt || step.name, repo: config.repo },
                        settings: { julesApiKey: process.env.JULES_API_KEY }
                    });
                    result = { jobId: job.id, dispatched: true };
                    break;
                }
                case 'swarm': {
                    const job = await orchestratorQueue.add('process_swarm_decomposition', {
                        swarmId: config.swarmId
                    });
                    result = { jobId: job.id, dispatched: true };
                    break;
                }
                case 'ci_check': {
                    const job = await orchestratorQueue.add('ci_fix', {
                        repo: config.repo
                    });
                    result = { jobId: job.id, dispatched: true };
                    break;
                }
                case 'guard_check': {
                    const guardResult = await checkArchitecturalCompliance(
                        (config.diff as string) || '',
                        (config.workspacePath as string) || process.cwd()
                    );
                    result = guardResult;
                    if (!guardResult.allowed) {
                        throw new Error(`Architecture guard failed: ${guardResult.violations.join(', ')}`);
                    }
                    break;
                }
                default: {
                    result = { message: `Unknown step type: ${step.stepType}` };
                }
            }

            await prisma.workflowStep.update({
                where: { id: step.id },
                data: {
                    status: 'completed',
                    result: JSON.stringify(result),
                    finishedAt: new Date()
                }
            });

            console.log(`[WorkflowEngine] Step "${step.name}" completed.`);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`[WorkflowEngine] Step "${step.name}" failed:`, errorMsg);

            await prisma.workflowStep.update({
                where: { id: step.id },
                data: {
                    status: 'failed',
                    result: JSON.stringify({ error: errorMsg }),
                    finishedAt: new Date()
                }
            });

            // Halt pipeline on failure
            await prisma.workflow.update({
                where: { id: workflowId },
                data: { status: 'failed' }
            });
            return;
        }
    }

    await prisma.workflow.update({
        where: { id: workflowId },
        data: { status: 'completed' }
    });

    console.log(`[WorkflowEngine] Workflow "${workflow.name}" completed successfully.`);
}
