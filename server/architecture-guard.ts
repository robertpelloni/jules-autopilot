import * as fs from 'fs';
import * as path from 'path';

/**
 * Architectural Guard Rail
 * 
 * Reads `ARCHITECTURE.md` from the workspace root and uses the configured
 * LLM to evaluate whether a proposed diff violates any architectural constraint.
 */
export async function checkArchitecturalCompliance(
    diff: string,
    workspacePath: string
): Promise<{ allowed: boolean; violations: string[] }> {
    // 1. Read the architecture document
    const archPath = path.join(workspacePath, 'ARCHITECTURE.md');
    let architectureDoc = '';

    try {
        architectureDoc = fs.readFileSync(archPath, 'utf8');
    } catch {
        // No ARCHITECTURE.md found — allow by default
        return { allowed: true, violations: [] };
    }

    if (!architectureDoc.trim()) {
        return { allowed: true, violations: [] };
    }

    if (!diff.trim()) {
        return { allowed: true, violations: [] };
    }

    // 2. Use OpenAI (or configured provider) to evaluate compliance
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('[ArchGuard] No OPENAI_API_KEY — skipping guard check.');
        return { allowed: true, violations: [] };
    }

    const systemPrompt = `You are an Architecture Review Agent. You are given a project's ARCHITECTURE.md and a proposed code diff. Your job is to identify any violations of the architectural rules. Return a JSON object with:
- "allowed": boolean (true if the diff complies with all rules)
- "violations": string[] (list of specific rule violations found, empty if allowed)

Be strict. Only flag genuine architectural violations, not style preferences.`;

    const userPrompt = `## ARCHITECTURE.md
\`\`\`
${architectureDoc.substring(0, 4000)}
\`\`\`

## Proposed Diff
\`\`\`diff
${diff.substring(0, 6000)}
\`\`\`

Evaluate this diff for architectural compliance. Return JSON only.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            console.error(`[ArchGuard] LLM returned ${response.status}`);
            return { allowed: true, violations: [] }; // Fail-open
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) return { allowed: true, violations: [] };

        const parsed = JSON.parse(content);
        return {
            allowed: !!parsed.allowed,
            violations: Array.isArray(parsed.violations) ? parsed.violations : []
        };
    } catch (err) {
        console.error('[ArchGuard] Failed to evaluate:', err);
        return { allowed: true, violations: [] }; // Fail-open on error
    }
}
