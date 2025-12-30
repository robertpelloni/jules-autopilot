import { Message, Participant, DebateResult, DebateRound, DebateTurn } from './types';
import { getProvider, generateText } from './providers';

export async function runDebate({ history, participants, rounds = 1, topic }: {
    history: Message[];
    participants: Participant[];
    rounds?: number;
    topic?: string;
}): Promise<DebateResult> {

    const currentHistory = [...history];
    const debateRounds: DebateRound[] = [];
    
    // We need a default API key/provider for the moderator/summarizer if not explicitly provided
    // We'll use the first participant's credentials as a fallback for the moderator
    const primaryParticipant = participants[0];

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
            - Critically analyze previous points.
            - Be constructive, specific, and concise.
            - If you agree, explain why. If you disagree, offer alternatives.`;

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
                    name: p.id // This helps some providers/clients track who said what
                };

                // Add to history so next participant sees it
                currentHistory.push({
                    role: 'assistant',
                    content: `[${p.name} (${p.role})]: ${content}` 
                });

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

    // --- Consensus / Summary Phase ---
    let summary = `Debate completed (${rounds} round${rounds > 1 ? 's' : ''}).`;
    
    if (primaryParticipant) {
        try {
            const moderatorPrompt = `You are the Moderator and Judge of this technical debate.
            ${topic ? `Topic: ${topic}` : ''}
            
            Review the debate history above.
            1. Summarize the key arguments from each participant.
            2. Identify areas of consensus and disagreement.
            3. Provide a final conclusion or recommendation based on the strongest arguments.
            
            Format: Markdown.`;

            // We pass the full history including the new debate turns
            const synthesis = await generateText({
                provider: primaryParticipant.provider,
                apiKey: primaryParticipant.apiKey || '', // Should handle undefined gracefully in provider
                model: primaryParticipant.model,
                messages: [
                    ...currentHistory,
                    { role: 'system', content: moderatorPrompt }
                ]
            });
            
            summary = synthesis;

        } catch (e) {
            console.error("Failed to generate debate summary:", e);
            summary += " (Auto-summary generation failed)";
        }
    }

    return {
        topic,
        rounds: debateRounds,
        summary,
        history: currentHistory
    };
}

export async function runConference({ history, participants }: {
    history: Message[];
    participants: Participant[];
}): Promise<DebateResult> {
    // A conference is essentially a single-round debate/discussion
    // where each participant weighs in on the current state.
    // We can reuse the debate logic with rounds=1.
    return runDebate({
        history,
        participants,
        rounds: 1,
        topic: "Team Conference"
    });
}
