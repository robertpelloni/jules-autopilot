'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    HeartPulse,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Database,
    Server,
    Clock,
    Cpu,
    HardDrive,
    Activity
} from 'lucide-react';

interface HealthStatus {
    database: { status: string; latencyMs: number };
    daemon: { status: string; url: string };
    uptime: number;
    timestamp: string;
    metrics?: {
        totalSessions?: number;
        totalSwarms?: number;
        totalPlugins?: number;
        activeJobs?: number;
    };
}

function StatusBadge({ status }: { status: string }) {
    const isOk = status === 'connected' || status === 'healthy' || status === 'ok';
    return (
        <span className={`flex items-center gap-1 text-xs font-medium ${isOk ? 'text-green-400' : 'text-red-400'}`}>
            {isOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {status}
        </span>
    );
}

export default function HealthDashboard() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/health');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setHealth(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Health check failed');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHealth(); }, [fetchHealth]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/20">
                            <HeartPulse className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">System Health</h1>
                            <p className="text-sm text-zinc-500">Service status &amp; platform metrics</p>
                        </div>
                    </div>
                    <button onClick={fetchHealth} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {loading && !health && (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}

                {health && (
                    <div className="space-y-4">
                        {/* Services */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                                <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
                                    <Database className="h-4 w-4 text-blue-400" /> Database
                                </div>
                                <StatusBadge status={health.database.status} />
                                <p className="text-xs text-zinc-500 mt-2">{health.database.latencyMs}ms latency</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                                <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
                                    <Server className="h-4 w-4 text-violet-400" /> Daemon
                                </div>
                                <StatusBadge status={health.daemon.status} />
                                <p className="text-xs text-zinc-500 mt-2 font-mono truncate">{health.daemon.url}</p>
                            </div>
                        </div>

                        {/* Uptime */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <Cpu className="h-4 w-4 text-amber-400" /> Uptime
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-zinc-200">{formatUptime(health.uptime)}</span>
                                <p className="text-xs text-zinc-500 flex items-center gap-1 justify-end mt-1">
                                    <Clock className="h-3 w-3" />
                                    Last check: {new Date(health.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>

                        {/* Metrics */}
                        {health.metrics && (
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                                <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
                                    <Activity className="h-4 w-4 text-emerald-400" /> Platform Metrics
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { label: 'Sessions', value: health.metrics.totalSessions, icon: HardDrive },
                                        { label: 'Swarms', value: health.metrics.totalSwarms, icon: Activity },
                                        { label: 'Plugins', value: health.metrics.totalPlugins, icon: Cpu },
                                        { label: 'Active Jobs', value: health.metrics.activeJobs, icon: Clock },
                                    ].map(({ label, value, icon: Icon }) => (
                                        <div key={label} className="text-center">
                                            <Icon className="h-4 w-4 mx-auto text-zinc-600 mb-1" />
                                            <div className="text-lg font-bold text-zinc-200">{value ?? '—'}</div>
                                            <div className="text-xs text-zinc-500">{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Auto-refresh indicator */}
                        <p className="text-center text-xs text-zinc-600 mt-4">Auto-refreshes every 30 seconds</p>
                    </div>
                )}
            </div>
        </div>
    );
}
