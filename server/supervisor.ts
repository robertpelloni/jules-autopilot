import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { prisma } from '../lib/prisma/index.ts';
import { JulesClient } from '../lib/jules/client';
import { generateLLMText, getSupervisorAPIKey } from './llm';
import { emitDaemonEvent } from './index';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '..');

// Project docs to load — in priority order
const DOC_FILES = [
    'AGENTS.md',
    'README.md',
    'ROADMAP.md',
    'TODO.md',
    'VISION.md',
    'CHANGELOG.md',
    'HANDOFF.md',
    'MEMORY.md',
    'CLAUDE.md',
    'GEMINI.md',
    'docs/ROADMAP.md',
    'docs/TODO.md',
    'docs/VISION.md',
    'docs/ai/planning/README.md',
    'docs/ai/requirements/README.md',
];

const MAX_DOC_SIZE = 6000;   // chars per doc file
const MAX_COMMITS = 20;
const MAX_HISTORY_ITEMS = 60;
const MAX_HISTORY_CHARS = 4000;
const MAX_TOTAL_PROMPT = 14000; // rough char budget for the user message

// Dynamic model list — fetched from OpenRouter, cached for 10 minutes
let cachedFreeModels: string[] = [];
let freeModelsFetchedAt = 0;
const FREE_MODELS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getFreeModels(apiKey: string): Promise<string[]> {
    if (cachedFreeModels.length > 0 && Date.now() - freeModelsFetchedAt < FREE_MODELS_CACHE_TTL) {
        return cachedFreeModels;
    }
    try {
        const resp = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!resp.ok) throw new Error(`OpenRouter returned ${resp.status}`);
        const data = await resp.json();
        cachedFreeModels = (data.data || [])
            .filter((m: any) => {
                const prompt = parseFloat(m.pricing?.prompt || '1');
                const completion = parseFloat(m.pricing?.completion || '1');
                return prompt === 0 && completion === 0;
            })
            .map((m: any) => m.id)
            .sort();
        freeModelsFetchedAt = Date.now();
        console.log(`[Supervisor] Fetched ${cachedFreeModels.length} free models from OpenRouter`);
    } catch (err: any) {
        console.warn(`[Supervisor] Failed to fetch free models: ${err.message}`);
        // Keep whatever we had before, or empty
        if (cachedFreeModels.length === 0) {
            cachedFreeModels = [
                'google/gemma-3-27b-it:free', 'meta-llama/llama-3.3-70b-instruct:free',
                'qwen/qwen3-coder:free', 'minimax/minimax-m2.5:free',
            ];
        }
    }
    return cachedFreeModels;
}

/**
 * Load a single doc file, truncated
 */
function loadDoc(filePath: string): string | null {
    try {
        if (!fs.existsSync(filePath)) return null;
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        if (!content) return null;
        return content.length > MAX_DOC_SIZE
            ? content.slice(0, MAX_DOC_SIZE) + '\n...[truncated]'
            : content;
    } catch { return null; }
}

/**
 * Load all project docs from the session's repo folder
 */
export function loadProjectDocs(searchRoot: string): string {
    const parts: string[] = [];

    for (const docFile of DOC_FILES) {
        const content = loadDoc(path.join(searchRoot, docFile));
        if (content) {
            parts.push(`=== ${docFile} ===\n${content}`);
        }
    }

    return parts.length > 0 ? parts.join('\n\n') : '(no project docs found)';
}

/**
 * Try to find the project folder for a session's source repo
 */
function resolveProjectFolder(sourceId: string): string {
    const repoName = sourceId.split('/').pop() || sourceId;
    const candidates = [
        path.join(WORKSPACE_ROOT, repoName),
        path.join(process.env.HOME || process.env.USERPROFILE || '/root', 'workspace', repoName),
        path.join(process.env.HOME || process.env.USERPROFILE || '/root', 'workspace', sourceId),
        WORKSPACE_ROOT,
    ];

    for (const c of candidates) {
        try {
            if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
        } catch {}
    }
    return WORKSPACE_ROOT;
}

/**
 * Get last N git commit messages from the project folder
 */
function loadGitLog(projectFolder: string, count: number = MAX_COMMITS): string {
    try {
        const output = execSync(
            `git log --oneline -${count} --no-decorate`,
            { cwd: projectFolder, encoding: 'utf-8', timeout: 5000 }
        ).trim();
        return output || '(no commits)';
    } catch {
        return '(git log unavailable)';
    }
}

/**
 * Fetch full session conversation history with expanded detail
 */
export async function fetchSessionHistory(
    client: JulesClient,
    sessionId: string
): Promise<string> {
    try {
        const activities = await client.listActivities(sessionId, 30);
        if (!activities || activities.length === 0) {
            return '(no conversation history yet)';
        }

        // Take the most recent activities
        const recent = activities.slice(-30);
        const lines: string[] = [];
        let totalChars = 0;

        for (const activity of recent) {
            const role = activity.role === 'user' ? 'USER' : 'JULES';
            const type = activity.type || 'message';
            const content = (activity.content || '').trim();
            if (!content) continue;

            // Truncate individual messages and cap total
            const capped = content.length > 800
                ? content.slice(0, 800) + '...[truncated]'
                : content;

            totalChars += capped.length;
            if (totalChars > MAX_HISTORY_CHARS) break;

            lines.push(`[${role}/${type}]: ${capped}`);
        }

        const header = `--- REPORTED PROGRESS (last ${recent.length} messages from conversation) ---`;
        return `${header}\n${lines.join('\n\n')}`;
    } catch (err: any) {
        return `(failed to fetch history: ${err.message})`;
    }
}

/**
 * Build the system prompt
 */
function buildSystemPrompt(): string {
    return `You are the Supervisor — an AI project manager for a fleet of autonomous coding sessions.

You receive: project docs, recent git commits, and a session's full conversation history (marked as REPORTED PROGRESS).

Your job: determine the single most logical next step for this session and output it.

RULES — FOLLOW THESE EXACTLY:
1. Reply ONLY with the next task instruction and brief encouraging words
2. Be specific — reference actual files, functions, features, PRs by name
3. Maximum 4 sentences total — no filler, no grand plans, no repeating what was done
4. If the session completed its task, assign the next TODO/ROADMAP item
5. If the session is stuck or looping, redirect to a different specific task
6. Include 1-2 sentences of encouragement about the progress so far
7. Never use markdown headers, bullet lists, or code blocks
8. Do NOT say "continue" or "keep going" alone — always specify WHAT to do
9. Start with a direct action verb: "Implement", "Fix", "Add", "Update", "Refactor", "Test", etc.`;
}

/**
 * Build the user prompt with full context
 */
function buildUserPrompt(
    projectDocs: string,
    gitLog: string,
    sessionTitle: string,
    sessionState: string,
    sessionSourceId: string,
    inactiveMinutes: number,
    sessionHistory: string
): string {
    return `## Project Documentation
${projectDocs}

## Recent Git Commits
${gitLog}

## Session: "${sessionTitle}"
- Repository: ${sessionSourceId}
- State: ${sessionState}
- Inactive for: ${inactiveMinutes} minutes

${sessionHistory}

---

Based on the project docs, git history, and the reported progress above — what is the single most logical next task for this session? Reply with the task and encouraging words only.`;
}

/**
 * Main entry: generate supervisor guidance and submit it to the session
 */
export async function superviseSession(
    julesClient: JulesClient,
    sessionId: string,
    sessionTitle: string,
    sessionState: string,
    sourceId: string,
    inactiveMinutes: number
): Promise<{ guidance: string; submitted: boolean }> {
    const provider = 'openrouter';
    const apiKey = getSupervisorAPIKey('openrouter');
    if (!apiKey) throw new Error('No OPENROUTER_API_KEY found in environment');
    const dbSettings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } });
    // Build model rotation list: primary first, then fallbacks (excluding primary)
    const primaryModel = dbSettings?.supervisorModel || 'google/gemma-3-27b-it:free';
    const freeModels = await getFreeModels(apiKey);
    // Put primary first, then all free models (excluding primary), keep looping
    const modelsToTry = [primaryModel, ...freeModels.filter(m => m !== primaryModel)];

    // Resolve the project folder
    const projectFolder = resolveProjectFolder(sourceId);

    // Gather all context in parallel
    console.log(`[Supervisor] Loading context for "${sessionTitle?.slice(0, 40)}" (${sessionId.slice(0, 8)})...`);

    const [projectDocs, gitLog, sessionHistory] = await Promise.all([
        Promise.resolve(loadProjectDocs(projectFolder)),
        Promise.resolve(loadGitLog(projectFolder)),
        fetchSessionHistory(julesClient, sessionId),
    ]);

    // Build prompt and enforce total size budget
    let userPrompt = buildUserPrompt(
        projectDocs, gitLog,
        sessionTitle || 'Untitled', sessionState, sourceId,
        inactiveMinutes, sessionHistory
    );

    if (userPrompt.length > MAX_TOTAL_PROMPT) {
        // Trim from the history section (least critical part to truncate)
        const overhead = userPrompt.length - MAX_TOTAL_PROMPT;
        const historyMarker = '--- REPORTED PROGRESS';
        const markerIdx = userPrompt.lastIndexOf(historyMarker);
        if (markerIdx > 0) {
            const before = userPrompt.slice(0, markerIdx);
            const history = userPrompt.slice(markerIdx);
            const trimmedHistory = history.slice(0, history.length - overhead);
            userPrompt = before + trimmedHistory + '\n...[history trimmed]';
        }
    }

    // Call LLM with model rotation on 429
    const startTime = Date.now();
    let result;
    let usedModel = '';

    for (const model of modelsToTry) {
        try {
            console.log(`[Supervisor] Trying ${provider}/${model} for session ${sessionId.slice(0, 8)}...`);
            result = await generateLLMText(
                provider,
                apiKey,
                model,
                buildSystemPrompt(),
                [{ role: 'user', content: userPrompt }]
            );
            usedModel = model;
            break; // success
        } catch (err: any) {
            if (err.message?.includes('429')) {
                console.log(`[Supervisor] ${model} rate-limited, trying next model...`);
                continue;
            }
            throw err; // non-429 error, bail
        }
    }

    if (!result) throw new Error('All supervisor models rate-limited');

    const guidance = (result?.content || '').trim();
    if (!guidance) {
        console.log(`[Supervisor] LLM returned empty content for ${sessionId.slice(0, 8)}, skipping`);
        return { guidance: '', submitted: false };
    }
    const latency = Date.now() - startTime;

    console.log(`[Supervisor] Guidance in ${latency}ms (${result.usage?.totalTokens || '?'} tokens): ${guidance.slice(0, 100)}...`);

    // Submit to the session
    let submitted = false;
    try {
        await julesClient.createActivity({
            sessionId,
            content: guidance,
        });
        submitted = true;

        await prisma.keeperLog.create({
            data: {
                sessionId,
                type: 'action',
                message: `Supervisor → "${sessionTitle?.slice(0, 30) || sessionId.slice(0, 8)}": ${guidance.slice(0, 120)}`,
                metadata: JSON.stringify({
                    event: 'supervisor_guidance',
                    provider, model: usedModel,
                    tokens: result.usage?.totalTokens,
                    latencyMs: latency,
                    sessionState, inactiveMinutes,
                }),
            },
        });

        emitDaemonEvent('activities_updated', { sessionId });
    } catch (err: any) {
        await prisma.keeperLog.create({
            data: {
                sessionId,
                type: 'error',
                message: `Supervisor submit failed for ${sessionId.slice(0, 8)}: ${err.message}`,
                metadata: JSON.stringify({ event: 'supervisor_submit_failed', error: err.message }),
            },
        });
    }

    return { guidance, submitted };
}
