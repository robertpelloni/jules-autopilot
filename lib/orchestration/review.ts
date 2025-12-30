
import { LLMProvider, Message, CompletionResult } from './types';

// Simple interface for review requests
export interface ReviewRequest {
    codeContext: string;
    provider: string;
    model: string;
    apiKey: string;
    systemPrompt?: string;
}

export async function runCodeReview(request: ReviewRequest): Promise<string> {
    const { getProvider } = await import('./providers');
    const provider = getProvider(request.provider);
    
    if (!provider) {
        throw new Error(`Provider ${request.provider} not found`);
    }

    const systemPrompt = request.systemPrompt || `You are an expert code reviewer.
    Review the provided code context.
    - Identify potential bugs, security issues, and performance bottlenecks.
    - Suggest improvements for readability and maintainability.
    - Be concise and actionable.`;

    const result = await provider.complete({
        messages: [{ role: 'user', content: request.codeContext }],
        model: request.model,
        apiKey: request.apiKey,
        systemPrompt
    });

    return result.content;
}
