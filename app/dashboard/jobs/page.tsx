'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    CalendarClock,
    RefreshCw,
    AlertCircle,
    Play,
    Pause,
    Clock,
    Globe
} from 'lucide-react';

interface ScheduledJob {
    id: string;
    name: string;
    cronExpr: string;
    timezone: string;
    jobType: string;
    jobConfig: string;
    nextRunAt: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function SchedulesDashboard() {
    const [jobs, setJobs] = useState<ScheduledJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/schedules');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setJobs(data.jobs || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const activeCount = jobs.filter(j => j.isActive).length;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-sky-500/20">
                            <CalendarClock className="h-6 w-6 text-sky-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Scheduled Jobs</h1>
                            <p className="text-sm text-zinc-500">{jobs.length} jobs · {activeCount} active</p>
                        </div>
                    </div>
                    <button onClick={fetchJobs} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Empty */}
                {!loading && jobs.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No scheduled jobs</p>
                        <p className="text-sm mt-1">Jobs will appear when cron schedules are configured</p>
                    </div>
                )}

                {/* Jobs table */}
                {jobs.length > 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                                    <th className="text-left p-3">Status</th>
                                    <th className="text-left p-3">Name</th>
                                    <th className="text-left p-3">Schedule</th>
                                    <th className="text-left p-3">Type</th>
                                    <th className="text-left p-3">Next Run</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => (
                                    <tr key={job.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-3">
                                            <div className={`flex items-center gap-1.5 ${job.isActive ? 'text-green-400' : 'text-zinc-500'}`}>
                                                {job.isActive ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                                                <span className="text-xs">{job.isActive ? 'Active' : 'Paused'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm font-medium text-zinc-200">{job.name}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 font-mono">{job.cronExpr}</code>
                                                <span className="flex items-center gap-0.5 text-xs text-zinc-500">
                                                    <Globe className="h-3 w-3" />{job.timezone}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{job.jobType}</span>
                                        </td>
                                        <td className="p-3 text-xs text-zinc-500">
                                            {job.nextRunAt ? (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(job.nextRunAt).toLocaleString()}
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {loading && jobs.length === 0 && (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
