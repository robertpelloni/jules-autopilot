import { Message, Participant, DebateResult, DebateRound, DebateTurn, DebateProgressEvent } from './types';
import { getProvider, generateText } from './providers';

export async function runDebate({ history, participants, rounds = 1, topic, onProgress }: {
    history: Message[];
    participants: Participant[];
    rounds?: number;
    topic?: string;
    onProgress?: (event: DebateProgressEvent) => void;
}): Promise<DebateResult> {

    const currentHistory = [...history];
    const debateRounds: DebateRound[] = [];
    
    onProgress?.({ type: 'start', topic, rounds });

    // We need a default API key/provider for the moderator/summarizer if not explicitly provided
    // We'll use the first participant's credentials as a fallback for the moderator
    const primaryParticipant = participants[0];

    for (let i = 0; i < rounds; i++) {
        onProgress?.({ type: 'round_start', roundNumber: i + 1 });
        const turns: DebateTurn[] = [];

        for (const p of participants) {
            onProgress?.({ type: 'turn_start', participantId: p.id, participantName: p.name, role: p.role });
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
                
                onProgress?.({ type: 'turn_complete', participantId: p.id, content });

            } catch (err) {
                console.error(`Error processing turn for ${p.name}:`, err);
                const errorContent = `[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`;
                turns.push({
                    participantId: p.id,
                    participantName: p.name,
                    role: p.role,
                    content: errorContent,
                    timestamp: new Date().toISOString()
                });
                onProgress?.({ type: 'turn_complete', participantId: p.id, content: errorContent });
            }
        }

        debateRounds.push({
            roundNumber: i + 1,
            turns
        });
        
        onProgress?.({ type: 'round_complete', roundNumber: i + 1, turns });
    }

    // --- Consensus / Summary Phase ---
    onProgress?.({ type: 'summary_start' });
    let summary = `Debate completed (${rounds} round${rounds > 1 ? 's' : ''}).`;
    
    // Use the primary participant for summary, but check if we have a valid provider first.
    // If not, try to find ANY valid provider from the participants list.
    const summaryParticipant = participants.find(p => getProvider(p.provider)) || primaryParticipant;

    if (summaryParticipant) {
        try {
            const provider = getProvider(summaryParticipant.provider);
            if (!provider) {
                // Should be caught by the find above, but double check
                console.warn("No valid provider found for summary generation");
            } else {
                const moderatorPrompt = `You are the Moderator and Judge of this technical debate.
                ${topic ? `Topic: ${topic}` : ''}
                
                Review the debate history above.
                1. Summarize the key arguments from each participant.
                2. Identify areas of consensus and disagreement.
                3. Provide a final conclusion or recommendation based on the strongest arguments.
                
                Format: Markdown.`;

                // We pass the full history including the new debate turns
                const synthesis = await provider.complete({
                    messages: [
                        ...currentHistory,
                        { role: 'system', content: moderatorPrompt } // Some providers might prefer system role in messages
                        // OR we can append to the last message if 'system' role isn't supported in history array mix
                    ],
                    model: summaryParticipant.model,
                    apiKey: summaryParticipant.apiKey,
                    // valid system prompt if the provider supports separate system arg
                    systemPrompt: moderatorPrompt 
                });
                
                summary = synthesis.content;
            }

        } catch (e) {
            console.error("Failed to generate debate summary:", e);
            summary += " (Auto-summary generation failed)";
        }
    }
    
    onProgress?.({ type: 'summary_complete', summary });

    const result: DebateResult = {
        topic,
        rounds: debateRounds,
        summary,
        history: currentHistory
    };
    
    onProgress?.({ type: 'complete', result });

    return result;
}

export async function runConference({ history, participants, onProgress }: {
    history: Message[];
    participants: Participant[];
    onProgress?: (event: DebateProgressEvent) => void;
}): Promise<DebateResult> {
    // A conference is essentially a single-round debate/discussion
    // where each participant weighs in on the current state.
    // We can reuse the debate logic with rounds=1.
    return runDebate({
        history,
        participants,
        rounds: 1,
        topic: "Team Conference",
        onProgress
    });
}

