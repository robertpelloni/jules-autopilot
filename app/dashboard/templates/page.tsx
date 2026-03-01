'use client';

import { useState, useEffect, useCallback } from 'react';

interface TemplateInfo {
    id: string; name: string; description: string | null; prompt: string;
    tags: string[]; isFavorite: boolean; createdAt: string;
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<TemplateInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [launching, setLaunching] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        try {
            const res = await fetch('/api/templates');
            if (res.ok) setTemplates(await res.json());
        } catch { /* */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleLaunch = async (template: TemplateInfo) => {
        setLaunching(template.id);
        try {
            const daemonUrl = '/api/sessions';
            await fetch(daemonUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: template.prompt, templateName: template.name })
            });
        } finally { setLaunching(null); }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>📋 Session Templates</h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Launch pre-configured sessions with one click.</p>

            {loading ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading templates...</p> :
                templates.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>No templates found.</p> :
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {templates.map(t => (
                            <div key={t.id} style={{ background: '#1f2937', borderRadius: '12px', padding: '1.25rem', border: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>
                                        {t.isFavorite ? '⭐' : '📄'} {t.name}
                                    </h3>
                                </div>
                                {t.description && <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>{t.description}</p>}
                                <p style={{ color: '#d1d5db', fontSize: '0.8rem', background: '#111827', padding: '0.5rem', borderRadius: '6px', margin: 0 }}>
                                    {t.prompt.substring(0, 100)}{t.prompt.length > 100 ? '...' : ''}
                                </p>
                                {t.tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                        {t.tags.map(tag => <span key={tag} style={{ padding: '0.1rem 0.4rem', borderRadius: '999px', background: '#374151', color: '#9ca3af', fontSize: '0.7rem' }}>{tag}</span>)}
                                    </div>
                                )}
                                <button onClick={() => handleLaunch(t)} disabled={launching === t.id} style={{
                                    marginTop: 'auto', padding: '0.6rem', borderRadius: '8px', border: 'none',
                                    background: launching === t.id ? '#374151' : '#10b981', color: '#fff',
                                    fontWeight: 600, cursor: launching === t.id ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
                                }}>
                                    {launching === t.id ? 'Launching...' : '🚀 Launch Session'}
                                </button>
                            </div>
                        ))}
                    </div>}
        </div>
    );
}
