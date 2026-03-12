'use client';

import { useState } from 'react';
import {
    Play,
    Pause,
    SkipForward,
    Rewind,
    Clock,
    Terminal,
    AlertCircle,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';

interface TimelineEvent {
    id: string;
    sequence: number;
    eventType: string;
    content: string;
    timestamp: string;
    relativeMs: number;
}

interface ReplayData {
    sessionId: string;
    totalEvents: number;
    totalDurationMs: number;
    timeline: TimelineEvent[];
}

const EVENT_COLORS: Record<string, string> = {
    error: 'border-red-800/50 bg-red-500/5',
    complete: 'border-emerald-800/50 bg-emerald-500/5',
    done: 'border-emerald-800/50 bg-emerald-500/5',
    start: 'border-blue-800/50 bg-blue-500/5',
    default: 'border-zinc-800 bg-zinc-900/30'
};

export default function SessionReplay() {
    const [sessionId, setSessionId] = useState('');
    const [replay, setReplay] = useState<ReplayData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [playing, setPlaying] = useState(false);

    const loadReplay = async () => {
        if (!sessionId.trim()) return;
        setLoading(true);
        setError(null);
        setReplay(null);
        setCurrentIdx(0);
        setPlaying(false);

        try {
            const res = await fetch(`/api/sessions/${sessionId}/replay`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            setReplay(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load replay');
        } finally {
            setLoading(false);
        }
    };

    const togglePlay = () => {
        if (!replay) return;
        if (currentIdx >= replay.timeline.length - 1) {
            setCurrentIdx(0);
        }
        setPlaying(!playing);
    };

    // Auto-advance when playing
    if (playing && replay && currentIdx < replay.timeline.length - 1) {
        const nextEvent = replay.timeline[currentIdx + 1];
        const currentEvent = replay.timeline[currentIdx];
        if (nextEvent && currentEvent) {
            const delay = Math.min(nextEvent.relativeMs - currentEvent.relativeMs, 2000);
            setTimeout(() => setCurrentIdx(prev => prev + 1), Math.max(delay / 10, 100));
        }
    } else if (playing && replay && currentIdx >= replay.timeline.length - 1) {
        // Reached end
        setTimeout(() => setPlaying(false), 0);
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-pink-600 to-rose-700">
                        <Terminal className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Session Replay</h1>
                        <p className="text-xs text-zinc-500">Step-through playback of agent session timelines</p>
                    </div>
                </div>

                {/* Session ID Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={sessionId}
                        onChange={e => setSessionId(e.target.value)}
                        placeholder="Enter session ID..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none"
                        onKeyDown={e => e.key === 'Enter' && loadReplay()}
                    />
                    <button
                        onClick={loadReplay}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Load'}
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-3 flex items-center gap-2 text-sm text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Replay Controls + Timeline */}
                {replay && (
                    <div className="space-y-4">
                        {/* Controls */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                                    <Rewind className="h-4 w-4 text-zinc-400" />
                                </button>
                                <button onClick={togglePlay}
                                    className="p-2 rounded-lg bg-pink-600 hover:bg-pink-500 transition-colors">
                                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </button>
                                <button onClick={() => setCurrentIdx(Math.min(replay.timeline.length - 1, currentIdx + 1))}
                                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                                    <SkipForward className="h-4 w-4 text-zinc-400" />
                                </button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span className="font-mono">{currentIdx + 1} / {replay.totalEvents}</span>
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {(replay.totalDurationMs / 1000).toFixed(1)}s
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
                                style={{ width: `${((currentIdx + 1) / replay.totalEvents) * 100}%` }}
                            />
                        </div>

                        {/* Timeline Events */}
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {replay.timeline.map((event, idx) => {
                                const color = EVENT_COLORS[event.eventType] || EVENT_COLORS.default;
                                const isCurrent = idx === currentIdx;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => { setCurrentIdx(idx); setPlaying(false); }}
                                        className={`rounded-lg border p-3 cursor-pointer transition-all ${color} ${isCurrent ? 'ring-1 ring-pink-500 scale-[1.01]' : 'opacity-60 hover:opacity-80'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-zinc-600">#{event.sequence}</span>
                                                <span className="text-xs font-mono text-zinc-400">{event.eventType}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-600">{(event.relativeMs / 1000).toFixed(1)}s</span>
                                        </div>
                                        {isCurrent && (
                                            <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap break-all line-clamp-6">
                                                {event.content}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
