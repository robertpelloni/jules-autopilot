'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    ArrowRightLeft,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Server,
    FileText,
    Activity
} from 'lucide-react';

interface SessionTransfer {
    id: string;
    sourceProvider: string;
    sourceSessionId: string;
    targetProvider: string;
    targetSessionId: string | null;
    status: string;
    transferredItems: string;
    errorReason: string | null;
    createdAt: string;
    updatedAt: string;
}

const STATUS_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    queued: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    processing: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export default function TransfersDashboard() {
    const [transfers, setTransfers] = useState<SessionTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransfers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/transfers');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setTransfers(data.transfers || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transfers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/20">
                            <ArrowRightLeft className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Session Transfers</h1>
                            <p className="text-sm text-zinc-500">Cross-provider context migration history</p>
                        </div>
                    </div>
                    <button onClick={fetchTransfers} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {!loading && transfers.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No transfers found</p>
                        <p className="text-sm mt-1">Cross-provider session handoffs will appear here</p>
                    </div>
                )}

                <div className="space-y-3">
                    {transfers.map(transfer => {
                        const style = STATUS_ICONS[transfer.status] || STATUS_ICONS.queued;
                        const StatusIcon = style.icon;
                        
                        let parsedItems = { activities: 0, files: 0 };
                        try {
                            parsedItems = JSON.parse(transfer.transferredItems);
                        } catch (e) {
                            // ignore parse error
                        }

                        return (
                            <div key={transfer.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${style.bg}`}>
                                            <StatusIcon className={`h-5 w-5 ${style.color} ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-zinc-200 capitalize">{transfer.sourceProvider}</span>
                                                <ArrowRightLeft className="h-3.5 w-3.5 text-zinc-500" />
                                                <span className="font-medium text-zinc-200 capitalize">{transfer.targetProvider}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1 font-mono">
                                                    <Server className="h-3 w-3" />
                                                    {transfer.sourceSessionId.slice(0, 8)}
                                                </span>
                                                {transfer.targetSessionId && (
                                                    <>
                                                        <span>→</span>
                                                        <span className="flex items-center gap-1 font-mono">
                                                            {transfer.targetSessionId.slice(0, 8)}
                                                        </span>
                                                    </>
                                                )}
                                                <span>·</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(transfer.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4 text-xs text-zinc-500 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {parsedItems.activities}</span>
                                            <span className="text-[10px] mt-0.5 text-zinc-600">Events</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {parsedItems.files}</span>
                                            <span className="text-[10px] mt-0.5 text-zinc-600">Files</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {transfer.errorReason && (
                                    <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                        <span className="font-medium">Failed:</span> {transfer.errorReason}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {loading && transfers.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
