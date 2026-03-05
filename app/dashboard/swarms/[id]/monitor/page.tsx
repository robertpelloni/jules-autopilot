'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Activity,
    ArrowLeft,
    Brain,
    CheckCircle2,
    Clock,
    Cpu,
    Info,
    Loader2,
    Network as NetworkIcon,
    Zap,
    Pause,
    Play,
    Square,
    RefreshCw,
    AlertCircle,
    Plus,
    PlusCircle,
    RotateCcw,
    Check,
    BarChart3,
    TrendingUp,
    Timer,
    History,
    ShieldCheck,
    CheckSquare,
    Search,
    Flame,
    Skull
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SwarmEvent {
    id: string;
    type: string;
    timestamp: number;
    data: any;
}

interface SwarmTask {
    id: string;
    title: string;
    status: string;
    sessionId?: string;
    retryCount?: number;
    isEscalated?: boolean;
    isVerification?: boolean;
    isRedTeam?: boolean;
    reviewedTaskId?: string;
    reviewStatus?: 'pending' | 'passed' | 'failed';
}

interface Swarm {
    id: string;
    name: string;
    status: string;
    priority: number;
    tasks: SwarmTask[];
    totalTokens?: number;
    totalCostCents?: number;
}

interface SwarmAnalytics {
    metrics: {
        totalTokens: number;
        totalCostCents: number;
        estimatedCostUSD: number;
        taskCount: number;
        completedCount: number;
    };
}

export default function SwarmMonitorPage() {
    const { id: swarmId } = useParams();
    const router = useRouter();
    const [swarm, setSwarm] = useState<Swarm | null>(null);
    const [analytics, setAnalytics] = useState<SwarmAnalytics | null>(null);
    const [events, setEvents] = useState<SwarmEvent[]>([]);
    const [showContextModal, setShowContextModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchSwarm = useCallback(async () => {
        try {
            const [swarmRes, analyticsRes] = await Promise.all([
                fetch(`/api/swarm/${swarmId}`),
                fetch(`/api/swarm/${swarmId}/analytics`)
            ]);

            if (swarmRes.ok) {
                const data = await swarmRes.json();
                setSwarm(data.swarm);
                if (data.events && data.events.length > 0) {
                    setEvents(data.events.map((e: any) => ({
                        id: Math.random().toString(36).substring(7),
                        type: e.type,
                        timestamp: e.timestamp,
                        data: e.data
                    })).reverse());
                }
            }

            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error('Failed to fetch swarm data:', err);
        } finally {
            setLoading(false);
        }
    }, [swarmId]);

    useEffect(() => {
        fetchSwarm();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use environment variable if available, otherwise fallback to current host
        const daemonHost = process.env.NEXT_PUBLIC_DAEMON_WS_URL || window.location.host;
        const socket = new WebSocket(`${protocol}//${daemonHost}/ws`);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.data?.swarmId === swarmId) {
                    setEvents(prev => [{
                        id: Math.random().toString(36).substring(7),
                        type: data.type,
                        timestamp: Date.now(),
                        data: data.data
                    }, ...prev].slice(0, 50));

                    // Refresh swarm data on key transitions
                    if (data.type === 'swarm_updated' || data.type === 'swarm_task_updated' || data.type === 'swarm_completed') {
                        fetchSwarm();
                    }
                }
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };

        return () => socket.close();
    }, [swarmId]);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'swarm:task_pondering': return <Brain className="w-4 h-4 text-purple-400" />;
            case 'swarm:task_executing': return <Cpu className="w-4 h-4 text-blue-400" />;
            case 'swarm:task_finalizing': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case 'swarm_created': return <PlusCircle className="w-4 h-4 text-blue-400" />;
            case 'swarm_completed': return <Zap className="w-4 h-4 text-yellow-400" />;
            case 'swarm_paused': return <Pause className="w-4 h-4 text-yellow-500" />;
            case 'swarm_resumed': return <Play className="w-4 h-4 text-blue-500" />;
            case 'swarm:verifier_spawned': return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
            case 'swarm:red_team_spawned': return <Flame className="w-4 h-4 text-red-500" />;
            case 'swarm:replanning': return <RefreshCw className="w-4 h-4 text-orange-400" />;
            default: return <Info className="w-4 h-4 text-slate-400" />;
        }
    };

    const updateSwarmStatus = async (status: string) => {
        setActionLoading('swarm-status');
        try {
            const res = await fetch(`/api/swarm/${swarmId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchSwarm();
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const updateSwarmPriority = async (priority: number) => {
        setActionLoading('swarm-priority');
        try {
            const res = await fetch(`/api/swarm/${swarmId}/priority`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority })
            });
            if (res.ok) fetchSwarm();
        } catch (err) {
            console.error('Failed to update priority:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const retryTask = async (taskId: string) => {
        setActionLoading(`retry-${taskId}`);
        try {
            const res = await fetch(`/api/swarm/tasks/${taskId}/retry`, { method: 'POST' });
            if (res.ok) fetchSwarm();
        } catch (err) {
            console.error('Failed to retry task:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const approveTask = async (taskId: string) => {
        setActionLoading(`approve-${taskId}`);
        try {
            const res = await fetch(`/api/swarm/tasks/${taskId}/approve`, { method: 'POST' });
            if (res.ok) fetchSwarm();
        } catch (err) {
            console.error('Failed to approve task:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleTaskPause = async (taskId: string, currentStatus: string) => {
        const action = currentStatus === 'paused' ? 'resume' : 'pause';
        setActionLoading(`${action}-${taskId}`);
        try {
            const res = await fetch(`/api/swarm/tasks/${taskId}/${action}`, { method: 'POST' });
            if (res.ok) fetchSwarm();
        } catch (err) {
            console.error(`Failed to ${action} task:`, err);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'running': return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">Running</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/50">Completed</Badge>;
            case 'failed': return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/50">Failed</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-950 min-h-screen text-slate-200">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{swarm?.name || 'Swarm Monitor'}</h1>
                            {swarm && (
                                <select
                                    value={swarm.priority}
                                    onChange={(e) => updateSwarmPriority(Number(e.target.value))}
                                    disabled={!!actionLoading}
                                    className="bg-slate-900 border border-orange-500/30 rounded px-2 py-0.5 text-xs text-orange-400 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                                >
                                    <option value={0}>P0 (Normal)</option>
                                    <option value={5}>P5 (High)</option>
                                    <option value={10}>P10 (Urgent)</option>
                                </select>
                            )}
                        </div>
                        <p className="text-sm text-slate-400">ID: {swarmId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {analytics && (
                        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-full text-xs">
                            <div className="flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-slate-400">Tokens:</span>
                                <span className="font-mono">{analytics.metrics.totalTokens.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-3 bg-slate-800" />
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-slate-400">Cost:</span>
                                <span className="font-mono">${analytics.metrics.estimatedCostUSD.toFixed(3)}</span>
                            </div>
                        </div>
                    )}
                    {swarm && getStatusBadge(swarm.status)}
                    <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1">
                        {swarm?.status === 'running' ? (
                            <Button variant="ghost" size="sm" onClick={() => updateSwarmStatus('paused')} disabled={!!actionLoading}>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                        ) : swarm?.status === 'paused' ? (
                            <Button variant="ghost" size="sm" onClick={() => updateSwarmStatus('running')} disabled={!!actionLoading}>
                                <Play className="w-4 h-4 mr-2 text-green-400" />
                                Resume
                            </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => updateSwarmStatus('cancelled')} disabled={swarm?.status === 'completed' || swarm?.status === 'failed' || !!actionLoading} className="text-red-400 hover:text-red-300">
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowContextModal(true)} disabled={!swarm}>
                        <History className="w-4 h-4 mr-2" />
                        Swarm Memory
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchSwarm} disabled={!!actionLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading === 'refresh' ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </header>

            {/* Phase 83: Consensus Progress */}
            {swarm && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-900/50 border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 font-medium">Verification Consensus</span>
                            <span className="text-xs font-mono text-cyan-400">
                                {Math.round((swarm.tasks.filter(t => t.reviewStatus === 'passed').length / (swarm.tasks.filter(t => !t.isVerification).length || 1)) * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${(swarm.tasks.filter(t => t.reviewStatus === 'passed').length / (swarm.tasks.filter(t => !t.isVerification).length || 1)) * 100}%` }}
                            />
                        </div>
                    </Card>
                    <Card className="bg-slate-900/50 border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 font-medium">Tasks Verified</span>
                            <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="text-lg font-bold">
                            {swarm.tasks.filter(t => t.reviewStatus === 'passed').length} / {swarm.tasks.filter(t => !t.isVerification).length}
                        </div>
                    </Card>
                    <Card className="bg-slate-900/50 border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 font-medium">Active Verifiers</span>
                            <Search className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="text-lg font-bold">
                            {swarm.tasks.filter(t => t.isVerification && t.status !== 'completed').length}
                        </div>
                    </Card>
                    <Card className="bg-slate-900/50 border-slate-800 p-4 border-orange-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 font-medium">Re-planning Events</span>
                            <RefreshCw className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="text-lg font-bold text-orange-400">
                            {swarm.tasks.reduce((acc, t) => acc + (t.retryCount || 0), 0)}
                        </div>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task Dependencies / Graph Mockup */}
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <NetworkIcon className="w-5 h-5 text-blue-400" />
                            Swarm Topology
                        </CardTitle>
                        <CardDescription>Real-time task dependencies and execution flow</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />

                        <div className="flex flex-wrap gap-8 justify-center items-center z-10">
                            <AnimatePresence>
                                {swarm?.tasks.map((task, idx) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                        className={`p-4 rounded-xl border-2 transition-colors w-48 shadow-lg ${task.status === 'running' || task.status === 'dispatched'
                                            ? task.isRedTeam ? 'border-red-500/50 bg-red-500/10 shadow-red-500/20' : 'border-blue-500/50 bg-blue-500/10 shadow-blue-500/20'
                                            : task.status === 'completed'
                                                ? 'border-green-500/50 bg-green-500/10'
                                                : 'border-slate-700 bg-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="secondary" className={`text-[10px] uppercase font-bold tracking-wider opacity-70 flex items-center gap-1 ${task.isRedTeam ? 'bg-red-500/20 text-red-400' : task.isVerification ? 'bg-cyan-500/20 text-cyan-300' : ''}`}>
                                                {task.isRedTeam ? <><Flame className="w-3 h-3" /> Red Team</> : task.isVerification ? 'Verifier' : `Task ${idx + 1}`}
                                            </Badge>
                                            <div className="flex items-center gap-1">
                                                {task.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                                                {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                                                {task.status === 'paused' && <Pause className="w-3 h-3 text-yellow-500" />}
                                                {task.isEscalated && !task.isRedTeam && <Zap className="w-3 h-3 text-red-500 fill-red-500" />}
                                                {task.isRedTeam && <Skull className="w-3 h-3 text-red-500" />}
                                                {task.isVerification && !task.isRedTeam && <ShieldCheck className="w-3 h-3 text-cyan-400" />}
                                                {(task.status === 'pending' || task.status === 'paused') && (
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleTaskPause(task.id, task.status)} disabled={!!actionLoading}>
                                                        {task.status === 'paused' ? <Play className="w-3 h-3 text-green-400" /> : <Pause className="w-3 h-3 text-slate-400" />}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-sm line-clamp-2 mb-1">{task.title}</h3>
                                        {task.sessionId && (
                                            <p className="text-[10px] text-slate-500 font-mono truncate mb-2">SID: {task.sessionId.substring(0, 8)}</p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {task.retryCount && task.retryCount > 0 ? (
                                                <Badge variant="outline" className="text-[8px] h-4 py-0 border-red-500/30 text-red-400">Retry {task.retryCount}</Badge>
                                            ) : null}
                                            {task.isEscalated && (
                                                <Badge variant="outline" className="text-[8px] h-4 py-0 border-yellow-500/30 text-yellow-400">Escalated</Badge>
                                            )}
                                            {task.reviewStatus === 'passed' && (
                                                <Badge variant="outline" className="text-[8px] h-4 py-0 border-green-500/30 text-green-400 bg-green-500/5">Verified</Badge>
                                            )}
                                            {task.reviewStatus === 'failed' && (
                                                <Badge variant="outline" className="text-[8px] h-4 py-0 border-red-500/30 text-red-400 bg-red-500/5">Failed Review</Badge>
                                            )}
                                        </div>

                                        {/* Bottleneck Indicator */}
                                        {task.status === 'running' && idx === 0 && (
                                            <div className="mt-1 flex items-center gap-1 text-[9px] text-orange-400 animate-pulse">
                                                <Timer className="w-2.5 h-2.5" />
                                                Potential Bottleneck
                                            </div>
                                        )}

                                        <div className="mt-2 flex gap-2">
                                            {task.status === 'failed' && (
                                                <Button variant="outline" size="sm" onClick={() => retryTask(task.id)} disabled={!!actionLoading} className="h-7 text-[10px] w-full border-red-500/30 hover:bg-red-500/10">
                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                    Retry Task
                                                </Button>
                                            )}
                                            {task.status === 'await_review' && (
                                                <Button variant="outline" size="sm" onClick={() => approveTask(task.id)} disabled={!!actionLoading} className="h-7 text-[10px] w-full border-green-500/30 hover:bg-green-500/10 text-green-400">
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Approve
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>

                {/* Real-time Event Feed */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-400" />
                            Live Telemetry
                        </CardTitle>
                        <CardDescription>Granular swarm event stream</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                            <AnimatePresence initial={false}>
                                {events.map((event) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex gap-3 text-sm border-l-2 border-slate-800 pl-4 py-1 relative"
                                    >
                                        <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-slate-800" />
                                        <div className="mt-1">{getEventIcon(event.type)}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="font-bold text-xs text-slate-400 uppercase tracking-tighter">
                                                    {event.type.replace('swarm:', '').replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-slate-300 text-xs leading-relaxed italic">
                                                {event.data.message || `${event.data.taskId || 'Swarm'} updated to ${event.data.status || 'new state'}`}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {events.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                                    <Clock className="w-8 h-8 opacity-20" />
                                    <p className="text-xs">Waiting for events...</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Swarm Context Modal */}
            <AnimatePresence>
                {showContextModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <History className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Swarm Memory Mesh</h2>
                                        <p className="text-xs text-slate-400">Consolidated output and context across all sub-tasks</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setShowContextModal(false)}>
                                    <Square className="w-4 h-4 rotate-45" />
                                </Button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-6 bg-slate-950/30">
                                {swarm?.tasks.filter(t => t.status === 'completed').length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No completed tasks found in this swarm yet.</p>
                                    </div>
                                ) : (
                                    swarm?.tasks.filter(t => t.status === 'completed' || t.status === 'failed').map(task => (
                                        <div key={task.id} className="space-y-2 group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <h3 className="font-semibold text-sm">{task.title}</h3>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded italic">
                                                    {task.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed group-hover:border-slate-700 transition-colors">
                                                {(task as any).result || 'No output recorded.'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                                <Button onClick={() => setShowContextModal(false)}>Close Inspector</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// End of SwarmMonitorPage content
