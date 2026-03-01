'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Settings,
    Bot,
    DollarSign,
    Server,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Shield,
    Eye
} from 'lucide-react';

interface KeeperConfig {
    isEnabled: boolean;
    autoSwitch: boolean;
    checkIntervalSeconds: number;
    inactivityThresholdMinutes: number;
    smartPilotEnabled: boolean;
    shadowPilotEnabled: boolean;
    supervisorProvider: string;
    supervisorModel: string;
}

interface BudgetInfo {
    monthlyBudget: number;
    spent: number;
    remaining: number;
    pluginExecutionsToday: number;
    maxPluginExecutionsPerDay: number;
}

interface ProviderConfigItem {
    id: string;
    providerId: string;
    isEnabled: boolean;
    priority: number;
    maxConcurrent: number;
}

function Toggle({
    checked,
    onChange,
    label
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <label className="flex items-center justify-between py-2 cursor-pointer group">
            <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-zinc-700'
                    }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''
                        }`}
                />
            </button>
        </label>
    );
}

export default function SettingsPage() {
    const [keeper, setKeeper] = useState<KeeperConfig | null>(null);
    const [budget, setBudget] = useState<BudgetInfo | null>(null);
    const [providers, setProviders] = useState<ProviderConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [keeperRes, budgetRes, provRes] = await Promise.all([
                fetch('/api/settings/keeper').then(r => r.json()).catch(() => null),
                fetch('/api/settings/budget').then(r => r.json()).catch(() => null),
                fetch('/api/providers').then(r => r.json()).catch(() => ({ configs: [] }))
            ]);
            if (keeperRes) setKeeper(keeperRes);
            if (budgetRes) setBudget(budgetRes);
            setProviders(provRes.configs || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const saveKeeper = async () => {
        if (!keeper) return;
        setSaving(true);
        setError(null);
        try {
            await fetch('/api/settings/keeper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keeper)
            });
            setSuccess('Keeper settings saved');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const updateKeeper = <K extends keyof KeeperConfig>(key: K, value: KeeperConfig[K]) => {
        if (!keeper) return;
        setKeeper({ ...keeper, [key]: value });
    };

    const spentPct = budget ? Math.min(100, Math.round((budget.spent / Math.max(budget.monthlyBudget, 0.01)) * 100)) : 0;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <Settings className="h-6 w-6 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Settings</h1>
                            <p className="text-sm text-zinc-500">Keeper, budget &amp; provider configuration</p>
                        </div>
                    </div>
                    <button
                        onClick={loadAll}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                        <CheckCircle2 className="h-4 w-4" /> {success}
                    </div>
                )}

                {loading && (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />)}
                    </div>
                )}

                {!loading && (
                    <div className="space-y-6">
                        {/* Keeper Section */}
                        {keeper && (
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                                        <Bot className="h-4 w-4 text-blue-400" />
                                        Session Keeper
                                    </div>
                                    <button
                                        onClick={saveKeeper}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm disabled:opacity-50"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                                <div className="space-y-1 divide-y divide-zinc-800/50">
                                    <Toggle checked={keeper.isEnabled} onChange={v => updateKeeper('isEnabled', v)} label="Keeper Enabled" />
                                    <Toggle checked={keeper.autoSwitch} onChange={v => updateKeeper('autoSwitch', v)} label="Auto-Switch Sessions" />
                                    <Toggle checked={keeper.smartPilotEnabled} onChange={v => updateKeeper('smartPilotEnabled', v)} label="Smart Pilot" />
                                    <Toggle checked={keeper.shadowPilotEnabled} onChange={v => updateKeeper('shadowPilotEnabled', v)} label="Shadow Pilot (Background Monitoring)" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="text-xs text-zinc-500 block mb-1">Check Interval (sec)</label>
                                        <input
                                            type="number"
                                            value={keeper.checkIntervalSeconds}
                                            onChange={e => updateKeeper('checkIntervalSeconds', Number(e.target.value))}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 block mb-1">Supervisor Model</label>
                                        <input
                                            type="text"
                                            value={keeper.supervisorModel}
                                            onChange={e => updateKeeper('supervisorModel', e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Budget Section */}
                        {budget && (
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                                <div className="flex items-center gap-2 mb-4 text-sm font-medium text-zinc-400">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    Budget Status
                                </div>
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                        <span>${budget.spent.toFixed(2)} spent</span>
                                        <span>${budget.monthlyBudget.toFixed(2)} budget</span>
                                    </div>
                                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${spentPct > 80 ? 'bg-red-500' : spentPct > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                }`}
                                            style={{ width: `${spentPct}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div>
                                        <div className="text-lg font-bold text-emerald-400">${budget.remaining.toFixed(2)}</div>
                                        <div className="text-xs text-zinc-500">Remaining</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-zinc-200">{budget.pluginExecutionsToday}</div>
                                        <div className="text-xs text-zinc-500">Plugin Execs Today</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-zinc-200">{budget.maxPluginExecutionsPerDay}</div>
                                        <div className="text-xs text-zinc-500">Daily Limit</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Providers Section */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-zinc-400">
                                <Server className="h-4 w-4 text-violet-400" />
                                Provider Configurations
                            </div>
                            {providers.length === 0 ? (
                                <p className="text-xs text-zinc-600">No providers configured. Use the Providers dashboard to add configurations.</p>
                            ) : (
                                <div className="space-y-2">
                                    {providers.map(p => (
                                        <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${p.isEnabled ? 'bg-green-400' : 'bg-zinc-600'}`} />
                                                <span className="text-sm font-medium text-zinc-300 capitalize">{p.providerId}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                <span>Priority: {p.priority}</span>
                                                <span>Max: {p.maxConcurrent}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Security Info */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-400">
                                <Shield className="h-4 w-4 text-amber-400" />
                                Security
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Eye className="h-3.5 w-3.5" />
                                API keys are excluded from list responses and stored server-side only.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
