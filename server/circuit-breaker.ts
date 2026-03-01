import { prisma } from '../lib/prisma';

type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerConfig {
    provider: string;
    model: string;
    threshold?: number;
    recoveryMs?: number;
    fallbackModel?: string;
}

/**
 * Provider-level circuit breaker implementing the standard
 * closed → open → half-open → closed state machine.
 *
 * - CLOSED: Normal operation. Failures increment counter.
 *   When failures >= threshold → OPEN.
 * - OPEN: All requests routed to fallback. After recoveryMs → HALF_OPEN.
 * - HALF_OPEN: One probe request allowed. Success → CLOSED, Failure → OPEN.
 */
export class CircuitBreaker {
    private key: string;
    private provider: string;
    private model: string;
    private threshold: number;
    private recoveryMs: number;
    private fallbackModel: string;

    constructor(config: CircuitBreakerConfig) {
        this.provider = config.provider;
        this.model = config.model;
        this.key = `${config.provider}:${config.model}`;
        this.threshold = config.threshold ?? 5;
        this.recoveryMs = config.recoveryMs ?? 60000;
        this.fallbackModel = config.fallbackModel ?? 'gpt-4o-mini';
    }

    /**
     * Check if the request should proceed to the original provider
     * or be rerouted to the fallback.
     */
    async shouldAllow(): Promise<{ allowed: boolean; fallback?: string; state: CircuitState }> {
        const record = await this.getState();

        if (record.state === 'closed') {
            return { allowed: true, state: 'closed' };
        }

        if (record.state === 'open') {
            // Check if recovery window has elapsed
            if (record.openedAt) {
                const elapsed = Date.now() - new Date(record.openedAt).getTime();
                if (elapsed >= this.recoveryMs) {
                    // Transition to half-open
                    await prisma.circuitBreakerState.update({
                        where: { id: this.key },
                        data: { state: 'half_open', halfOpenAt: new Date() }
                    });
                    return { allowed: true, state: 'half_open' };
                }
            }
            return { allowed: false, fallback: record.fallbackModel || this.fallbackModel, state: 'open' };
        }

        // half_open — allow one probe request
        return { allowed: true, state: 'half_open' };
    }

    /**
     * Record a successful request.
     */
    async recordSuccess(): Promise<void> {
        const record = await this.getState();

        if (record.state === 'half_open') {
            // Successful probe → close the circuit
            await prisma.circuitBreakerState.update({
                where: { id: this.key },
                data: {
                    state: 'closed',
                    failureCount: 0,
                    successCount: { increment: 1 },
                    lastSuccessAt: new Date(),
                    openedAt: null,
                    halfOpenAt: null
                }
            });
        } else {
            await prisma.circuitBreakerState.update({
                where: { id: this.key },
                data: {
                    successCount: { increment: 1 },
                    lastSuccessAt: new Date()
                }
            });
        }
    }

    /**
     * Record a failed request.
     */
    async recordFailure(): Promise<void> {
        const record = await this.getState();
        const newFailureCount = record.failureCount + 1;

        if (record.state === 'half_open') {
            // Failed probe → reopen the circuit
            await prisma.circuitBreakerState.update({
                where: { id: this.key },
                data: {
                    state: 'open',
                    failureCount: newFailureCount,
                    lastFailureAt: new Date(),
                    openedAt: new Date(),
                    halfOpenAt: null
                }
            });
        } else if (newFailureCount >= this.threshold) {
            // Threshold breached → open the circuit
            await prisma.circuitBreakerState.update({
                where: { id: this.key },
                data: {
                    state: 'open',
                    failureCount: newFailureCount,
                    lastFailureAt: new Date(),
                    openedAt: new Date()
                }
            });
        } else {
            await prisma.circuitBreakerState.update({
                where: { id: this.key },
                data: {
                    failureCount: newFailureCount,
                    lastFailureAt: new Date()
                }
            });
        }
    }

    /**
     * Get or create the circuit breaker state from the database.
     */
    private async getState() {
        return prisma.circuitBreakerState.upsert({
            where: { id: this.key },
            update: {},
            create: {
                id: this.key,
                provider: this.provider,
                model: this.model,
                state: 'closed',
                threshold: this.threshold,
                recoveryMs: this.recoveryMs,
                fallbackModel: this.fallbackModel
            }
        });
    }
}

/**
 * Get all circuit breaker states for monitoring.
 */
export async function getAllCircuitStates() {
    return prisma.circuitBreakerState.findMany({
        orderBy: { updatedAt: 'desc' }
    });
}
