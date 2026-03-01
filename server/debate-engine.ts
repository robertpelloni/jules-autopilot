import { prisma } from '../lib/prisma';
import { getProvider } from './providers'; // From provider abstraction

export interface DebateTurn {
    participantName: string;
    role: string;
    content: string;
}

export interface DebateRound {
    roundNumber: number;
    turns: DebateTurn[];
}

export interface DebateResult {
    topic: string;
    summary: string;
    history: { role: string; content: string }[];
    rounds: DebateRound[];
    metadata?: Record<string, unknown>;
}

/**
 * Orchestrates a debate between two Agent Personas over a specific topic.
 */
export async function runDebate(
    topic: string,
    personaNameA: string,
    personaNameB: string,
    numRounds: number = 3
): Promise<DebateResult> {
    const personaA = await prisma.agentPersona.findUnique({ where: { name: personaNameA } });
    const personaB = await prisma.agentPersona.findUnique({ where: { name: personaNameB } });

    if (!personaA || !personaB) {
        throw new Error('One or both specified personas not found');
    }

    const providerA = getProvider('anthropic'); // Defaulting engines for debate
    const providerB = getProvider('openai');

    const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    const rounds: DebateRound[] = [];

    let currentContext = `Topic for debate: ${topic}\n\nPlease present your initial arguments.`;

    for (let r = 1; r <= numRounds; r++) {
        const turns: DebateTurn[] = [];

        // Persona A speaks
        const promptA = [
            { role: 'system' as const, content: personaA.systemPrompt },
            ...history,
            { role: 'user' as const, content: currentContext }
        ];

        const responseA = await providerA.generateText(promptA, { temperature: personaA.temperature });
        turns.push({ participantName: personaA.name, role: 'Proposer', content: responseA });
        history.push({ role: 'assistant', content: `[${personaA.name}]: ${responseA}` });
        currentContext = `Response to [${personaA.name}]:\n\n${responseA}`;

        // Persona B speaks
        const promptB = [
            { role: 'system' as const, content: personaB.systemPrompt },
            ...history,
            { role: 'user' as const, content: currentContext }
        ];

        const responseB = await providerB.generateText(promptB, { temperature: personaB.temperature });
        turns.push({ participantName: personaB.name, role: 'Opposer', content: responseB });
        history.push({ role: 'assistant', content: `[${personaB.name}]: ${responseB}` });
        currentContext = `Rebuttal to [${personaB.name}]:\n\n${responseB}`;

        rounds.push({ roundNumber: r, turns });
    }

    // Generate summary using a neutral judge
    const summaryPrompt = [
        { role: 'system' as const, content: 'You are an impartial judge summarizing a debate. Provide a concise summary of the key arguments and any resulting consensus.' },
        ...history,
        { role: 'user' as const, content: 'Please summarize the debate above.' }
    ];

    const summary = await providerA.generateText(summaryPrompt, { temperature: 0.3 });

    const result = {
        topic,
        summary,
        history,
        rounds
    };

    // Store in database
    await prisma.storedDebate.create({
        data: {
            topic,
            summary,
            history: JSON.stringify(history),
            rounds: JSON.stringify(rounds),
        }
    });

    return result;
}
