'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Puzzle,
    RefreshCw,
    AlertCircle,
    Power,
    PowerOff,
    Package,
    Clock,
    Settings
} from 'lucide-react';

interface InstalledPluginEntry {
    id: string;
    pluginId: string;
    isEnabled: boolean;
    installedAt: string;
    config: string | null;
    plugin: {
        name: string;
        version: string;
        description: string;
    };
}

export default function PluginsDashboard() {
    const [plugins, setPlugins] = useState<InstalledPluginEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlugins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/plugins/installed');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setPlugins(data.plugins || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load plugins');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

    const enabledCount = plugins.filter(p => p.isEnabled).length;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/20">
                            <Puzzle className="h-6 w-6 text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Installed Plugins</h1>
                            <p className="text-sm text-zinc-500">
                                {plugins.length} installed · {enabledCount} enabled
                            </p>
                        </div>
                    </div>
                    <button onClick={fetchPlugins} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Empty */}
                {!loading && plugins.length === 0 && (
                    <div className="text-center py-16 text-zinc-500">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No plugins installed</p>
                        <p className="text-sm mt-1">Install plugins from the Marketplace</p>
                    </div>
                )}

                {/* Plugin cards */}
                <div className="grid gap-3">
                    {plugins.map(p => (
                        <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${p.isEnabled ? 'bg-teal-500/20' : 'bg-zinc-700/30'}`}>
                                {p.isEnabled ? (
                                    <Power className="h-5 w-5 text-teal-400" />
                                ) : (
                                    <PowerOff className="h-5 w-5 text-zinc-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-zinc-200">{p.plugin.name}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">v{p.plugin.version}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.isEnabled ? 'bg-teal-500/10 text-teal-400' : 'bg-zinc-700/30 text-zinc-500'}`}>
                                        {p.isEnabled ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1 truncate">{p.plugin.description}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 flex-shrink-0">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.installedAt).toLocaleDateString()}</span>
                                {p.config && <Settings className="h-3.5 w-3.5 text-zinc-600" />}
                            </div>
                        </div>
                    ))}
                </div>

                {loading && plugins.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}
            </div>
        </div>
    );
}
