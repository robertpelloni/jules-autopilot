'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Brain,
    Trash2,
    RefreshCw,
    FileJson,
    Clock,
    ChevronDown,
    ChevronRight,
    AlertCircle
} from 'lucide-react';

interface MemoryFile {
    filename: string;
    sessionId?: string;
    summary?: string;
    compactedAt?: string;
    totalActivities?: number;
    contextWindow?: number;
    [key: string]: unknown;
}

export default function MemoryDashboard() {
    const [memories, setMemories] = useState<MemoryFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchMemories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list' })
            });
            const data = await res.json();
            setMemories(data.memories || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load memories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMemories();
    }, [fetchMemories]);

    const handleDelete = async (filename: string) => {
        if (!confirm(`Delete memory file "${filename}"?`)) return;
        setDeleting(filename);
        try {
            await fetch(`/api/memory?filename=${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            setMemories(prev => prev.filter(m => m.filename !== filename));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/20">
                            <Brain className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Memory Bank</h1>
                            <p className="text-sm text-zinc-500">
                                Compacted session memories &amp; context snapshots
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchMemories}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Empty state */}
                {!loading && memories.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No memories stored</p>
                        <p className="text-sm mt-1">Session compaction results will appear here</p>
                    </div>
                )}

                {/* Memory list */}
                <div className="space-y-3">
                    {memories.map((memory) => {
                        const isExpanded = expandedId === memory.filename;
                        return (
                            <div
                                key={memory.filename}
                                className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
                            >
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : memory.filename)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                                        )}
                                        <FileJson className="h-4 w-4 text-violet-400 flex-shrink-0" />
                                        <span className="font-mono text-sm truncate">{memory.filename}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {memory.compactedAt && (
                                            <span className="flex items-center gap-1 text-xs text-zinc-500">
                                                <Clock className="h-3 w-3" />
                                                {new Date(memory.compactedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                        {memory.totalActivities !== undefined && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                                                {memory.totalActivities} activities
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(memory.filename);
                                            }}
                                            disabled={deleting === memory.filename}
                                            className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-zinc-800">
                                        <div className="mt-3 space-y-2">
                                            {memory.sessionId && (
                                                <div className="text-xs">
                                                    <span className="text-zinc-500">Session:</span>{' '}
                                                    <span className="font-mono text-zinc-300">{memory.sessionId}</span>
                                                </div>
                                            )}
                                            {memory.summary && (
                                                <div className="text-sm text-zinc-400 leading-relaxed">
                                                    {memory.summary}
                                                </div>
                                            )}
                                            {memory.contextWindow !== undefined && (
                                                <div className="text-xs text-zinc-500">
                                                    Context window: {memory.contextWindow.toLocaleString()} tokens
                                                </div>
                                            )}
                                            {!memory.summary && !memory.sessionId && (
                                                <pre className="text-xs text-zinc-500 bg-zinc-900 rounded p-3 overflow-x-auto max-h-48">
                                                    {JSON.stringify(memory, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Loading skeleton */}
                {loading && memories.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
