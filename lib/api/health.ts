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

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error('Failed to load runtime health');
  }
  return response.json() as Promise<HealthResponse>;
}

export async function fetchMetricsText(): Promise<string> {
  const response = await fetch('/metrics');
  if (!response.ok) {
    throw new Error('Failed to load metrics');
  }
  return response.text();
}
