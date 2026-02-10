import type { CompletionParams, CompletionResult, ProviderInterface } from '../types.js';

const QWEN_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

export const qwenProvider: ProviderInterface = {
  id: 'qwen',
  async complete(params: CompletionParams): Promise<CompletionResult> {
    const { messages, apiKey, model = 'qwen-turbo', systemPrompt } = params;

    const qwenMessages = messages.map(m => {
        let role = m.role;
        if (role !== 'user' && role !== 'system' && role !== 'assistant') {
            role = 'assistant';
        }

        const msg: any = { role, content: m.content };

        if (m.name) {
             const sanitized = m.name.replace(/[^a-zA-Z0-9_-]/g, '_');
             if (sanitized) msg.name = sanitized;
        }
        return msg;
    });

    if (systemPrompt) {
        qwenMessages.unshift({ role: 'system', content: systemPrompt });
    } else if (!qwenMessages.some(m => m.role === 'system')) {
        qwenMessages.unshift({ role: 'system', content: 'You are a helpful assistant.' });
    }

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: qwenMessages
        },
        parameters: {
            // result_format: 'message' is often needed for chat-like output structure from Qwen (Necessary API config)
            result_format: 'message',
            max_tokens: params.maxTokens
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Qwen API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.output?.choices?.[0]?.message?.content || data.output?.text || '',
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.total_tokens
      } : undefined
    };
  },

  async listModels(apiKey?: string): Promise<string[]> {
      return ['qwen-turbo', 'qwen-plus', 'qwen-max'];
  }
};
