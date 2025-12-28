import { Message, Participant, DebateResult, DebateRound, DebateTurn } from './types';
import { getProvider } from './providers';

export async function runDebate({ history, participants, rounds = 1, topic }: {
    history: Message[];
    participants: Participant[];
    rounds?: number;
    topic?: string;
}): Promise<DebateResult> {

    const currentHistory = [...history];
    const debateRounds: DebateRound[] = [];

    for (let i = 0; i < rounds; i++) {
        const turns: DebateTurn[] = [];

        for (const p of participants) {
            const provider = getProvider(p.provider);
            if (!provider) {
                console.warn(`Provider ${p.provider} not found for participant ${p.name}`);
                continue;
            }

            const systemPrompt = `You are ${p.name}, acting as a ${p.role}.
            ${topic ? `Topic: ${topic}` : ''}

            Instructions:
            ${p.systemPrompt}

            Review the conversation history and provide your input.
            Be constructive, specific, and concise.`;

            try {
                // Call provider
                const response = await provider.complete({
                    messages: currentHistory,
                    model: p.model,
                    apiKey: p.apiKey,
                    systemPrompt
                });

                const content = response.content;
                const msg: Message = {
                    role: 'assistant',
                    content: content,
                    name: p.id
                };

                currentHistory.push(msg);

                turns.push({
                    participantId: p.id,
                    participantName: p.name,
                    role: p.role,
                    content,
                    timestamp: new Date().toISOString()
                });

            } catch (err) {
                console.error(`Error processing turn for ${p.name}:`, err);
                turns.push({
                    participantId: p.id,
                    participantName: p.name,
                    role: p.role,
                    content: `[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        debateRounds.push({
            roundNumber: i + 1,
            turns
        });
    }

    return {
        topic,
        rounds: debateRounds,
        summary: `Debate completed (${rounds} round${rounds > 1 ? 's' : ''}).`,
        history: currentHistory
    };
}
