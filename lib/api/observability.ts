export interface HealthSnapshot {
  id: string;
  status: string;
  databaseUp: boolean;
  daemonRunning: boolean;
  workerRunning: boolean;
  schedulerRunning: boolean;
  pendingJobs: number;
  processingJobs: number;
  wsClients: number;
  sessions: number;
  codeChunks: number;
  memoryChunks: number;
  notifications: number;
  auditEntries: number;
  responseTimeMs: number;
  memoryUsageMB: number;
  goroutineCount: number;
  createdAt: string;
}

export interface AnomalyRecord {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  sessionId?: string;
  metadata?: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export interface TokenUsageReport {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostCents: number;
  failedRequests: number;
  byProvider: Record<string, {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costCents: number;
  }>;
  byRequestType: Record<string, {
    requests: number;
    totalTokens: number;
    costCents: number;
  }>;
}

export async function fetchHealthHistory(hours = 24, limit = 100): Promise<{ snapshots: HealthSnapshot[]; total: number }> {
  const response = await fetch(`/api/health/history?hours=${hours}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load health history');
  return response.json();
}

export async function fetchActiveAnomalies(): Promise<{ anomalies: AnomalyRecord[]; total: number }> {
  const response = await fetch('/api/health/anomalies');
  if (!response.ok) throw new Error('Failed to load anomalies');
  return response.json();
}

export async function resolveAnomaly(id: string): Promise<void> {
  await fetch(`/api/health/anomalies/${id}/resolve`, { method: 'POST' });
}

export async function fetchAnomalyHistory(limit = 50): Promise<{ anomalies: AnomalyRecord[]; total: number }> {
  const response = await fetch(`/api/health/anomalies/history?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load anomaly history');
  return response.json();
}

export async function fetchTokenUsageStats(opts?: {
  provider?: string;
  sessionId?: string;
  since?: string;
}): Promise<TokenUsageReport> {
  const params = new URLSearchParams();
  if (opts?.provider) params.set('provider', opts.provider);
  if (opts?.sessionId) params.set('sessionId', opts.sessionId);
  if (opts?.since) params.set('since', opts.since);
  const response = await fetch(`/api/tokens/usage?${params}`);
  if (!response.ok) throw new Error('Failed to load token usage');
  return response.json();
}

export async function fetchSessionTokenUsage(sessionId: string): Promise<TokenUsageReport> {
  const response = await fetch(`/api/tokens/session/${sessionId}`);
  if (!response.ok) throw new Error('Failed to load session token usage');
  return response.json();
}
