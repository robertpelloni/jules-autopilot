'use client';

import { useState, useEffect, useCallback } from 'react';

interface ApiKeyInfo {
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string;
    rateLimit: number;
    quotaCents: number | null;
    usedCents: number;
    requestCount: number;
    lastUsedAt: string | null;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
    const [newName, setNewName] = useState('');
    const [newKey, setNewKey] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchKeys = useCallback(async () => {
        try {
            const res = await fetch('/api/keys');
            if (res.ok) {
                const data = await res.json();
                setKeys(data.keys);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchKeys(); }, [fetchKeys]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (res.ok) {
                const data = await res.json();
                setNewKey(data.key.rawKey);
                setNewName('');
                await fetchKeys();
            }
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (keyId: string) => {
        await fetch('/api/keys', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyId })
        });
        await fetchKeys();
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🔑 API Keys
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                Generate scoped API keys for team members with rate limiting and usage tracking.
            </p>

            {/* Create Key */}
            <div style={{
                background: '#1f2937', borderRadius: '12px', padding: '1.5rem',
                marginBottom: '1.5rem', border: '1px solid #374151',
                display: 'flex', gap: '0.75rem', alignItems: 'center'
            }}>
                <input
                    type="text"
                    placeholder="Key name (e.g. CI Pipeline)"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    style={{
                        flex: 1, padding: '0.75rem', borderRadius: '8px',
                        border: '1px solid #374151', background: '#111827',
                        color: '#f3f4f6', fontSize: '0.9rem'
                    }}
                />
                <button
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    style={{
                        padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none',
                        background: creating ? '#374151' : '#8b5cf6', color: '#fff',
                        fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer'
                    }}
                >
                    {creating ? 'Creating...' : 'Generate Key'}
                </button>
            </div>

            {/* New Key Alert */}
            {newKey && (
                <div style={{
                    background: '#064e3b', borderRadius: '12px', padding: '1rem 1.5rem',
                    marginBottom: '1.5rem', border: '1px solid #10b981'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#6ee7b7' }}>
                        ⚠️ Save this key — it won&#39;t be shown again!
                    </div>
                    <code style={{
                        display: 'block', padding: '0.5rem', background: '#111827',
                        borderRadius: '6px', fontSize: '0.85rem', wordBreak: 'break-all',
                        color: '#f3f4f6'
                    }}>
                        {newKey}
                    </code>
                    <button
                        onClick={() => setNewKey(null)}
                        style={{
                            marginTop: '0.75rem', padding: '0.4rem 1rem', borderRadius: '6px',
                            border: 'none', background: '#374151', color: '#9ca3af',
                            fontSize: '0.8rem', cursor: 'pointer'
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Key List */}
            {loading ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading keys...</p>
            ) : keys.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>No API keys created yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {keys.map(key => (
                        <div
                            key={key.id}
                            style={{
                                background: '#1f2937', borderRadius: '12px', padding: '1.25rem',
                                border: '1px solid #374151', opacity: key.isActive ? 1 : 0.5
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontWeight: 600 }}>{key.name}</span>
                                    <code style={{
                                        padding: '0.15rem 0.5rem', borderRadius: '4px',
                                        background: '#374151', fontSize: '0.75rem', color: '#9ca3af'
                                    }}>
                                        {key.keyPrefix}...
                                    </code>
                                    {!key.isActive && (
                                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>REVOKED</span>
                                    )}
                                </div>
                                {key.isActive && (
                                    <button
                                        onClick={() => handleRevoke(key.id)}
                                        style={{
                                            padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none',
                                            background: '#7f1d1d', color: '#fca5a5', fontSize: '0.8rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                <span>{key.requestCount.toLocaleString()} requests</span>
                                <span>${(key.usedCents / 100).toFixed(2)} used</span>
                                {key.quotaCents && <span>${(key.quotaCents / 100).toFixed(2)} quota</span>}
                                <span>{key.rateLimit} req/min</span>
                                {key.lastUsedAt && <span>Last: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
