'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    GitBranch,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    GitCommit,
    Filter,
    Workflow
} from 'lucide-react';

interface CIRunEntry {
    id: string;
    runId: string;
    repo: string;
    conclusion: string | null;
    headSha: string | null;
    workflowName: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
}

const CONCLUSION_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    success: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    failure: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    cancelled: { icon: XCircle, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    timed_out: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

export default function CIDashboard() {
    const [runs, setRuns] = useState<CIRunEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const fetchRuns = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/ci/runs');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setRuns(data.runs || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load CI runs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRuns(); }, [fetchRuns]);

    const filtered = filter === 'all' ? runs : runs.filter(r => r.conclusion === filter);
    const successCount = runs.filter(r => r.conclusion === 'success').length;
    const failCount = runs.filter(r => r.conclusion === 'failure').length;
    const successRate = runs.length > 0 ? Math.round((successCount / runs.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <Workflow className="h-6 w-6 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">CI Runs</h1>
                            <p className="text-sm text-zinc-500">GitHub Actions workflow execution history</p>
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
                                <option value="all">All</option>
                                <option value="success">Success</option>
                                <option value="failure">Failure</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <button onClick={fetchRuns} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Stats */}
                {!loading && runs.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-6">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                            <div className="text-xl font-bold text-zinc-200">{runs.length}</div>
                            <div className="text-xs text-zinc-500">Total Runs</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                            <div className="text-xl font-bold text-green-400">{successCount}</div>
                            <div className="text-xs text-zinc-500">Passed</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                            <div className="text-xl font-bold text-red-400">{failCount}</div>
                            <div className="text-xs text-zinc-500">Failed</div>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                            <div className="text-xl font-bold text-blue-400">{successRate}%</div>
                            <div className="text-xs text-zinc-500">Success Rate</div>
                        </div>
                    </div>
                )}

                {/* Empty */}
                {!loading && runs.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <Workflow className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No CI runs recorded</p>
                        <p className="text-sm mt-1">Runs will appear when GitHub webhook events arrive</p>
                    </div>
                )}

                {/* Run list */}
                <div className="space-y-2">
                    {filtered.map(run => {
                        const style = CONCLUSION_STYLES[run.conclusion || ''] || CONCLUSION_STYLES.cancelled;
                        const Icon = style.icon;
                        return (
                            <div key={run.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                <div className={`p-1.5 rounded-md ${style.bg} flex-shrink-0`}>
                                    <Icon className={`h-4 w-4 ${style.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-zinc-200 truncate">{run.workflowName || 'Workflow'}</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{run.conclusion || run.status}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{run.repo}</span>
                                        {run.headSha && (
                                            <span className="flex items-center gap-1 font-mono"><GitCommit className="h-3 w-3" />{run.headSha.slice(0, 7)}</span>
                                        )}
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(run.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {loading && runs.length === 0 && (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
