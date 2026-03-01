'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    BarChart3,
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    GitBranch,
    Bot,
    RefreshCw,
    Zap
} from 'lucide-react';

interface AnalyticsData {
    stats: {
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        failedSessions: number;
        stalledSessions: number;
        successRate: number;
        avgDuration: number;
    };
    timelineData: { date: string; count: number }[];
    repoData: { name: string; value: number }[];
    keeperStats: {
        totalApprovals: number;
        totalNudges: number;
        totalDebates: number;
    };
    llmCosts: {
        totalSpend: number;
        totalPromptTokens: number;
        totalCompletionTokens: number;
        totalCalls: number;
        providerBreakdown: { provider: string; cost: number; calls: number }[];
        dailySpend: { date: string; cost: number }[];
    };
}

function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    color
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    color: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
            </div>
            <div className="text-2xl font-bold text-zinc-100">{value}</div>
            {subValue && <div className="text-xs text-zinc-500">{subValue}</div>}
        </div>
    );
}

function SimpleBar({ label, value, max }: { label: string; value: number; max: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-28 truncate" title={label}>{label}</span>
            <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-mono text-zinc-400 w-8 text-right">{value}</span>
        </div>
    );
}

export default function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(30);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/analytics?days=${days}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/20">
                            <BarChart3 className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Analytics</h1>
                            <p className="text-sm text-zinc-500">Session performance, costs &amp; keeper activity</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={90}>90 days</option>
                        </select>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {loading && !data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
                        ))}
                    </div>
                )}

                {data && (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                icon={Activity}
                                label="Total Sessions"
                                value={data.stats.totalSessions}
                                subValue={`${data.stats.activeSessions} active`}
                                color="text-blue-400"
                            />
                            <StatCard
                                icon={CheckCircle2}
                                label="Success Rate"
                                value={`${data.stats.successRate}%`}
                                subValue={`${data.stats.completedSessions} completed`}
                                color="text-green-400"
                            />
                            <StatCard
                                icon={Clock}
                                label="Avg Duration"
                                value={`${data.stats.avgDuration}m`}
                                subValue={`${data.stats.stalledSessions} stalled`}
                                color="text-yellow-400"
                            />
                            <StatCard
                                icon={DollarSign}
                                label="LLM Spend"
                                value={`$${data.llmCosts.totalSpend.toFixed(2)}`}
                                subValue={`${data.llmCosts.totalCalls} calls`}
                                color="text-emerald-400"
                            />
                        </div>

                        {/* Two Column Layout */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {/* Top Repositories */}
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                                <div className="flex items-center gap-2 mb-4 text-sm font-medium text-zinc-400">
                                    <GitBranch className="h-4 w-4" />
                                    Top Repositories
                                </div>
                                <div className="space-y-3">
                                    {data.repoData.length === 0 && (
                                        <p className="text-xs text-zinc-600">No repo data</p>
                                    )}
                                    {data.repoData.map(repo => (
                                        <SimpleBar
                                            key={repo.name}
                                            label={repo.name}
                                            value={repo.value}
                                            max={data.repoData[0]?.value || 1}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Cost by Provider */}
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                                <div className="flex items-center gap-2 mb-4 text-sm font-medium text-zinc-400">
                                    <TrendingUp className="h-4 w-4" />
                                    Cost by Provider
                                </div>
                                <div className="space-y-3">
                                    {data.llmCosts.providerBreakdown.length === 0 && (
                                        <p className="text-xs text-zinc-600">No cost data</p>
                                    )}
                                    {data.llmCosts.providerBreakdown.map(p => (
                                        <div key={p.provider} className="flex items-center justify-between text-sm">
                                            <span className="text-zinc-300 capitalize">{p.provider}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-zinc-500">{p.calls} calls</span>
                                                <span className="font-mono text-emerald-400">${p.cost.toFixed(4)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Keeper Stats */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mb-8">
                            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-zinc-400">
                                <Bot className="h-4 w-4" />
                                Keeper Activity
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-400">{data.keeperStats.totalApprovals}</div>
                                    <div className="text-xs text-zinc-500 mt-1">Auto-Approvals</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-400">{data.keeperStats.totalNudges}</div>
                                    <div className="text-xs text-zinc-500 mt-1">Nudges</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-violet-400">{data.keeperStats.totalDebates}</div>
                                    <div className="text-xs text-zinc-500 mt-1">Debates</div>
                                </div>
                            </div>
                        </div>

                        {/* Session Timeline */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-zinc-400">
                                <Zap className="h-4 w-4" />
                                Sessions Over Time
                            </div>
                            {data.timelineData.length === 0 ? (
                                <p className="text-xs text-zinc-600">No timeline data</p>
                            ) : (
                                <div className="flex items-end gap-1 h-32">
                                    {data.timelineData.map((d, i) => {
                                        const maxCount = Math.max(...data.timelineData.map(t => t.count), 1);
                                        const height = Math.max((d.count / maxCount) * 100, 4);
                                        return (
                                            <div
                                                key={i}
                                                className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-default"
                                                style={{ height: `${height}%` }}
                                                title={`${new Date(d.date).toLocaleDateString()}: ${d.count} sessions`}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Token Usage */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                                <div className="text-lg font-bold text-zinc-200">{data.llmCosts.totalPromptTokens.toLocaleString()}</div>
                                <div className="text-xs text-zinc-500">Prompt Tokens</div>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
                                <div className="text-lg font-bold text-zinc-200">{data.llmCosts.totalCompletionTokens.toLocaleString()}</div>
                                <div className="text-xs text-zinc-500">Completion Tokens</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
