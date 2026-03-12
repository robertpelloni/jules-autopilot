/**
 * API Rate Limiter
 * 
 * In-memory sliding window rate limiter for API endpoints.
 * In production, this should be backed by Redis for horizontal scaling.
 * 
 * Usage in API routes:
 *   import { rateLimit } from '@/lib/rate-limiter';
 *   const limiter = rateLimit({ windowMs: 60000, maxRequests: 60 });
 *   
 *   export async function GET(req: Request) {
 *       const limited = limiter.check(getClientIP(req));
 *       if (limited) return limited;
 *       // ... handle request
 *   }
 */

import { NextResponse } from 'next/server';

interface RateLimitConfig {
    /** Time window in milliseconds */
    windowMs: number;
    /** Max requests per window */
    maxRequests: number;
    /** Custom message for rate limit response */
    message?: string;
}

interface WindowEntry {
    count: number;
    resetAt: number;
}

class RateLimiter {
    private windows: Map<string, WindowEntry> = new Map();
    private config: Required<RateLimitConfig>;
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor(config: RateLimitConfig) {
        this.config = {
            windowMs: config.windowMs,
            maxRequests: config.maxRequests,
            message: config.message || 'Too many requests. Please try again later.'
        };

        // Periodic cleanup of expired entries
        this.cleanupInterval = setInterval(() => this.cleanup(), this.config.windowMs * 2);
    }

    /**
     * Check if a request should be rate limited.
     * Returns null if allowed, or a 429 Response if limited.
     */
    check(key: string): Response | null {
        const now = Date.now();
        const entry = this.windows.get(key);

        if (!entry || now >= entry.resetAt) {
            // New window
            this.windows.set(key, { count: 1, resetAt: now + this.config.windowMs });
            return null;
        }

        if (entry.count >= this.config.maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            return NextResponse.json(
                { error: this.config.message, retryAfter },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfter),
                        'X-RateLimit-Limit': String(this.config.maxRequests),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000))
                    }
                }
            );
        }

        entry.count++;
        return null;
    }

    /**
     * Get remaining requests for a key.
     */
    getRemaining(key: string): number {
        const entry = this.windows.get(key);
        if (!entry || Date.now() >= entry.resetAt) return this.config.maxRequests;
        return Math.max(0, this.config.maxRequests - entry.count);
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.windows) {
            if (now >= entry.resetAt) this.windows.delete(key);
        }
    }

    dispose(): void {
        clearInterval(this.cleanupInterval);
        this.windows.clear();
    }
}

/**
 * Create a rate limiter instance.
 */
export function rateLimit(config: RateLimitConfig): RateLimiter {
    return new RateLimiter(config);
}

/**
 * Extract client IP from request headers.
 */
export function getClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
    return req.headers.get('x-real-ip') || 'unknown';
}

// Pre-configured limiters for common use cases
export const apiLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60 });
export const authLimiter = rateLimit({ windowMs: 300_000, maxRequests: 10, message: 'Too many auth attempts.' });
export const heavyLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10, message: 'Rate limit exceeded for expensive operations.' });
