import { generateText } from '@jules/shared';
import { Activity } from '@jules/shared';

export interface MemoryFile {
  version: string;
  generatedAt: string;
  sessionId: string;
  summary: string;
  keyDecisions: string[];
  unresolvedIssues: string[];
  context: string; // The actual text to inject
}

export async function compactSessionHistory(
  activities: Activity[],
  config: { provider: string; apiKey: string; model: string }
): Promise<MemoryFile> {

  // 1. Filter and Format Activities
  // We only care about user/agent messages, not intermediate tool outputs usually, 
  // unless we want a very detailed log. For memory, high level is better.
  const transcript = activities
    .filter(a => a.type === 'message' || a.role === 'user' || a.role === 'agent')
    .map(a => `${a.role.toUpperCase()}: ${a.content}`)
    .join('\n\n');

  const prompt = `You are an expert technical writer and AI systems architect.
Your task is to create a "Memory File" from the following session transcript.
This memory file will be used to restore context for a future AI session working on the same codebase.

TRANSCRIPT:
${transcript.substring(0, 50000)} // Truncate to avoid massive context limits if necessary

INSTRUCTIONS:
1. Write a high-level SUMMARY of what was accomplished.
2. List KEY DECISIONS made (architectural, stylistic, etc.).
3. List UNRESOLVED ISSUES or next steps.
4. Create a CONTEXT BLOCK that can be pasted into a new session to prime the agent.

Output strictly in JSON format:
{
  "summary": "...",
  "keyDecisions": ["..."],
  "unresolvedIssues": ["..."],
  "context": "..."
}`;

  try {
    const response = await generateText({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      messages: [{ role: 'user', content: prompt }]
    });

    // Clean up markdown code blocks if present
    const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      sessionId: activities[0]?.sessionId || 'unknown',
      summary: data.summary,
      keyDecisions: data.keyDecisions || [],
      unresolvedIssues: data.unresolvedIssues || [],
      context: data.context
    };

  } catch (error) {
    console.error("Compaction failed:", error);
    throw new Error("Failed to generate memory from session.");
  }
}
