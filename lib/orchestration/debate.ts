import { getProvider } from './providers';

interface Participant {
  provider: string;
  model: string;
  apiKey: string;
  role?: string; // e.g. "Security Expert", "Performance Expert"
}

interface DebateParams {
  history: { role: string; content: string }[];
  participants: Participant[];
  judge?: Participant; // If null, use the first participant as judge
}

export async function runDebate(params: DebateParams) {
  const { history, participants, judge } = params;

  // 1. Collect Opinions
  const opinions = await Promise.all(participants.map(async (p) => {
    try {
        const provider = getProvider(p.provider);
        if (!provider) throw new Error(`Provider ${p.provider} not found`);

        const sysPrompt = `You are a ${p.role || 'project supervisor'} participating in a debate about the next steps for an AI agent.
Analyze the history and provide your recommendation. Be concise.`;

        const result = await provider.complete({
            messages: history,
            apiKey: p.apiKey,
            model: p.model,
            systemPrompt: sysPrompt
        });

        return { participant: p, content: result.content };
    } catch (e) {
        console.error(`Participant ${p.provider}/${p.model} failed:`, e);
        return { participant: p, error: e instanceof Error ? e.message : 'Unknown error', content: '' };
    }
  }));

  // 2. Synthesize (Judge)
  const validOpinions = opinions.filter(o => !o.error && o.content);

  if (validOpinions.length === 0) {
      throw new Error("All debate participants failed.");
  }

  const opinionText = validOpinions.map(o => `### ${o.participant.role || o.participant.model} (${o.participant.provider}):\n${o.content}`).join('\n\n');

  const judgeParticipant = judge || participants[0];
  const judgeProvider = getProvider(judgeParticipant.provider);
  if (!judgeProvider) throw new Error("Judge provider not found");

  const synthesisPrompt = `You are the Chief Supervisor. You have heard opinions from your council regarding the AI agent's status.

COUNCIL OPINIONS:
${opinionText}

Based on these opinions and the history, provide the SINGLE final instruction for the agent.
Synthesize the best points. Be direct and directive. Do not mention "The Council" in your final instruction to the agent, just give the instruction.`;

  const finalResult = await judgeProvider.complete({
      messages: history, // Give judge full history too
      apiKey: judgeParticipant.apiKey,
      model: judgeParticipant.model,
      systemPrompt: synthesisPrompt
  });

  return {
      content: finalResult.content,
      opinions: validOpinions
  };
}
