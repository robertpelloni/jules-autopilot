'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScheduledJob {
    id: string;
    name: string;
    cronExpr: string;
    timezone: string;
    jobType: string;
    jobConfig: string;
    isActive: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
    runCount: number;
    createdAt: string;
}

export default function SchedulesPage() {
    const [jobs, setJobs] = useState<ScheduledJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', cronExpr: '', jobType: 'session', prompt: '' });

    const fetchJobs = useCallback(async () => {
        try {
            const res = await fetch('/api/schedules');
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 15000);
        return () => clearInterval(interval);
    }, [fetchJobs]);

    const handleCreate = async () => {
        if (!form.name || !form.cronExpr) return;
        setCreating(true);
        try {
            await fetch('/api/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    cronExpr: form.cronExpr,
                    jobType: form.jobType,
                    jobConfig: { prompt: form.prompt || undefined }
                })
            });
            setForm({ name: '', cronExpr: '', jobType: 'session', prompt: '' });
            await fetchJobs();
        } finally {
            setCreating(false);
        }
    };

    const handleDeactivate = async (jobId: string) => {
        await fetch('/api/schedules', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId })
        });
        await fetchJobs();
    };

    const typeIcons: Record<string, string> = {
        session: '🤖',
        swarm: '🐝',
        ci_check: '🔧'
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                ⏰ Scheduled Automation
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                Configure recurring tasks with cron expressions.
            </p>

            {/* Create form */}
            <div style={{
                background: '#1f2937', borderRadius: '12px', padding: '1.5rem',
                marginBottom: '2rem', border: '1px solid #374151'
            }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>New Schedule</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input
                        type="text" placeholder="Job name" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem' }}
                    />
                    <input
                        type="text" placeholder="Cron expression (e.g. 0 */6 * * *)" value={form.cronExpr}
                        onChange={e => setForm(f => ({ ...f, cronExpr: e.target.value }))}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <select
                        value={form.jobType}
                        onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}
                        style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem' }}
                    >
                        <option value="session">🤖 Session</option>
                        <option value="swarm">🐝 Swarm</option>
                        <option value="ci_check">🔧 CI Check</option>
                    </select>
                    <input
                        type="text" placeholder="Prompt / config (optional)" value={form.prompt}
                        onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                        style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', fontSize: '0.85rem' }}
                    />
                </div>
                <button
                    onClick={handleCreate} disabled={creating || !form.name || !form.cronExpr}
                    style={{
                        padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
                        background: creating ? '#374151' : '#8b5cf6', color: '#fff',
                        fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer'
                    }}
                >
                    {creating ? 'Creating...' : '⏰ Create Schedule'}
                </button>
            </div>

            {/* Job list */}
            {loading ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading schedules...</p>
            ) : jobs.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>No scheduled jobs yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {jobs.map(job => (
                        <div key={job.id} style={{
                            background: '#1f2937', borderRadius: '12px', padding: '1.25rem',
                            border: '1px solid #374151', opacity: job.isActive ? 1 : 0.5
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{typeIcons[job.jobType] || '•'}</span>
                                    <span style={{ fontWeight: 600 }}>{job.name}</span>
                                    <code style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#374151', fontSize: '0.75rem', color: '#8b5cf6', fontFamily: 'monospace' }}>
                                        {job.cronExpr}
                                    </code>
                                    {!job.isActive && (
                                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>INACTIVE</span>
                                    )}
                                </div>
                                {job.isActive && (
                                    <button
                                        onClick={() => handleDeactivate(job.id)}
                                        style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none', background: '#7f1d1d', color: '#fca5a5', fontSize: '0.8rem', cursor: 'pointer' }}
                                    >
                                        Deactivate
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                                <span>{job.runCount} runs</span>
                                <span>TZ: {job.timezone}</span>
                                {job.nextRunAt && <span>Next: {new Date(job.nextRunAt).toLocaleString()}</span>}
                                {job.lastRunAt && <span>Last: {new Date(job.lastRunAt).toLocaleString()}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
