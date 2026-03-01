'use client';

import { useState, useEffect, useCallback } from 'react';

interface HealthCheck {
    service: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    message?: string;
}

interface HealthData {
    status: string;
    uptime: number;
    timestamp: string;
    checks: HealthCheck[];
}

export default function HealthPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [error, setError] = useState(false);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch('/api/health');
            if (res.ok || res.status === 503) {
                setData(await res.json());
                setError(false);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const statusColor = (s: string) => {
        if (s === 'healthy') return '#10b981';
        if (s === 'degraded') return '#f59e0b';
        return '#ef4444';
    };

    const statusIcon = (s: string) => {
        if (s === 'healthy') return '🟢';
        if (s === 'degraded') return '🟡';
        return '🔴';
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🏥 System Health
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                Real-time infrastructure status • Auto-refreshes every 10s
            </p>

            {error && !data && (
                <div style={{ background: '#7f1d1d', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: '#fca5a5' }}>
                    Unable to reach health endpoint.
                </div>
            )}

            {data && (
                <>
                    {/* Overall Status Banner */}
                    <div style={{
                        background: `${statusColor(data.status)}15`,
                        border: `2px solid ${statusColor(data.status)}`,
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: statusColor(data.status) }}>
                                {statusIcon(data.status)} System {data.status.toUpperCase()}
                            </div>
                            <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                Uptime: {formatUptime(data.uptime)}
                            </div>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.8rem', textAlign: 'right' }}>
                            Last check: {new Date(data.timestamp).toLocaleTimeString()}
                        </div>
                    </div>

                    {/* Service Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {data.checks.map(check => (
                            <div
                                key={check.service}
                                style={{
                                    background: '#1f2937',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    border: '1px solid #374151',
                                    borderLeft: `4px solid ${statusColor(check.status)}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {check.service}
                                    </span>
                                    <span style={{ fontSize: '0.9rem' }}>{statusIcon(check.status)}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                    Latency: {check.latencyMs}ms
                                </div>
                                {check.message && (
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                        {check.message}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Endpoints */}
                    <div style={{
                        background: '#1f2937',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginTop: '1.5rem',
                        border: '1px solid #374151'
                    }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Monitoring Endpoints</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                            <div><code style={{ color: '#8b5cf6' }}>GET /api/health</code> — JSON health checks</div>
                            <div><code style={{ color: '#8b5cf6' }}>GET /api/metrics</code> — Prometheus metrics</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
