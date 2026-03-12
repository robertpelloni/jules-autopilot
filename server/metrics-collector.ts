/**
 * API Metrics Collector
 * 
 * In-memory metrics aggregation for API endpoints.
 * Tracks request counts, latency percentiles, error rates, and throughput.
 * In production, feed these into Prometheus/Grafana via /api/metrics endpoint.
 */

interface RequestMetric {
    path: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    timestamp: number;
}

interface EndpointStats {
    totalRequests: number;
    errorCount: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    lastRequestAt: number;
}

class MetricsCollector {
    private buffer: RequestMetric[] = [];
    private readonly maxBufferSize = 10000;

    /**
     * Record a request metric.
     */
    record(metric: Omit<RequestMetric, 'timestamp'>): void {
        this.buffer.push({ ...metric, timestamp: Date.now() });

        // Evict oldest entries if buffer is full
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer = this.buffer.slice(-this.maxBufferSize / 2);
        }
    }

    /**
     * Get aggregated stats for all endpoints.
     */
    getStats(windowMs?: number): Record<string, EndpointStats> {
        const cutoff = windowMs ? Date.now() - windowMs : 0;
        const relevant = this.buffer.filter(m => m.timestamp >= cutoff);

        const grouped: Record<string, RequestMetric[]> = {};
        for (const m of relevant) {
            const key = `${m.method} ${m.path}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key]!.push(m);
        }

        const stats: Record<string, EndpointStats> = {};
        for (const [key, metrics] of Object.entries(grouped)) {
            const latencies = metrics.map(m => m.latencyMs).sort((a, b) => a - b);
            const errorCount = metrics.filter(m => m.statusCode >= 400).length;

            stats[key] = {
                totalRequests: metrics.length,
                errorCount,
                avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
                p50LatencyMs: percentile(latencies, 50),
                p95LatencyMs: percentile(latencies, 95),
                p99LatencyMs: percentile(latencies, 99),
                lastRequestAt: Math.max(...metrics.map(m => m.timestamp))
            };
        }

        return stats;
    }

    /**
     * Get overall system metrics summary.
     */
    getSummary(windowMs: number = 300_000): {
        totalRequests: number;
        errorRate: number;
        avgLatencyMs: number;
        requestsPerSecond: number;
        topEndpoints: Array<{ endpoint: string; requests: number }>;
    } {
        const cutoff = Date.now() - windowMs;
        const relevant = this.buffer.filter(m => m.timestamp >= cutoff);

        if (relevant.length === 0) {
            return { totalRequests: 0, errorRate: 0, avgLatencyMs: 0, requestsPerSecond: 0, topEndpoints: [] };
        }

        const errors = relevant.filter(m => m.statusCode >= 400).length;
        const totalLatency = relevant.reduce((sum, m) => sum + m.latencyMs, 0);

        // Count by endpoint
        const counts: Record<string, number> = {};
        for (const m of relevant) {
            const key = `${m.method} ${m.path}`;
            counts[key] = (counts[key] || 0) + 1;
        }

        const topEndpoints = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([endpoint, requests]) => ({ endpoint, requests }));

        return {
            totalRequests: relevant.length,
            errorRate: errors / relevant.length,
            avgLatencyMs: Math.round(totalLatency / relevant.length),
            requestsPerSecond: relevant.length / (windowMs / 1000),
            topEndpoints
        };
    }

    /**
     * Export metrics in Prometheus text format.
     */
    toPrometheus(): string {
        const stats = this.getStats(300_000); // 5min window
        const lines: string[] = [
            '# HELP jules_http_requests_total Total HTTP requests',
            '# TYPE jules_http_requests_total counter'
        ];

        for (const [endpoint, s] of Object.entries(stats)) {
            const [method, path] = endpoint.split(' ');
            const labels = `method="${method}",path="${path}"`;
            lines.push(`jules_http_requests_total{${labels}} ${s.totalRequests}`);
            lines.push(`jules_http_errors_total{${labels}} ${s.errorCount}`);
            lines.push(`jules_http_latency_p50{${labels}} ${s.p50LatencyMs}`);
            lines.push(`jules_http_latency_p95{${labels}} ${s.p95LatencyMs}`);
            lines.push(`jules_http_latency_p99{${labels}} ${s.p99LatencyMs}`);
        }

        return lines.join('\n');
    }

    /**
     * Clear all metrics.
     */
    reset(): void {
        this.buffer = [];
    }
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)]!;
}

// Singleton
export const metrics = new MetricsCollector();
