'use client';

import { useState, useEffect, useCallback } from 'react';

interface MarketplacePlugin {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    wasmUrl: string;
    iconUrl: string | null;
    downloads: number;
    verified: boolean;
    tags: string | null;
    installedAt: string | null;
}

export default function MarketplacePage() {
    const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState<string | null>(null);

    const fetchPlugins = useCallback(async () => {
        try {
            const params = search ? `?q=${encodeURIComponent(search)}` : '';
            const res = await fetch(`/api/marketplace${params}`);
            if (res.ok) {
                const data = await res.json();
                setPlugins(data.plugins);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(fetchPlugins, 300);
        return () => clearTimeout(timer);
    }, [fetchPlugins]);

    const handleInstall = async (pluginId: string) => {
        setInstalling(pluginId);
        try {
            const res = await fetch('/api/marketplace/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pluginId })
            });
            if (res.ok) {
                await fetchPlugins();
            }
        } finally {
            setInstalling(null);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🧩 Plugin Marketplace
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                Browse, install, and manage WebAssembly plugins for the orchestrator.
            </p>

            {/* Search */}
            <input
                type="text"
                placeholder="Search plugins..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #374151',
                    background: '#111827',
                    color: '#f3f4f6',
                    fontSize: '0.95rem',
                    marginBottom: '2rem'
                }}
            />

            {/* Plugin Grid */}
            {loading ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading plugins...</p>
            ) : plugins.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <p style={{ fontSize: '1.1rem' }}>No plugins found.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        Publish a plugin via <code>POST /api/marketplace</code>
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1rem'
                }}>
                    {plugins.map(plugin => (
                        <div
                            key={plugin.id}
                            style={{
                                background: '#1f2937',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                border: '1px solid #374151',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    flexShrink: 0
                                }}>
                                    🧩
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                                            {plugin.name}
                                        </h3>
                                        {plugin.verified && (
                                            <span title="Signature Verified" style={{ fontSize: '0.8rem' }}>✅</span>
                                        )}
                                    </div>
                                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                                        by {plugin.author} · v{plugin.version}
                                    </span>
                                </div>
                            </div>

                            <p style={{ color: '#d1d5db', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                                {plugin.description.substring(0, 120)}{plugin.description.length > 120 ? '...' : ''}
                            </p>

                            {/* Tags */}
                            {plugin.tags && (
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {plugin.tags.split(',').map(tag => (
                                        <span key={tag} style={{
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '999px',
                                            background: '#374151',
                                            color: '#9ca3af',
                                            fontSize: '0.7rem'
                                        }}>
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 'auto',
                                paddingTop: '0.5rem',
                                borderTop: '1px solid #374151'
                            }}>
                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                    ⬇️ {plugin.downloads.toLocaleString()} downloads
                                </span>

                                {plugin.installedAt ? (
                                    <span style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '8px',
                                        background: '#10b98120',
                                        color: '#10b981',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>
                                        ✓ Installed
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleInstall(plugin.id)}
                                        disabled={installing === plugin.id}
                                        style={{
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: installing === plugin.id ? '#374151' : '#8b5cf6',
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: installing === plugin.id ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {installing === plugin.id ? 'Installing...' : 'Install'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
