/**
 * Retry Policy Engine
 * 
 * Configurable retry strategies for failed agent tasks, API calls,
 * and workflow steps. Supports exponential backoff, linear delay,
 * and custom retry predicates.
 */

export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

export interface RetryPolicy {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Base delay in milliseconds */
    baseDelayMs: number;
    /** Maximum delay cap in milliseconds */
    maxDelayMs: number;
    /** Backoff strategy */
    strategy: RetryStrategy;
    /** Jitter factor (0-1) to randomize delays */
    jitterFactor: number;
    /** HTTP status codes that should trigger a retry */
    retryableStatuses: number[];
    /** Custom predicate — return true to retry */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_POLICY: RetryPolicy = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    strategy: 'exponential',
    jitterFactor: 0.2,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Calculate delay for a given attempt number.
 */
function calculateDelay(policy: RetryPolicy, attempt: number): number {
    let delay: number;

    switch (policy.strategy) {
        case 'exponential':
            delay = policy.baseDelayMs * Math.pow(2, attempt);
            break;
        case 'linear':
            delay = policy.baseDelayMs * (attempt + 1);
            break;
        case 'fixed':
            delay = policy.baseDelayMs;
            break;
    }

    // Apply jitter
    if (policy.jitterFactor > 0) {
        const jitter = delay * policy.jitterFactor * (Math.random() * 2 - 1);
        delay += jitter;
    }

    return Math.min(Math.max(delay, 0), policy.maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: unknown;
    attempts: number;
    totalDelayMs: number;
}

/**
 * Execute a function with retry logic.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    policy: Partial<RetryPolicy> = {}
): Promise<RetryResult<T>> {
    const p: RetryPolicy = { ...DEFAULT_POLICY, ...policy };
    let lastError: unknown;
    let totalDelay = 0;

    for (let attempt = 0; attempt <= p.maxRetries; attempt++) {
        try {
            const result = await fn();
            return { success: true, result, attempts: attempt + 1, totalDelayMs: totalDelay };
        } catch (err) {
            lastError = err;

            // Check if we should retry
            if (attempt >= p.maxRetries) break;

            if (p.shouldRetry && !p.shouldRetry(err, attempt)) break;

            // Check HTTP status if applicable
            if (err instanceof Response && !p.retryableStatuses.includes(err.status)) break;

            const delay = calculateDelay(p, attempt);
            totalDelay += delay;
            await sleep(delay);
        }
    }

    return { success: false, error: lastError, attempts: p.maxRetries + 1, totalDelayMs: totalDelay };
}

/**
 * Pre-configured policies for common scenarios.
 */
export const RETRY_POLICIES = {
    /** Aggressive retries for transient failures */
    aggressive: { maxRetries: 5, baseDelayMs: 500, strategy: 'exponential' as const, jitterFactor: 0.3, maxDelayMs: 15000, retryableStatuses: [408, 429, 500, 502, 503, 504] },
    /** Conservative retries for important operations */
    conservative: { maxRetries: 3, baseDelayMs: 2000, strategy: 'exponential' as const, jitterFactor: 0.1, maxDelayMs: 60000, retryableStatuses: [429, 502, 503] },
    /** Fast retries for quick checks */
    fast: { maxRetries: 2, baseDelayMs: 200, strategy: 'fixed' as const, jitterFactor: 0, maxDelayMs: 200, retryableStatuses: [429, 503] },
    /** No retries */
    none: { maxRetries: 0, baseDelayMs: 0, strategy: 'fixed' as const, jitterFactor: 0, maxDelayMs: 0, retryableStatuses: [] }
} satisfies Record<string, Partial<RetryPolicy>>;
