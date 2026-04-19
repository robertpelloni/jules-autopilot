export type ThrottledTask<T> = () => Promise<T>;

// ─── Priority levels ──────────────────────────────────────────────
export const PRIORITY_BROADCAST = 10;  // Manual user actions (broadcast, send message)
export const PRIORITY_AUTOPILOT = 5;   // Periodic nudges
export const PRIORITY_SUPERVISOR = 1;  // LLM guidance (lowest — most expensive, least urgent)

// ─── Single shared Google API queue ──────────────────────────────
// ONE queue for ALL Google API calls with priority support.

let globalCooldownUntil = 0;

export function triggerGlobalCooldown(ms: number = 120_000) {
    const until = Date.now() + ms;
    if (until > globalCooldownUntil) {
        globalCooldownUntil = until;
        console.log(`[RateLimit] Global cooldown until ${new Date(until).toLocaleTimeString()} (${Math.round(ms / 1000)}s)`);
    }
}

export function getGlobalCooldownRemaining(): number {
    return Math.max(0, globalCooldownUntil - Date.now());
}

export function isInCooldown(): boolean {
    return Date.now() < globalCooldownUntil;
}

interface QueueItem {
    task: ThrottledTask<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    priority: number;
    id: number;
}

let itemId = 0;

export class RequestQueue {
    private queue: QueueItem[] = [];
    private processing = false;
    private lastRequestTime = 0;
    private minInterval: number;

    constructor(minIntervalMs: number = 2000) {
        this.minInterval = minIntervalMs;
    }

    async add<T>(task: ThrottledTask<T>, priority: number = 0): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject, priority, id: itemId++ });
            // Higher priority first; ties broken by insertion order (lower id = earlier)
            this.queue.sort((a, b) => b.priority - a.priority || a.id - b.id);
            this.process();
        });
    }

    private async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        while (this.queue.length > 0) {
            // Respect global cooldown (429 backoff)
            const cooldownRemaining = getGlobalCooldownRemaining();
            if (cooldownRemaining > 0) {
                await new Promise(resolve => setTimeout(resolve, cooldownRemaining));
            }

            const now = Date.now();
            const elapsed = now - this.lastRequestTime;
            const wait = Math.max(0, this.minInterval - elapsed);

            if (wait > 0) {
                await new Promise(resolve => setTimeout(resolve, wait));
            }

            const item = this.queue.shift();
            if (item) {
                try {
                    this.lastRequestTime = Date.now();
                    const result = await item.task();
                    item.resolve(result);
                } catch (error: any) {
                    // If 429, trigger global cooldown
                    if (error?.status === 429) {
                        triggerGlobalCooldown(120_000);
                    }
                    item.reject(error);
                }
            }
        }

        this.processing = false;
    }

    get pending(): number {
        return this.queue.length;
    }
}

// SINGLE queue for ALL Google API calls
export const googleApiQueue = new RequestQueue(3000); // 3s between requests
