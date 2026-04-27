/**
 * Generates an embedding for a given text chunk using OpenRouter's embedding API.
 */
export async function embedCodeChunk(text: string): Promise<number[] | null> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('Cannot embed code chunk: OPENROUTER_API_KEY is missing.');
        return null;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://jules-autopilot.local',
                'X-Title': 'Jules Autopilot',
            },
            body: JSON.stringify({
                input: text,
                model: 'text-embedding-3-small'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Embedding Error: ${response.status} - ${errorText}`);
            return null;
        }

        const data = await response.json();
        return data.data[0].embedding as number[];
    } catch (err) {
        console.error('Failed to communicate with Embedding API:', err);
        return null;
    }
}
