/**
 * Model Benchmark Tool
 * 
 * Runs standardized prompts against multiple LLM providers to compare
 * response quality, latency, and cost. Results are stored for trend analysis.
 */

export interface BenchmarkConfig {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
}

export interface BenchmarkResult {
    provider: string;
    model: string;
    latencyMs: number;
    outputTokens: number;
    estimatedCostUSD: number;
    output: string;
    error?: string;
}

/**
 * Run a single benchmark against a provider endpoint.
 */
async function benchmarkProvider(
    provider: string,
    apiKey: string,
    config: BenchmarkConfig
): Promise<BenchmarkResult> {
    const start = Date.now();

    const providerMap: Record<string, { url: string; model: string }> = {
        openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
        anthropic: { url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-haiku-20241022' },
        google: { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash' }
    };

    const pConfig = providerMap[provider];
    if (!pConfig) {
        return { provider, model: 'unknown', latencyMs: 0, outputTokens: 0, estimatedCostUSD: 0, output: '', error: 'Unknown provider' };
    }

    try {
        let output = '';
        let outputTokens = 0;

        if (provider === 'openai') {
            const res = await fetch(pConfig.url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: pConfig.model,
                    messages: [{ role: 'user', content: config.prompt }],
                    max_tokens: config.maxTokens || 512,
                    temperature: config.temperature ?? 0.3
                }),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            output = data.choices?.[0]?.message?.content || '';
            outputTokens = data.usage?.completion_tokens || 0;
        } else if (provider === 'anthropic') {
            const res = await fetch(pConfig.url, {
                method: 'POST',
                headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({
                    model: pConfig.model,
                    max_tokens: config.maxTokens || 512,
                    messages: [{ role: 'user', content: config.prompt }]
                }),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            output = data.content?.[0]?.text || '';
            outputTokens = data.usage?.output_tokens || 0;
        } else {
            const res = await fetch(`${pConfig.url}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: config.prompt }] }],
                    generationConfig: { maxOutputTokens: config.maxTokens || 512, temperature: config.temperature ?? 0.3 }
                }),
                signal: AbortSignal.timeout(30000)
            });
            const data = await res.json();
            output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            outputTokens = output.split(/\s+/).length; // Rough estimate
        }

        const latencyMs = Date.now() - start;
        // Rough cost estimate (per 1K tokens)
        const costPer1K: Record<string, number> = { openai: 0.00015, anthropic: 0.00025, google: 0.0001 };
        const estimatedCostUSD = (outputTokens / 1000) * (costPer1K[provider] || 0.0002);

        return { provider, model: pConfig.model, latencyMs, outputTokens, estimatedCostUSD, output };
    } catch (err) {
        return {
            provider, model: pConfig.model, latencyMs: Date.now() - start,
            outputTokens: 0, estimatedCostUSD: 0, output: '',
            error: err instanceof Error ? err.message : String(err)
        };
    }
}

/**
 * Run a benchmark across all provided API keys.
 */
export async function runBenchmark(
    providers: Array<{ providerId: string; apiKey: string }>,
    config: BenchmarkConfig
): Promise<{ results: BenchmarkResult[]; fastestProvider: string; cheapestProvider: string }> {
    const results = await Promise.all(
        providers.map(p => benchmarkProvider(p.providerId, p.apiKey, config))
    );

    const successful = results.filter(r => !r.error);
    const fastestProvider = successful.length > 0
        ? successful.reduce((a, b) => a.latencyMs < b.latencyMs ? a : b).provider
        : 'none';
    const cheapestProvider = successful.length > 0
        ? successful.reduce((a, b) => a.estimatedCostUSD < b.estimatedCostUSD ? a : b).provider
        : 'none';

    return { results, fastestProvider, cheapestProvider };
}
