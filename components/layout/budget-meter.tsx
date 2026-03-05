"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DollarSign, AlertTriangle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetData {
    monthlyBudget: number;
    spent: number;
    remaining: number;
}

export function BudgetMeter() {
    const [data, setData] = useState<BudgetData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBudget = async () => {
        try {
            const res = await fetch("/api/settings/budget");
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error("Failed to fetch budget", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudget();
        // Poll every 60 seconds
        const interval = setInterval(fetchBudget, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) {
        return (
            <div className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-full bg-white/5 border border-white/10 animate-pulse w-32" />
        );
    }

    const { spent, monthlyBudget, remaining } = data;
    const percentSpent = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;

    let statusColor = "text-green-400";
    let bgClass = "bg-green-500/10";
    let borderClass = "border-green-500/20";
    let isAlert = false;

    if (percentSpent > 90) {
        statusColor = "text-red-400";
        bgClass = "bg-red-500/10";
        borderClass = "border-red-500/20";
        isAlert = true;
    } else if (percentSpent > 70) {
        statusColor = "text-amber-400";
        bgClass = "bg-amber-500/10";
        borderClass = "border-amber-500/20";
    }

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "hidden sm:flex items-center gap-2 h-8 px-3 rounded-full border transition-all hover:bg-white/10 cursor-default",
                            bgClass,
                            borderClass
                        )}
                    >
                        {isAlert ? (
                            <AlertTriangle className={cn("h-3.5 w-3.5", statusColor)} />
                        ) : (
                            <DollarSign className={cn("h-3.5 w-3.5", statusColor)} />
                        )}
                        <span className="text-[10px] font-mono tracking-widest text-white/80 uppercase">
                            Remaining: <strong className={statusColor}>${remaining.toFixed(2)}</strong>
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="w-56 p-3 bg-zinc-950 border-white/10 text-white">
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">LLM Budget Status</h4>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Limit:</span>
                            <span className="font-mono">${monthlyBudget.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Spent:</span>
                            <span className="font-mono text-zinc-300">${spent.toFixed(2)}</span>
                        </div>

                        <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-1000", bgClass.replace("/10", ""))}
                                style={{ width: `${Math.min(100, percentSpent)}%` }}
                            />
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
