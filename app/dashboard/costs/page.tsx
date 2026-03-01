'use client';

import { useState, useEffect, useCallback } from 'react';

interface CostAnalytics {
    summary: {
        totalCostDollars: string;
        totalRequests: number;
        avgCostPerRequestCents: string;
        periodDays: number;
    };
    recommended: {
        provider: string;
        model: string;
        reason: string;
    };
    costByProvider: Array<{
        provider: string;
        totalCost: number;
        requestCount: number;
        avgLatency: number;
    }>;
    costByTaskType: Array<{
        taskType: string;
        totalCost: number;
        requestCount: number;
    }>;
    dailyCosts: Array<{
        date: string;
        totalCost: number;
        requestCount: number;
    }>;
}

export default function CostsPage() {
    const [data, setData] = useState<CostAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/cost-optimizer');
            if (res.ok) {
                setData(await res.json());
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading cost analytics...</div>;
    }

    if (!data) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Failed to load analytics.</div>;
    }

    const providerColors: Record<string, string> = {
        openai: '#10b981',
        anthropic: '#f59e0b',
        deepseek: '#8b5cf6',
        google: '#3b82f6'
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                💰 Cost Optimizer
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                30-day provider telemetry analytics and intelligent routing recommendations.
            </p>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard
                    label="Total Cost"
                    value={`$${data.summary.totalCostDollars}`}
                    subtitle={`${data.summary.periodDays} day period`}
                    color="#10b981"
                />
                <StatCard
                    label="Total Requests"
                    value={data.summary.totalRequests.toLocaleString()}
                    subtitle="API calls"
                    color="#3b82f6"
                />
                <StatCard
                    label="Avg Cost/Request"
                    value={`${data.summary.avgCostPerRequestCents}¢`}
                    subtitle="per request"
                    color="#f59e0b"
                />
                <StatCard
                    label="Recommended"
                    value={data.recommended.provider}
                    subtitle={data.recommended.reason.substring(0, 50)}
                    color="#8b5cf6"
                />
            </div>

            {/* Provider Breakdown */}
            <div style={{
                background: '#1f2937',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #374151'
            }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Provider Breakdown
                </h2>
                {data.costByProvider.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>No usage data yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data.costByProvider.map(p => {
                            const maxCost = Math.max(...data.costByProvider.map(x => x.totalCost));
                            const pct = maxCost > 0 ? (p.totalCost / maxCost) * 100 : 0;
                            return (
                                <div key={p.provider}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 600 }}>{p.provider}</span>
                                        <span style={{ color: '#9ca3af' }}>
                                            ${(p.totalCost / 100).toFixed(2)} · {p.requestCount} reqs · {p.avgLatency}ms avg
                                        </span>
                                    </div>
                                    <div style={{ height: '8px', background: '#374151', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            background: providerColors[p.provider] || '#6b7280',
                                            borderRadius: '4px',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Task Type Breakdown */}
            <div style={{
                background: '#1f2937',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #374151'
            }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Cost by Task Type
                </h2>
                {data.costByTaskType.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>No usage data yet.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        {data.costByTaskType.map(t => (
                            <div key={t.taskType} style={{
                                background: '#111827',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                border: '1px solid #374151'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                    {t.taskType}
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                    ${(t.totalCost / 100).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {t.requestCount} requests
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, subtitle, color }: { label: string; value: string; subtitle: string; color: string }) {
    return (
        <div style={{
            background: '#1f2937',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #374151',
            borderLeft: `4px solid ${color}`
        }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {value}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                {subtitle}
            </div>
        </div>
    );
}
