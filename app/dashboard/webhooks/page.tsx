'use client';

import { useState, useEffect, useCallback } from 'react';

interface WebhookRouteInfo {
    id: string;
    name: string;
    source: string;
    matchPath: string;
    matchValue: string;
    actionType: string;
    actionConfig: string;
    isActive: boolean;
    hitCount: number;
    lastTriggeredAt: string | null;
    createdAt: string;
}

export default function WebhooksPage() {
    const [routes, setRoutes] = useState<WebhookRouteInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', source: 'github', matchPath: '', matchValue: '', actionType: 'session', prompt: '' });

    const fetchRoutes = useCallback(async () => {
        try {
            const res = await fetch('/api/webhooks/router');
            if (res.ok) { const data = await res.json(); setRoutes(data.routes); }
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

    const handleCreate = async () => {
        if (!form.name || !form.matchPath || !form.matchValue) return;
        setCreating(true);
        try {
            await fetch('/api/webhooks/router?action=create', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, actionConfig: { prompt: form.prompt || undefined } })
            });
            setForm({ name: '', source: 'github', matchPath: '', matchValue: '', actionType: 'session', prompt: '' });
            await fetchRoutes();
        } finally { setCreating(false); }
    };

    const handleDeactivate = async (routeId: string) => {
        await fetch('/api/webhooks/router', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routeId }) });
        await fetchRoutes();
    };

    const sourceIcons: Record<string, string> = { github: '🐙', slack: '💬', linear: '📐', jira: '📋', custom: '🔗' };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>🔀 Webhook Router</h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>Map inbound service events to orchestrator actions with JSON path matching.</p>

            <div style={{ background: '#1f2937', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #374151' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>New Route</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input placeholder="Route name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem' }} />
                    <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem' }}>
                        <option value="github">🐙 GitHub</option><option value="slack">💬 Slack</option><option value="linear">📐 Linear</option><option value="jira">📋 Jira</option><option value="custom">🔗 Custom</option>
                    </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input placeholder="$.event.type" value={form.matchPath} onChange={e => setForm(f => ({ ...f, matchPath: e.target.value }))} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem', fontFamily: 'monospace' }} />
                    <input placeholder="issue.created" value={form.matchValue} onChange={e => setForm(f => ({ ...f, matchValue: e.target.value }))} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem' }} />
                    <select value={form.actionType} onChange={e => setForm(f => ({ ...f, actionType: e.target.value }))} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem' }}>
                        <option value="session">🤖 Session</option><option value="swarm">🐝 Swarm</option><option value="ci_check">🔧 CI Check</option>
                    </select>
                </div>
                <button onClick={handleCreate} disabled={creating || !form.name || !form.matchPath || !form.matchValue} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: creating ? '#374151' : '#8b5cf6', color: '#fff', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer' }}>
                    {creating ? 'Creating...' : '🔀 Create Route'}
                </button>
            </div>

            {loading ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading routes...</p> :
                routes.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>No webhook routes configured.</p> :
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {routes.map(route => (
                            <div key={route.id} style={{ background: '#1f2937', borderRadius: '12px', padding: '1.25rem', border: '1px solid #374151', opacity: route.isActive ? 1 : 0.5 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span>{sourceIcons[route.source] || '🔗'}</span>
                                        <span style={{ fontWeight: 600 }}>{route.name}</span>
                                        <code style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#374151', fontSize: '0.7rem', color: '#8b5cf6' }}>{route.matchPath} = {route.matchValue}</code>
                                    </div>
                                    {route.isActive && <button onClick={() => handleDeactivate(route.id)} style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none', background: '#7f1d1d', color: '#fca5a5', fontSize: '0.8rem', cursor: 'pointer' }}>Deactivate</button>}
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                    <span>→ {route.actionType}</span>
                                    <span>{route.hitCount} hits</span>
                                    {route.lastTriggeredAt && <span>Last: {new Date(route.lastTriggeredAt).toLocaleString()}</span>}
                                </div>
                            </div>
                        ))}
                    </div>}
        </div>
    );
}
