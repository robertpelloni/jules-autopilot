import { prisma } from '../lib/prisma';
import { getProvider } from '../packages/shared/src/orchestration/providers';
import { emitDaemonEvent } from './daemon';

interface CIFixJobData {
    ciRunId: string;
    runId: string;
    repo: string;
    headSha: string;
}

/**
 * Autonomous CI Fix Agent.
 * Fetches failing GitHub Actions logs, analyzes them via LLM,
 * and optionally creates a fix PR.
 */
export async function processCIFix(data: CIFixJobData): Promise<void> {
    const { ciRunId, runId, repo } = data;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
        console.error('[CIFixAgent] GITHUB_TOKEN not set. Cannot fetch CI logs.');
        return;
    }

    console.log(`[CIFixAgent] Analyzing failing run ${runId} in ${repo}...`);

    // 1. Fetch the failing run's log from GitHub API
    let logContent = '';
    try {
        const logResponse = await fetch(
            `https://api.github.com/repos/${repo}/actions/runs/${runId}/logs`,
            {
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github+json'
                },
                redirect: 'follow'
            }
        );

        if (!logResponse.ok) {
            console.error(`[CIFixAgent] Failed to fetch logs: ${logResponse.status} ${logResponse.statusText}`);
            // Fallback: try to get the jobs and their step logs
            const jobsResponse = await fetch(
                `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`,
                {
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github+json'
                    }
                }
            );

            if (jobsResponse.ok) {
                const jobsData = await jobsResponse.json() as { jobs: Array<{ name: string; conclusion: string; steps: Array<{ name: string; conclusion: string }> }> };
                const failedJobs = jobsData.jobs.filter((j: { conclusion: string }) => j.conclusion === 'failure');
                logContent = failedJobs.map((j: { name: string; steps: Array<{ name: string; conclusion: string }> }) =>
                    `Job: ${j.name}\nFailed Steps: ${j.steps.filter((s: { conclusion: string }) => s.conclusion === 'failure').map((s: { name: string }) => s.name).join(', ')}`
                ).join('\n\n');
            }
        } else {
            // The logs endpoint returns a zip, but we just need the text for analysis
            const logBuffer = await logResponse.arrayBuffer();
            logContent = new TextDecoder().decode(logBuffer).substring(0, 15000);
        }
    } catch (err) {
        console.error('[CIFixAgent] Error fetching CI logs:', err);
        return;
    }

    if (!logContent || logContent.length < 20) {
        console.log('[CIFixAgent] No meaningful log content found. Skipping analysis.');
        return;
    }

    // 2. Get supervisor settings for LLM analysis
    const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
        console.error('[CIFixAgent] No keeper settings found.');
        return;
    }

    const provider = getProvider(settings.supervisorProvider);
    if (!provider) {
        console.error(`[CIFixAgent] Provider '${settings.supervisorProvider}' not found.`);
        return;
    }

    // 3. Analyze with LLM
    try {
        const result = await provider.complete({
            messages: [{
                role: 'user',
                content: `A CI/CD pipeline has failed. Analyze the following log output and provide:\n1. ROOT CAUSE: A one-sentence summary of why the build failed.\n2. SEVERITY: One of [critical, warning, info]\n3. FIX: A specific, actionable code change that would fix the issue (include file path and exact code if possible), or "MANUAL" if human intervention is required.\n\nCI Log:\n${logContent}`
            }],
            apiKey: settings.supervisorApiKey || process.env.OPENAI_API_KEY || '',
            model: settings.supervisorModel,
            systemPrompt: 'You are the CI Fix Agent within the Shadow Pilot system. Your job is to analyze CI/CD failures and propose minimal, surgical fixes. Be precise and actionable. If the failure is environmental (e.g., rate limits, transient network errors), reply with SEVERITY: info and FIX: RETRY.'
        });

        const analysis = result.content.trim();

        // Update the CIRun record with the analysis
        await prisma.cIRun.update({
            where: { id: ciRunId },
            data: {
                failureLog: logContent.substring(0, 5000),
                fixAttempted: true,
                fixSummary: analysis.substring(0, 2000)
            }
        });

        // Parse severity from the analysis
        let severity: 'critical' | 'warning' | 'info' = 'warning';
        if (analysis.includes('SEVERITY: critical')) {
            severity = 'critical';
        } else if (analysis.includes('SEVERITY: info')) {
            severity = 'info';
        }

        // 4. Emit Shadow Pilot alert
        emitDaemonEvent('shadow_pilot_alert', {
            severity,
            message: `CI Fix Agent: ${repo} run #${runId} failed.\n${analysis.substring(0, 500)}`,
            diffSnippet: logContent.substring(0, 300)
        });

        console.log(`[CIFixAgent] Analysis complete for run ${runId}. Severity: ${severity}`);

    } catch (err) {
        console.error('[CIFixAgent] LLM analysis failed:', err);
    }
}
