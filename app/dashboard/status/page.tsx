'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BorderGlow } from '@/components/ui/border-glow';
import {
    CheckCircle2,
    XCircle,
    RefreshCw,
    Database,
    Server,
    Activity,
    Clock,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventStream } from '@/lib/hooks/use-event-stream';

interface SystemStatus {
    status: 'healthy' | 'degraded';
    version: string;
    timestamp: string;
    uptime: number;
    latency: {
        total: number;
        database: number;
        daemon: number;
    };
    subsystems: {
        database: 'ok' | 'error';
        daemon: 'ok' | 'unavailable';
    };
}

/**
 * SystemHealthDashboard
 *
 * Real-time system health monitoring page showing:
 * - Overall system health status
 * - Database, Daemon, and SSE subsystem indicators
 * - Response latencies
 * - Application version and uptime
 * - Live SSE event feed
 */
export default function SystemHealthPage() {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const { isConnected: sseConnected, events: sseEvents } = useEventStream({
        autoConnect: true,
    });

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/system/status');
            const data = await res.json();
            setStatus(data);
            setLastRefresh(new Date());
        } catch {
            setError('Failed to reach health endpoint');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const formatUptime = (seconds: number): string => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (d > 0) return `${d}d ${h}h ${m}m`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
        <div className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
            ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        )}>
            {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {label}
        </div>
    );

    return (
        <div className="h-full overflow-y-auto bg-black p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">System Health</h1>
                    <p className="text-xs text-white/40 mt-1">
                        {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStatus}
                    disabled={isLoading}
                    className="gap-2"
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    <XCircle className="h-4 w-4 inline mr-1" /> {error}
                </div>
            )}

            {/* Overall Status */}
            {status && (
                <>
                    <BorderGlow glowColor={status.status === 'healthy' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'} animated>
                        <Card className="bg-card/95 backdrop-blur-sm">
                            <CardContent className="pt-6 pb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'h-10 w-10 rounded-full flex items-center justify-center',
                                            status.status === 'healthy' ? 'bg-green-500/20' : 'bg-red-500/20'
                                        )}>
                                            <Activity className={cn(
                                                'h-5 w-5',
                                                status.status === 'healthy' ? 'text-green-400' : 'text-red-400'
                                            )} />
                                        </div>
                                        <div>
                                            <div className={cn(
                                                'text-lg font-bold capitalize',
                                                status.status === 'healthy' ? 'text-green-400' : 'text-red-400'
                                            )}>
                                                {status.status}
                                            </div>
                                            <div className="text-xs text-white/40">v{status.version}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/40">
                                        <Clock className="h-3.5 w-3.5" />
                                        Uptime: {formatUptime(status.uptime)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </BorderGlow>

                    {/* Subsystems Grid */}
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Database */}
                        <BorderGlow glowColor={status.subsystems.database === 'ok' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}>
                            <Card className="bg-card/95 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Database className="h-4 w-4 text-blue-400" />
                                        Database
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <StatusBadge ok={status.subsystems.database === 'ok'} label={status.subsystems.database === 'ok' ? 'Connected' : 'Error'} />
                                    <div className="text-[10px] text-white/30">
                                        Latency: {status.latency.database}ms
                                    </div>
                                </CardContent>
                            </Card>
                        </BorderGlow>

                        {/* Daemon */}
                        <BorderGlow glowColor={status.subsystems.daemon === 'ok' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}>
                            <Card className="bg-card/95 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Server className="h-4 w-4 text-purple-400" />
                                        Daemon
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <StatusBadge ok={status.subsystems.daemon === 'ok'} label={status.subsystems.daemon === 'ok' ? 'Running' : 'Unavailable'} />
                                    <div className="text-[10px] text-white/30">
                                        {status.subsystems.daemon === 'ok' ? `Latency: ${status.latency.daemon}ms` : 'Frontend-only mode'}
                                    </div>
                                </CardContent>
                            </Card>
                        </BorderGlow>

                        {/* SSE Stream */}
                        <BorderGlow glowColor={sseConnected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}>
                            <Card className="bg-card/95 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        {sseConnected ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-red-400" />}
                                        Event Stream
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <StatusBadge ok={sseConnected} label={sseConnected ? 'Connected' : 'Disconnected'} />
                                    <div className="text-[10px] text-white/30">
                                        {sseEvents.length} events received
                                    </div>
                                </CardContent>
                            </Card>
                        </BorderGlow>
                    </div>

                    {/* Response Latency */}
                    <Card className="bg-card/95 backdrop-blur-sm border-white/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Response Latency</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-6">
                                <div>
                                    <div className="text-2xl font-bold text-white">{status.latency.total}ms</div>
                                    <div className="text-[10px] text-white/30">Total</div>
                                </div>
                                <div className="h-8 w-px bg-white/10" />
                                <div>
                                    <div className="text-lg font-bold text-blue-400">{status.latency.database}ms</div>
                                    <div className="text-[10px] text-white/30">Database</div>
                                </div>
                                <div className="h-8 w-px bg-white/10" />
                                <div>
                                    <div className="text-lg font-bold text-purple-400">{status.latency.daemon}ms</div>
                                    <div className="text-[10px] text-white/30">Daemon</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Live Event Feed */}
                    {sseEvents.length > 0 && (
                        <Card className="bg-card/95 backdrop-blur-sm border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Live Event Feed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {sseEvents.slice(0, 20).map((event, i) => (
                                        <div key={`${event.timestamp}-${i}`} className="flex items-center gap-2 text-xs py-1 border-b border-white/5 last:border-0">
                                            <span className={cn(
                                                'font-mono text-[10px] px-1.5 py-0.5 rounded',
                                                event.type === 'heartbeat' ? 'bg-zinc-800 text-white/30' :
                                                    event.type === 'keeper:action' ? 'bg-purple-500/20 text-purple-300' :
                                                        event.type === 'telemetry:cost' ? 'bg-green-500/20 text-green-300' :
                                                            'bg-blue-500/20 text-blue-300'
                                            )}>
                                                {event.type}
                                            </span>
                                            <span className="text-white/60 truncate flex-1">
                                                {typeof event.data === 'object' && event.data !== null
                                                    ? JSON.stringify(event.data).slice(0, 80)
                                                    : String(event.data)}
                                            </span>
                                            <span className="text-white/20 text-[10px] flex-shrink-0">
                                                {new Date(event.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
