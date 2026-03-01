'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface TimelineStep {
    id: string;
    sequence: number;
    eventType: string;
    actor: string;
    content: string;
    metadata: Record<string, unknown> | null;
    timestamp: string;
}

interface ReplayData {
    sessionId: string;
    totalSteps: number;
    startTime: string;
    endTime: string;
    timeline: TimelineStep[];
}

export default function ReplayPage() {
    const params = useParams();
    const sessionId = params.id as string;
    const [data, setData] = useState<ReplayData | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [playing, setPlaying] = useState(false);

    const fetchReplay = useCallback(async () => {
        const res = await fetch(`/api/sessions/${sessionId}/replay`);
        if (res.ok) setData(await res.json());
    }, [sessionId]);

    useEffect(() => { fetchReplay(); }, [fetchReplay]);

    // Auto-play timer
    useEffect(() => {
        if (!playing || !data) return;
        if (currentStep >= data.totalSteps - 1) {
            setPlaying(false);
            return;
        }
        const timer = setTimeout(() => setCurrentStep(s => s + 1), 1500);
        return () => clearTimeout(timer);
    }, [playing, currentStep, data]);

    const eventIcons: Record<string, string> = {
        message: '💬',
        plan_approval: '✅',
        status_change: '🔄',
        nudge: '👆',
        error: '❌',
        tool_call: '🔧'
    };

    if (!data) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading replay...</div>;
    }

    const step = data.timeline[currentStep];

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                ⏪ Session Replay
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                Session <code style={{ color: '#8b5cf6' }}>{sessionId.substring(0, 12)}...</code> • {data.totalSteps} steps
            </p>

            {/* Playback controls */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: '#1f2937', borderRadius: '12px', padding: '1rem 1.5rem',
                marginBottom: '1.5rem', border: '1px solid #374151'
            }}>
                <button onClick={() => setCurrentStep(0)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}>⏮</button>
                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}>⏪</button>
                <button onClick={() => setPlaying(!playing)} style={{
                    background: playing ? '#ef4444' : '#8b5cf6', border: 'none', color: '#fff',
                    padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                }}>
                    {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={() => setCurrentStep(s => Math.min(data.totalSteps - 1, s + 1))} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}>⏩</button>
                <button onClick={() => setCurrentStep(data.totalSteps - 1)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}>⏭</button>

                <div style={{ flex: 1 }} />
                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    Step {currentStep + 1} / {data.totalSteps}
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '4px', background: '#374151', borderRadius: '2px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${((currentStep + 1) / data.totalSteps) * 100}%`,
                    background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: '2px',
                    transition: 'width 0.3s ease'
                }} />
            </div>

            {/* Current Step */}
            {step && (
                <div style={{
                    background: '#1f2937', borderRadius: '12px', padding: '1.5rem',
                    border: '1px solid #374151', marginBottom: '1.5rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                            {eventIcons[step.eventType] || '•'} {step.eventType}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                            {new Date(step.timestamp).toLocaleTimeString()} • by {step.actor}
                        </span>
                    </div>
                    <div style={{
                        background: '#111827', borderRadius: '8px', padding: '1rem',
                        color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto'
                    }}>
                        {step.content}
                    </div>
                </div>
            )}

            {/* Mini timeline */}
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                {data.timeline.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => setCurrentStep(i)}
                        title={`${s.eventType} by ${s.actor}`}
                        style={{
                            width: '8px', height: '20px', borderRadius: '2px',
                            border: 'none', cursor: 'pointer',
                            background: i === currentStep ? '#8b5cf6' : i < currentStep ? '#374151' : '#1f2937',
                            opacity: i === currentStep ? 1 : 0.7
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
