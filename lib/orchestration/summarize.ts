export async function summarizeSession(history: { role: string; content: string }[], provider: string, apiKey: string, model: string): Promise<string> {
  const { generateText } = await import('./providers');
  
  const systemPrompt = 'You are a session archivist. Your goal is to summarize a long conversation history into a compact, dense "handoff" log. This log will be used to start a new session. Capture key decisions, open tasks, unresolved issues, and important context. Ignore pleasantries. The format should be a bulleted list or a concise paragraph.';
  
  const prompt = 'Please summarize the following session history for a handoff to a new session:\n\n' + 
    history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');

  return generateText({
    provider,
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  });
}
