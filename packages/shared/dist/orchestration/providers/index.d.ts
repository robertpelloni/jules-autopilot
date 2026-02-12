import type { ProviderInterface } from '../types.js';
export declare const providers: Record<string, ProviderInterface>;
export declare function getProvider(name: string): ProviderInterface | undefined;
export declare function generateText({ provider, apiKey, model, messages }: {
    provider: string;
    apiKey: string;
    model: string;
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
        name?: string;
    }[];
}): Promise<string>;
//# sourceMappingURL=index.d.ts.map