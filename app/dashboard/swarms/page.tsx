'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Network,
    RefreshCw,
    AlertCircle,
    Plus,
    CheckCircle2,
    Clock,
    Loader2,
    XCircle,
    ChevronDown,
    ChevronRight,
    ListTodo
} from 'lucide-react';

interface SwarmTask {
    id: string;
    title: string;
    description: string;
    status: string;
    assignedTo: string | null;
    result: string | null;
}

interface Swarm {
    id: string;
    name: string;
    prompt: string;
    status: string;
    createdAt: string;
    tasks: SwarmTask[];
}

const STATUS_ICON: Record<string, { icon: React.ElementType; color: string }> = {
    completed: { icon: CheckCircle2, color: 'text-green-400' },
    running: { icon: Loader2, color: 'text-blue-400' },
    decomposing: { icon: Network, color: 'text-purple-400' },
    pending: { icon: Clock, color: 'text-yellow-400' },
    failed: { icon: XCircle, color: 'text-red-400' },
};

export default function SwarmDashboard() {
    const [swarms, setSwarms] = useState<Swarm[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newPrompt, setNewPrompt] = useState('');

    const fetchSwarms = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/swarm');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setSwarms(data.swarms || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSwarms(); }, [fetchSwarms]);

    // WebSocket auto-refresh
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const daemonHost = process.env.NEXT_PUBLIC_DAEMON_WS_URL || window.location.host;
        const socket = new WebSocket(`${protocol}//${daemonHost}/ws`);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Refresh if any swarm-related event occurs or if a session update might affect a task
                if (data.type?.startsWith('swarm_') || data.type === 'session_updated') {
                    fetchSwarms();
                }
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };

        return () => socket.close();
    }, [fetchSwarms]);

    const createSwarm = async () => {
        if (!newPrompt.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/swarm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: newPrompt })
            });
            if (!res.ok) throw new Error('Failed to create swarm');
            setNewPrompt('');
            fetchSwarms();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Network className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Agent Swarms</h1>
                            <p className="text-sm text-zinc-500">Multi-agent task decomposition &amp; orchestration</p>
                        </div>
                    </div>
                    <button onClick={fetchSwarms} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Create swarm */}
                <div className="flex gap-2 mb-6">
                    <input
                        value={newPrompt}
                        onChange={e => setNewPrompt(e.target.value)}
                        placeholder="Describe a high-level task to decompose into a swarm..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        onKeyDown={e => e.key === 'Enter' && createSwarm()}
                    />
                    <button
                        onClick={createSwarm}
                        disabled={creating || !newPrompt.trim()}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Empty */}
                {!loading && swarms.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No swarms created</p>
                        <p className="text-sm mt-1">Create one above to start decomposing tasks</p>
                    </div>
                )}

                {/* Swarm list */}
                <div className="space-y-3">
                    {swarms.map(swarm => {
                        const isExpanded = expandedId === swarm.id;
                        const style = STATUS_ICON[swarm.status] || STATUS_ICON.pending;
                        const StatusIcon = style.icon;
                        const completedTasks = swarm.tasks.filter(t => t.status === 'completed').length;
                        return (
                            <div key={swarm.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                                <div
                                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : swarm.id)}
                                >
                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                                    <StatusIcon className={`h-4 w-4 ${style.color} ${swarm.status === 'running' ? 'animate-spin' : ''}`} />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-zinc-200">{swarm.name}</span>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                                            <ListTodo className="h-3 w-3" />
                                            {completedTasks}/{swarm.tasks.length} tasks
                                        </div>
                                    </div>
                                    <span className="text-xs text-zinc-500">{new Date(swarm.createdAt).toLocaleDateString()}</span>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-zinc-800">
                                        <p className="text-xs text-zinc-400 mt-3 mb-3">{swarm.prompt}</p>
                                        {swarm.tasks.length === 0 ? (
                                            <p className="text-xs text-zinc-600">No tasks decomposed yet</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {swarm.tasks.map(task => {
                                                    const ts = STATUS_ICON[task.status] || STATUS_ICON.pending;
                                                    const TaskIcon = ts.icon;
                                                    return (
                                                        <div key={task.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-zinc-800/30">
                                                            <TaskIcon className={`h-3.5 w-3.5 ${ts.color} flex-shrink-0`} />
                                                            <span className="text-xs text-zinc-300 flex-1 truncate">{task.title}</span>
                                                            {task.assignedTo && <span className="text-xs text-zinc-500 font-mono">{task.assignedTo}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {loading && swarms.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
