import { CompletionParams, CompletionResult, ProviderInterface } from '../types';

export const geminiProvider: ProviderInterface = {
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const { messages, apiKey, model = 'gemini-1.5-flash', systemPrompt } = params;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemPrompt ? {
            parts: [{ text: systemPrompt }]
          } : undefined,
          contents: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          generationConfig: { maxOutputTokens: 300 }
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return { content: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
  },

  async listModels(apiKey: string): Promise<string[]> {
      return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
  }
};
