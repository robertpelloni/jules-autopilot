export type ThrottledTask<T> = () => Promise<T>;

// ─── Global rate-limit cooldown gate ──────────────────────────────
// Shared across ALL queues. When any Google API call gets 429'd,
// every queue pauses until the cooldown expires.

let globalCooldownUntil = 0;

export function triggerGlobalCooldown(ms: number = 60_000) {
    const until = Date.now() + ms;
    if (until > globalCooldownUntil) {
        globalCooldownUntil = until;
        console.log(`[RateLimit] Global cooldown until ${new Date(until).toLocaleTimeString()} (${Math.round(ms/1000)}s)`);
    }
}

export function getGlobalCooldownRemaining(): number {
    return Math.max(0, globalCooldownUntil - Date.now());
}

// ─── Request queue with shared cooldown awareness ─────────────────

export class RequestQueue {
  private queue: { task: ThrottledTask<any>; resolve: (value: any) => void; reject: (reason?: any) => void }[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(minIntervalMs: number = 500) {
    this.minInterval = minIntervalMs;
  }

  async add<T>(task: ThrottledTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Respect global cooldown (429 backoff shared across all queues)
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
          // If 429, trigger global cooldown so ALL queues back off
          if (error?.status === 429) {
              triggerGlobalCooldown(60_000); // 60s global pause
          }
          item.reject(error);
        }
      }
    }

    this.processing = false;
  }
}

export const globalRequestQueue = new RequestQueue(500);
// Separate faster queue for autopilot nudges — they're simple POSTs
// and shouldn't be blocked behind supervisor's long LLM calls
export const nudgeRequestQueue = new RequestQueue(300);
