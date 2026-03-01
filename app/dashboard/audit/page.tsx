'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuditEntry {
    id: string;
    actor: string;
    action: string;
    resource: string;
    resourceId: string | null;
    metadata: string | null;
    ipAddress: string | null;
    apiKeyId: string | null;
    createdAt: string;
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState({ actor: '', action: '' });
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filter.actor) params.set('actor', filter.actor);
            if (filter.action) params.set('action', filter.action);
            params.set('limit', '100');
            const res = await fetch(`/api/audit?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        const timer = setTimeout(fetchLogs, 300);
        return () => clearTimeout(timer);
    }, [fetchLogs]);

    const actionColors: Record<string, string> = {
        'session': '#3b82f6',
        'swarm': '#8b5cf6',
        'plugin': '#10b981',
        'ci': '#f59e0b',
        'api_key': '#ef4444',
        'circuit': '#06b6d4',
        'schedule': '#ec4899'
    };

    const getActionColor = (action: string) => {
        const prefix = action.split('.')[0];
        return actionColors[prefix] || '#6b7280';
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                📋 Audit Trail
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                Immutable log of every orchestrator action • {total.toLocaleString()} events
            </p>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Filter by actor..."
                    value={filter.actor}
                    onChange={e => setFilter(f => ({ ...f, actor: e.target.value }))}
                    style={{
                        flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px',
                        border: '1px solid #374151', background: '#111827',
                        color: '#f3f4f6', fontSize: '0.85rem'
                    }}
                />
                <input
                    type="text"
                    placeholder="Filter by action..."
                    value={filter.action}
                    onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}
                    style={{
                        flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px',
                        border: '1px solid #374151', background: '#111827',
                        color: '#f3f4f6', fontSize: '0.85rem'
                    }}
                />
            </div>

            {/* Timeline */}
            {loading ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading audit log...</p>
            ) : logs.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>No audit events found.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {logs.map(log => (
                        <div key={log.id} style={{
                            background: '#1f2937', borderRadius: '10px', padding: '0.75rem 1rem',
                            border: '1px solid #374151', borderLeft: `3px solid ${getActionColor(log.action)}`,
                            display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem'
                        }}>
                            <span style={{ color: '#6b7280', fontSize: '0.75rem', minWidth: '140px' }}>
                                {new Date(log.createdAt).toLocaleString()}
                            </span>
                            <span style={{
                                padding: '0.15rem 0.5rem', borderRadius: '4px',
                                background: `${getActionColor(log.action)}20`,
                                color: getActionColor(log.action),
                                fontSize: '0.75rem', fontWeight: 600, minWidth: '130px'
                            }}>
                                {log.action}
                            </span>
                            <span style={{ color: '#d1d5db', fontWeight: 500 }}>{log.actor}</span>
                            <span style={{ color: '#9ca3af', flex: 1 }}>
                                {log.resource}{log.resourceId ? ` #${log.resourceId.substring(0, 8)}` : ''}
                            </span>
                            {log.apiKeyId && (
                                <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>🔑 via API key</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
