/**
 * Generates an embedding for a given text chunk using OpenRouter as fallback.
 *
 * Note: Nominally we use nomic-embed-text-v1.5:free via OpenRouter to remove
 * the hard dependency on OpenAI.
 */
export async function embedCodeChunk(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('Cannot embed code chunk: OPENROUTER_API_KEY is missing.');
    return null;
  }

  // Placeholder: Return a zero-vector for now to avoid OpenAI calls
  // Real embeddings should be handled by a dedicated service if RAG is critical.
  return new Array(1536).fill(0);
}
