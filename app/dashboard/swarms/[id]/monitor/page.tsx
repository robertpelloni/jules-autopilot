'use client';

import { useEffect, useState, useMemo } from 'react';
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
    Network,
    Zap
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
}

interface Swarm {
    id: string;
    name: string;
    status: string;
    tasks: SwarmTask[];
}

export default function SwarmMonitorPage() {
    const { id: swarmId } = useParams();
    const router = useRouter();
    const [swarm, setSwarm] = useState<Swarm | null>(null);
    const [events, setEvents] = useState<SwarmEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSwarm = async () => {
        try {
            const res = await fetch(`/api/swarm/${swarmId}`);
            if (res.ok) {
                const data = await res.json();
                setSwarm(data.swarm);
            }
        } catch (err) {
            console.error('Failed to fetch swarm:', err);
        } finally {
            setLoading(false);
        }
    };

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
            default: return <Info className="w-4 h-4 text-slate-400" />;
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
                        <h1 className="text-2xl font-bold tracking-tight">{swarm?.name || 'Swarm Monitor'}</h1>
                        <p className="text-sm text-slate-400">ID: {swarmId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {swarm && getStatusBadge(swarm.status)}
                    <Button variant="outline" size="sm" onClick={fetchSwarm}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task Dependencies / Graph Mockup */}
                <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="w-5 h-5 text-blue-400" />
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
                                                ? 'border-blue-500/50 bg-blue-500/10 shadow-blue-500/20'
                                                : task.status === 'completed'
                                                    ? 'border-green-500/50 bg-green-500/10'
                                                    : 'border-slate-700 bg-slate-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider opacity-70">Task {idx + 1}</Badge>
                                            {task.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                                            {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                                        </div>
                                        <h3 className="font-semibold text-sm line-clamp-2 mb-1">{task.title}</h3>
                                        {task.sessionId && (
                                            <p className="text-[10px] text-slate-500 font-mono truncate">SID: {task.sessionId.substring(0, 8)}</p>
                                        )}
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
        </div>
    );
}

// Missing Lucide import in previous block, adding it here for the final file
import { PlusCircle, RefreshCw } from 'lucide-react';
