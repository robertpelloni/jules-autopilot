'use client';

import { useState, useEffect, useCallback } from 'react';

interface AgentPersona {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    temperature: number;
    allowedTools: string;
    isDefault: boolean;
    createdAt: string;
}

export default function PersonasPage() {
    const [personas, setPersonas] = useState<AgentPersona[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [temperature, setTemperature] = useState<number>(0.7);
    const [isDefault, setIsDefault] = useState(false);

    const fetchPersonas = useCallback(async () => {
        try {
            const res = await fetch('/api/personas');
            if (res.ok) {
                const data = await res.json();
                setPersonas(data.personas);
            }
        } catch { /* Silent fail */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

    const handleCreate = async () => {
        if (!name || !description || !systemPrompt) return;
        setCreating(true);
        try {
            await fetch('/api/personas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, description, systemPrompt, temperature, isDefault, allowedTools: ['*']
                })
            });
            setName(''); setDescription(''); setSystemPrompt(''); setTemperature(0.7); setIsDefault(false);
            await fetchPersonas();
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, def: boolean) => {
        if (def) { alert("Cannot delete the default persona."); return; }
        if (!confirm("Delete this persona?")) return;

        await fetch('/api/personas', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        await fetchPersonas();
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>🧑‍💻 Agent Personas</h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                Define specialized AI archetypes with custom instructions, temperatures, and tool permissions.
            </p>

            {/* Create Form */}
            <div style={{
                background: '#1f2937', borderRadius: '12px', padding: '1.5rem',
                marginBottom: '2rem', border: '1px solid #374151'
            }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Create New Persona</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input placeholder="Name (e.g. Senior Architect)" value={name} onChange={e => setName(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }} />
                        <input placeholder="Short Description" value={description} onChange={e => setDescription(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#111827', padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151' }}>
                            <label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Temperature ({temperature})</label>
                            <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} style={{ flex: 1 }} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#d1d5db', cursor: 'pointer' }}>
                            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                            Set as default persona
                        </label>
                    </div>
                    <textarea
                        placeholder="System Prompt (Define the agent's behavior, specialization, boundaries, etc.)"
                        value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', resize: 'vertical', minHeight: '150px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                </div>
                <button onClick={handleCreate} disabled={creating || !name || !systemPrompt} style={{
                    padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
                    background: creating ? '#374151' : '#8b5cf6', color: '#fff', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer'
                }}>
                    {creating ? 'Creating...' : '+ Create Persona'}
                </button>
            </div>

            {/* Persona List */}
            {loading ? <p style={{ color: '#9ca3af' }}>Loading personas...</p> :
                personas.length === 0 ? <p style={{ color: '#9ca3af' }}>No personas configured.</p> :
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {personas.map(p => (
                            <div key={p.id} style={{ background: '#1f2937', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${p.isDefault ? '#8b5cf6' : '#374151'}`, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {p.name} {p.isDefault && <span style={{ background: '#8b5cf640', color: '#a78bfa', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>DEFAULT</span>}
                                        </h3>
                                        <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{p.description}</p>
                                    </div>
                                    <button onClick={() => handleDelete(p.id, p.isDefault)} style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: p.isDefault ? 'not-allowed' : 'pointer' }}>🗑</button>
                                </div>

                                <div style={{ background: '#111827', padding: '0.75rem', borderRadius: '8px', flex: 1, overflowY: 'auto', maxHeight: '120px' }}>
                                    <code style={{ fontSize: '0.75rem', color: '#d1d5db', whiteSpace: 'pre-wrap' }}>
                                        {p.systemPrompt}
                                    </code>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.75rem', borderTop: '1px solid #374151', paddingTop: '0.75rem' }}>
                                    <span>Temp: {p.temperature}</span>
                                    <span>Tools: {JSON.parse(p.allowedTools).join(', ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>}
        </div>
    );
}
