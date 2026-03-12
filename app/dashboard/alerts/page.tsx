'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Bell,
    RefreshCw,
    AlertCircle,
    Info,
    AlertTriangle,
    ShieldAlert,
    Clock,
    Check,
    CheckCheck,
    CheckCircle2
} from 'lucide-react';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
}

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    error: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
    success: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
};

export default function AlertsDashboard() {
    const [alerts, setAlerts] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/alerts');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setAlerts(data.alerts || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load alerts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/alerts/${id}/read`, { method: 'POST' });
            setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await fetch('/api/alerts/read-all', { method: 'POST' });
            setAlerts(alerts.map(a => ({ ...a, isRead: true })));
        } catch (err) {
            console.error('Failed to mark all read', err);
        }
    };

    const unreadCount = alerts.filter(a => !a.isRead).length;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                            <Bell className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">System Alerts</h1>
                            <p className="text-sm text-zinc-500">Platform and agent notifications</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm">
                                <CheckCheck className="h-4 w-4" /> Mark all read
                            </button>
                        )}
                        <button onClick={fetchAlerts} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Empty */}
                {!loading && alerts.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No alerts</p>
                        <p className="text-sm mt-1">You're all caught up!</p>
                    </div>
                )}

                {/* Alerts list */}
                <div className="space-y-3">
                    {alerts.map(alert => {
                        const style = TYPE_ICONS[alert.type] || TYPE_ICONS.info;
                        const TypeIcon = style.icon;
                        return (
                            <div key={alert.id} className={`flex gap-4 p-4 rounded-xl border transition-colors ${alert.isRead ? 'bg-zinc-900/30 border-zinc-800/50 opacity-70' : 'bg-zinc-900/80 border-zinc-700'}`}>
                                <div className={`p-2 rounded-lg flex-shrink-0 h-fit ${style.bg}`}>
                                    <TypeIcon className={`h-5 w-5 ${style.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <h3 className={`text-sm font-medium ${alert.isRead ? 'text-zinc-400' : 'text-zinc-200'}`}>
                                            {alert.title}
                                        </h3>
                                        <span className="flex items-center gap-1 text-[10px] text-zinc-500 whitespace-nowrap flex-shrink-0">
                                            <Clock className="h-3 w-3" />
                                            {new Date(alert.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className={`text-sm mt-1 mb-2 ${alert.isRead ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {alert.body}
                                    </p>
                                    {!alert.isRead && (
                                        <button onClick={() => markAsRead(alert.id)} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors">
                                            <Check className="h-3.5 w-3.5" /> Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {loading && alerts.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
