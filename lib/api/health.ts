export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  checks: {
    database?: { status?: string; error?: string };
    daemon?: { running?: boolean; enabled?: boolean };
    worker?: { running?: boolean };
    credentials?: { julesConfigured?: boolean };
  };
  queue?: { pending?: number; processing?: number };
  totals?: {
    sessions?: number;
    codeChunks?: number;
    memoryChunks?: number;
    templates?: number;
    debates?: number;
  };
  realtime?: { wsClients?: number };
}

export interface ScheduledTask {
  name: string;
  intervalMs: number;
  nextRun: string;
  lastRun?: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('Backend down');
    return response.json() as Promise<HealthResponse>;
  } catch (_e) {
    return {
      status: 'offline',
      timestamp: new Date().toISOString(),
      version: '3.5.5',
      checks: {
        database: { status: 'down', error: 'Go backend not detected' },
        daemon: { running: false, enabled: false },
        worker: { running: false }
      }
    };
  }
}

export async function fetchScheduledTasks(): Promise<ScheduledTask[]> {
  try {
    const response = await fetch('/api/scheduler');
    if (!response.ok) return [];
    return response.json() as Promise<ScheduledTask[]>;
  } catch (_e) {
    return [];
  }
}

export async function triggerScheduledTask(name: string): Promise<void> {
  const response = await fetch(`/api/scheduler/${name}/trigger`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to trigger task ${name}`);
  }
}

export async function fetchMetricsText(): Promise<string> {
  const response = await fetch('/metrics');
  if (!response.ok) {
    throw new Error('Failed to load metrics');
  }
  return response.text();
}

