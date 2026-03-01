'use client';

import { useState, useEffect, useCallback } from 'react';

interface SwarmTask {
    id: string;
    title: string;
    status: string;
    sessionId: string | null;
    result: string | null;
    prompt: string;
}

interface Swarm {
    id: string;
    name: string;
    prompt: string;
    status: string;
    totalTasks: number;
    doneTasks: number;
    result: string | null;
    createdAt: string;
    tasks: SwarmTask[];
}

export default function SwarmPage() {
    const [swarms, setSwarms] = useState<Swarm[]>([]);
    const [newPrompt, setNewPrompt] = useState('');
    const [newName, setNewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchSwarms = useCallback(async () => {
        try {
            const res = await fetch('/api/swarm');
            if (res.ok) {
                const data = await res.json();
                setSwarms(data.swarms);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSwarms();
        const interval = setInterval(fetchSwarms, 5000);
        return () => clearInterval(interval);
    }, [fetchSwarms]);

    const handleCreate = async () => {
        if (!newPrompt.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/swarm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName || undefined, prompt: newPrompt })
            });
            if (res.ok) {
                setNewPrompt('');
                setNewName('');
                await fetchSwarms();
            }
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'running':
            case 'dispatched': return '#f59e0b';
            case 'failed': return '#ef4444';
            case 'decomposing': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return '✅';
            case 'running': return '🔄';
            case 'dispatched': return '🚀';
            case 'failed': return '❌';
            case 'decomposing': return '🧠';
            case 'pending': return '⏳';
            default: return '•';
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🐝 Agent Swarm Orchestrator
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                Decompose complex tasks into parallel sub-tasks executed by autonomous AI agents.
            </p>

            {/* Create New Swarm */}
            <div style={{
                background: '#1f2937',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid #374151'
            }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Launch New Swarm
                </h2>
                <input
                    type="text"
                    placeholder="Swarm name (optional)"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #374151',
                        background: '#111827',
                        color: '#f3f4f6',
                        marginBottom: '0.75rem',
                        fontSize: '0.9rem'
                    }}
                />
                <textarea
                    placeholder="Describe the high-level task to decompose..."
                    value={newPrompt}
                    onChange={e => setNewPrompt(e.target.value)}
                    rows={3}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #374151',
                        background: '#111827',
                        color: '#f3f4f6',
                        marginBottom: '0.75rem',
                        fontSize: '0.9rem',
                        resize: 'vertical'
                    }}
                />
                <button
                    onClick={handleCreate}
                    disabled={isCreating || !newPrompt.trim()}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: isCreating ? '#374151' : '#8b5cf6',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: isCreating ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    {isCreating ? 'Decomposing...' : '🚀 Launch Swarm'}
                </button>
            </div>

            {/* Swarm List */}
            {loading ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading swarms...</p>
            ) : swarms.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>No swarms created yet.</p>
            ) : (
                swarms.map(swarm => (
                    <div
                        key={swarm.id}
                        style={{
                            background: '#1f2937',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            border: '1px solid #374151'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                {getStatusIcon(swarm.status)} {swarm.name}
                            </h3>
                            <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: `${getStatusColor(swarm.status)}20`,
                                color: getStatusColor(swarm.status),
                                textTransform: 'uppercase'
                            }}>
                                {swarm.status}
                            </span>
                        </div>

                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                            {swarm.prompt.substring(0, 200)}{swarm.prompt.length > 200 ? '...' : ''}
                        </p>

                        {/* Progress bar */}
                        {swarm.totalTasks > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                                    <span>Progress</span>
                                    <span>{swarm.doneTasks}/{swarm.totalTasks} tasks</span>
                                </div>
                                <div style={{ height: '6px', background: '#374151', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(swarm.doneTasks / swarm.totalTasks) * 100}%`,
                                        background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                                        borderRadius: '3px',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        )}

                        {/* Sub-tasks */}
                        {swarm.tasks.length > 0 && (
                            <div style={{ borderTop: '1px solid #374151', paddingTop: '0.75rem' }}>
                                {swarm.tasks.map(task => (
                                    <div
                                        key={task.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.5rem 0',
                                            borderBottom: '1px solid #1f293780',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <span>{getStatusIcon(task.status)}</span>
                                        <span style={{ flex: 1, color: '#e5e7eb' }}>{task.title}</span>
                                        {task.sessionId && (
                                            <span style={{ color: '#6b7280', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                {task.sessionId.substring(0, 8)}
                                            </span>
                                        )}
                                        <span style={{
                                            color: getStatusColor(task.status),
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            {task.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
