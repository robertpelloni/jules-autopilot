'use client';

import { useState, useEffect, useCallback } from 'react';

interface McpServerLink {
    id: string;
    name: string;
    url: string | null;
    command: string | null;
    args: string | null;
    env: string | null;
    isActive: boolean;
    status: string;
    errorMsg: string | null;
    createdAt: string;
}

export default function McpLinksPage() {
    const [links, setLinks] = useState<McpServerLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [transport, setTransport] = useState<'sse' | 'stdio'>('sse');
    const [url, setUrl] = useState('');
    const [command, setCommand] = useState('');
    const [args, setArgs] = useState(''); // Comma separated for UI simplicity

    const fetchLinks = useCallback(async () => {
        try {
            const res = await fetch('/api/mcp-links');
            if (res.ok) {
                const data = await res.json();
                setLinks(data.links);
            }
        } catch { /* Silent fail */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLinks(); const iv = setInterval(fetchLinks, 10000); return () => clearInterval(iv); }, [fetchLinks]);

    const handleCreate = async () => {
        if (!name || (transport === 'sse' && !url) || (transport === 'stdio' && !command)) return;
        setCreating(true);
        try {
            const body = {
                name,
                url: transport === 'sse' ? url : undefined,
                command: transport === 'stdio' ? command : undefined,
                args: transport === 'stdio' && args ? args.split(',').map(s => s.trim()) : undefined
            };

            await fetch('/api/mcp-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            setName(''); setUrl(''); setCommand(''); setArgs('');
            await fetchLinks();
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this MCP connection?')) return;
        await fetch('/api/mcp-links', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        await fetchLinks();
    };

    const handleToggle = async (id: string, current: boolean) => {
        await fetch('/api/mcp-links', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive: !current }) });
        await fetchLinks();
    };

    const getStatusColor = (status: string, isActive: boolean) => {
        if (!isActive) return '#6b7280'; // gray
        switch (status) {
            case 'connected': return '#10b981'; // green
            case 'error': return '#ef4444'; // red
            default: return '#f59e0b'; // yellow/disconnected
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>🔌 Meta-MCP Federation</h1>
                    <p style={{ color: '#9ca3af' }}>Connect external Model Context Protocol servers to Jules.</p>
                </div>
            </div>

            {/* Create Form */}
            <div style={{
                background: '#1f2937', borderRadius: '12px', padding: '1.5rem',
                marginBottom: '2rem', border: '1px solid #374151'
            }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <input placeholder="Connection Name (e.g. PostgresDB)" value={name} onChange={e => setName(e.target.value)}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }} />
                    <select value={transport} onChange={e => setTransport(e.target.value as 'sse' | 'stdio')}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }}>
                        <option value="sse">🌐 HTTP/SSE URL</option>
                        <option value="stdio">💻 Local Process (Stdio)</option>
                    </select>
                </div>

                {transport === 'sse' ? (
                    <input placeholder="http://localhost:8080/mcp" value={url} onChange={e => setUrl(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff', marginBottom: '1rem' }} />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                        <input placeholder="Command (e.g. npx)" value={command} onChange={e => setCommand(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }} />
                        <input placeholder="Args (comma separated: -y, @modelcontextprotocol/server-postgres, postgres://...)" value={args} onChange={e => setArgs(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }} />
                    </div>
                )}

                <button onClick={handleCreate} disabled={creating || !name} style={{
                    padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
                    background: creating ? '#374151' : '#8b5cf6', color: '#fff', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer'
                }}>
                    {creating ? 'Adding...' : '🔌 Add MCP Server'}
                </button>
            </div>

            {/* List */}
            {loading ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading connections...</p> :
                links.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>No external MCP servers configured.</p> :
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {links.map(link => (
                            <div key={link.id} style={{
                                background: '#1f2937', borderRadius: '12px', padding: '1.25rem',
                                border: '1px solid #374151', opacity: link.isActive ? 1 : 0.6,
                                display: 'flex', alignItems: 'center', gap: '1rem'
                            }}>
                                <div style={{
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: getStatusColor(link.status, link.isActive),
                                    boxShadow: `0 0 8px ${getStatusColor(link.status, link.isActive)}40`
                                }} />

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{link.name}</span>
                                        <span style={{ fontSize: '0.7rem', color: '#8b5cf6', background: '#8b5cf620', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                                            {link.url ? 'SSE' : 'STDIO'}
                                        </span>
                                    </div>
                                    <code style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                        {link.url || `${link.command} ${link.args ? JSON.parse(link.args).join(' ') : ''}`}
                                    </code>
                                    {link.errorMsg && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>Error: {link.errorMsg}</p>}
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => handleToggle(link.id, link.isActive)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#d1d5db', fontSize: '0.8rem', cursor: 'pointer' }}>
                                        {link.isActive ? 'Disable' : 'Enable'}
                                    </button>
                                    <button onClick={() => handleDelete(link.id)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#7f1d1d', color: '#fca5a5', fontSize: '0.8rem', cursor: 'pointer' }}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>}
        </div>
    );
}
