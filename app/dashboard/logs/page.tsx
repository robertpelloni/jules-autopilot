'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    ScrollText,
    RefreshCw,
    AlertCircle,
    Bot,
    Zap,
    AlertTriangle,
    Info,
    Filter,
    Clock
} from 'lucide-react';

interface KeeperLogEntry {
    id: string;
    sessionId: string | null;
    type: string;
    message: string;
    metadata: string | null;
    createdAt: string;
}

const TYPE_STYLES: Record<string, { icon: React.ElementType; color: string }> = {
    action: { icon: Zap, color: 'text-blue-400 bg-blue-500/10' },
    error: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
    info: { icon: Info, color: 'text-zinc-400 bg-zinc-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-500/10' },
};

export default function LogsDashboard() {
    const [logs, setLogs] = useState<KeeperLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/logs/keeper');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load logs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);
    const uniqueTypes = [...new Set(logs.map(l => l.type))];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                            <ScrollText className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Keeper Logs</h1>
                            <p className="text-sm text-zinc-500">Session keeper activity &amp; event history</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1">
                            <Filter className="h-3.5 w-3.5 text-zinc-500" />
                            <select
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-transparent text-sm text-zinc-300 focus:outline-none"
                            >
                                <option value="all">All Types</option>
                                {uniqueTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Stats bar */}
                {!loading && logs.length > 0 && (
                    <div className="flex items-center gap-4 mb-6 text-xs text-zinc-500">
                        <span>{filteredLogs.length} entries</span>
                        <span>•</span>
                        <span>{logs.filter(l => l.type === 'action').length} actions</span>
                        <span>•</span>
                        <span>{logs.filter(l => l.type === 'error').length} errors</span>
                    </div>
                )}

                {/* Empty */}
                {!loading && logs.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No keeper logs</p>
                        <p className="text-sm mt-1">Logs will appear when the keeper takes action</p>
                    </div>
                )}

                {/* Log entries */}
                <div className="space-y-2">
                    {filteredLogs.map(log => {
                        const style = TYPE_STYLES[log.type] || TYPE_STYLES.info;
                        const Icon = style.icon;
                        return (
                            <div
                                key={log.id}
                                className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                            >
                                <div className={`p-1.5 rounded-md ${style.color} flex-shrink-0 mt-0.5`}>
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-200">{log.message}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(log.createdAt).toLocaleString()}
                                        </span>
                                        {log.sessionId && (
                                            <span className="font-mono truncate max-w-[120px]">{log.sessionId}</span>
                                        )}
                                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 uppercase tracking-wider">{log.type}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Loading skeleton */}
                {loading && logs.length === 0 && (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
