import { generateText } from './providers/index.js';
import type { Message, DebateResult } from './types.js';

export async function calculateRiskScore(
  result: DebateResult,
  provider: string,
  apiKey: string,
  model: string
): Promise<number> {
  const prompt = `
    Analyze the following debate result and provide a risk score between 0 and 100.
    100 = Extremely High Risk (Critical system changes, lack of consensus).
    0 = Extremely Low Risk (Documentation changes, minor refactors, high consensus).

    Debate Topic: ${result.topic}
    Summary: ${result.summary}
    
    Consider:
    1. Scope of changes.
    2. Potential for regressions.
    3. Consensus among participants.
    4. Complexity of the proposed solution.

    Respond with ONLY the numerical score.
  `;

  try {
    const response = await generateText({
      provider,
      apiKey,
      model,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const score = parseInt(response.trim());
    return isNaN(score) ? 50 : Math.min(Math.max(score, 0), 100);
  } catch (error) {
    console.error("Error calculating risk score:", error);
    return 50;
  }
}

/**
 * Decides whether a debate result should be automatically approved.
 */
export function determineApprovalStatus(score: number): DebateResult['approvalStatus'] {
  if (score < 20) return 'approved';
  if (score > 80) return 'rejected';
  if (score > 50) return 'flagged';
  return 'pending';
}

export async function decideNextAction(
  provider: string,
  apiKey: string,
  model: string,
  context: string
): Promise<string> {
  const systemPrompt = `You are a supervisor for an AI agent.
  The agent has been inactive.
  Your goal is to provide a helpful, encouraging nudge or a specific instruction based on the recent context to get the agent moving again.
  Keep the message short, direct, and professional.
  Do not mention that you are a supervisor. Just speak as if you are the user giving a command.`;

  try {
    const response = await generateText({
      provider,
      apiKey,
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ]
    });

    return response || "Please continue.";
  } catch (error) {
    console.error("Supervisor error:", error);
    return "Please continue.";
  }
}
