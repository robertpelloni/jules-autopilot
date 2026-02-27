'use client';

import { useState, useEffect } from 'react';
import {
    DollarSign,
    TrendingUp,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BudgetData {
    monthlyBudget: number;
    spent: number;
    remaining: number;
    pluginExecutionsToday: number;
    maxPluginExecutionsPerDay: number;
}

/**
 * BudgetRoutingSettings
 * 
 * Settings panel widget that displays the workspace's current budget consumption,
 * remaining monthly allowance, plugin execution quota usage, and provides
 * quick navigation to the Routing Simulation dashboard for cost previewing.
 * 
 * Data is fetched from `/api/settings/budget` endpoint.
 */
export function BudgetRoutingSettings() {
    const [data, setData] = useState<BudgetData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBudget() {
            try {
                const res = await fetch('/api/settings/budget');
                if (!res.ok) {
                    setError(res.status === 401 ? 'Not authenticated' : 'Failed to load budget data');
                    return;
                }
                const json = await res.json();
                setData(json);
            } catch {
                setError('Network error');
            } finally {
                setIsLoading(false);
            }
        }
        fetchBudget();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-white/40">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading budget data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {error}
            </div>
        );
    }

    if (!data) return null;

    const budgetPct = data.monthlyBudget > 0 ? (data.remaining / data.monthlyBudget) * 100 : 100;
    const quotaPct = data.maxPluginExecutionsPerDay > 0
        ? ((data.maxPluginExecutionsPerDay - data.pluginExecutionsToday) / data.maxPluginExecutionsPerDay) * 100
        : 100;

    const getBudgetColor = (pct: number) => {
        if (pct > 50) return 'bg-green-500';
        if (pct > 20) return 'bg-yellow-500';
        if (pct > 5) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-6">
            {/* Monthly Budget */}
            <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <h3 className="text-sm font-bold">Monthly LLM Budget</h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-md bg-zinc-900 p-3 text-center">
                        <div className="text-xs text-white/40 mb-1">Budget</div>
                        <div className="text-lg font-bold text-white">${data.monthlyBudget.toFixed(2)}</div>
                    </div>
                    <div className="rounded-md bg-zinc-900 p-3 text-center">
                        <div className="text-xs text-white/40 mb-1">Spent</div>
                        <div className="text-lg font-bold text-orange-400">${data.spent.toFixed(2)}</div>
                    </div>
                    <div className="rounded-md bg-zinc-900 p-3 text-center">
                        <div className="text-xs text-white/40 mb-1">Remaining</div>
                        <div className={cn('text-lg font-bold', budgetPct > 20 ? 'text-green-400' : 'text-red-400')}>
                            ${data.remaining.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Budget Progress Bar */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-white/40">
                        <span>{budgetPct.toFixed(0)}% remaining</span>
                        <span>${data.remaining.toFixed(2)} / ${data.monthlyBudget.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                            className={cn('h-full rounded-full transition-all duration-500', getBudgetColor(budgetPct))}
                            style={{ width: `${Math.min(100, budgetPct)}%` }}
                        />
                    </div>
                </div>

                {budgetPct < 10 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Budget critically low — the routing engine will auto-switch to cost-efficiency models.
                    </div>
                )}
            </div>

            {/* Plugin Quota */}
            <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-purple-400" />
                    <h3 className="text-sm font-bold">Daily Plugin Quota</h3>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="flex justify-between text-xs text-white/40 mb-1">
                            <span>{data.pluginExecutionsToday} / {data.maxPluginExecutionsPerDay} used today</span>
                            <span>{quotaPct.toFixed(0)}% left</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all', getBudgetColor(quotaPct))}
                                style={{ width: `${Math.min(100, quotaPct)}%` }}
                            />
                        </div>
                    </div>
                    {quotaPct > 50 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    <h3 className="text-sm font-bold">Routing & Cost Tools</h3>
                </div>

                <Link
                    href="/dashboard/routing"
                    className="flex items-center justify-between rounded-md border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white/80 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                >
                    <span>Routing Simulation Dashboard</span>
                    <ExternalLink className="h-4 w-4 text-white/30 group-hover:text-blue-400 transition-colors" />
                </Link>

                <p className="text-[10px] text-white/30">
                    Preview which LLM provider will be selected for each task type, estimate costs,
                    and see budget impact — all without triggering actual API calls.
                </p>
            </div>
        </div>
    );
}
