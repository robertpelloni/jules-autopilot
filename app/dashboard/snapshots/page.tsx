'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Film,
    RefreshCw,
    AlertCircle,
    Play,
    User,
    Bot,
    Clock,
    ChevronLeft,
    ChevronRight,
    Search
} from 'lucide-react';

interface SnapshotEvent {
    id: string;
    sessionId: string;
    sequence: number;
    eventType: string;
    actor: string;
    content: string;
    metadata: string | null;
    timestamp: string;
}

const ACTOR_ICON: Record<string, { icon: React.ElementType; color: string }> = {
    user: { icon: User, color: 'text-blue-400 bg-blue-500/10' },
    assistant: { icon: Bot, color: 'text-violet-400 bg-violet-500/10' },
    system: { icon: Play, color: 'text-zinc-400 bg-zinc-500/10' },
};

export default function ReplayDashboard() {
    const [sessionId, setSessionId] = useState('');
    const [events, setEvents] = useState<SnapshotEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const perPage = 50;

    const fetchReplay = useCallback(async () => {
        if (!sessionId.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/snapshots?sessionId=${encodeURIComponent(sessionId)}&skip=${page * perPage}&take=${perPage}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setEvents(data.events || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [sessionId, page]);

    useEffect(() => {
        if (sessionId.trim()) fetchReplay();
    }, [fetchReplay, sessionId, page]);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-rose-500/20">
                        <Film className="h-6 w-6 text-rose-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Session Replay</h1>
                        <p className="text-sm text-zinc-500">Browse session activity snapshots</p>
                    </div>
                </div>

                {/* Search */}
                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                            value={sessionId}
                            onChange={e => { setSessionId(e.target.value); setPage(0); }}
                            placeholder="Enter session ID..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                    </div>
                    <button
                        onClick={fetchReplay}
                        disabled={loading || !sessionId.trim()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Load
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Empty */}
                {!loading && events.length === 0 && sessionId.trim() && (
                    <div className="text-center py-12 text-zinc-500">
                        <Film className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No events found for this session</p>
                    </div>
                )}

                {/* Timeline */}
                {events.length > 0 && (
                    <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-800" />
                        <div className="space-y-1">
                            {events.map(event => {
                                const style = ACTOR_ICON[event.actor] || ACTOR_ICON.system;
                                const ActorIcon = style.icon;
                                return (
                                    <div key={event.id} className="relative flex gap-3 pl-3">
                                        <div className={`relative z-10 p-1.5 rounded-full ${style.color} flex-shrink-0 mt-1`}>
                                            <ActorIcon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                                <span className="font-medium capitalize">{event.actor}</span>
                                                <span>·</span>
                                                <span className="px-1.5 py-0.5 rounded bg-zinc-800">{event.eventType}</span>
                                                <span>·</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span className="font-mono text-zinc-600">#{event.sequence}</span>
                                            </div>
                                            <div className="text-sm text-zinc-300 bg-zinc-900/80 rounded-lg p-3 border border-zinc-800/50 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                                                {event.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {events.length > 0 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4" /> Prev
                        </button>
                        <span className="text-xs text-zinc-500">Page {page + 1}</span>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={events.length < perPage}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-30"
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="space-y-2 mt-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
