'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Workflow,
    Play,
    CheckCircle2,
    XCircle,
    Clock,
    Plus,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Shield
} from 'lucide-react';

interface WorkflowStep {
    id: string;
    name: string;
    stepType: string;
    status: string;
    order: number;
}

interface WorkflowData {
    id: string;
    name: string;
    description: string | null;
    triggerType: string;
    status: string;
    createdAt: string;
    steps: WorkflowStep[];
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'text-zinc-400 bg-zinc-800',
    running: 'text-blue-400 bg-blue-500/10',
    completed: 'text-emerald-400 bg-emerald-500/10',
    failed: 'text-red-400 bg-red-500/10',
    skipped: 'text-zinc-500 bg-zinc-800/50'
};

const STEP_TYPE_ICONS: Record<string, typeof Play> = {
    session: Play,
    swarm: Workflow,
    ci_check: CheckCircle2,
    guard_check: Shield,
    custom: Clock
};

export default function WorkflowsDashboard() {
    const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
    const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

    const fetchWorkflows = useCallback(async () => {
        try {
            const res = await fetch('/api/workflows');
            if (res.ok) {
                const data = await res.json();
                setWorkflows(data.workflows || []);
            }
        } catch {
            console.error('Failed to fetch workflows');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

    const triggerWorkflow = async (id: string) => {
        setRunningIds(prev => new Set(prev).add(id));
        try {
            await fetch(`/api/workflows/${id}/run`, { method: 'POST' });
            setTimeout(fetchWorkflows, 1000);
        } catch {
            console.error('Failed to trigger workflow');
        } finally {
            setRunningIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700">
                            <Workflow className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Workflow Pipelines</h1>
                            <p className="text-xs text-zinc-500">Multi-step automation orchestration</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchWorkflows}
                            className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4 text-zinc-400" />
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                            New Workflow
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
                    </div>
                ) : workflows.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
                        <Workflow className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">No workflow pipelines defined yet.</p>
                        <p className="text-xs text-zinc-600 mt-1">Create one via the API at POST /api/workflows</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {workflows.map(wf => {
                            const isExpanded = expandedWorkflow === wf.id;
                            const completedSteps = wf.steps.filter(s => s.status === 'completed').length;

                            return (
                                <div key={wf.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                                    {/* Workflow Header */}
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                                        onClick={() => setExpandedWorkflow(isExpanded ? null : wf.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-zinc-500" />
                                            )}
                                            <div>
                                                <div className="text-sm font-medium">{wf.name}</div>
                                                {wf.description && (
                                                    <div className="text-xs text-zinc-500 mt-0.5">{wf.description}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-mono text-zinc-600">
                                                {completedSteps}/{wf.steps.length} steps
                                            </span>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${STATUS_COLORS[wf.status] || STATUS_COLORS.pending}`}>
                                                {wf.status}
                                            </span>
                                            <button
                                                onClick={e => { e.stopPropagation(); triggerWorkflow(wf.id); }}
                                                disabled={wf.status === 'running' || runningIds.has(wf.id)}
                                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 transition-colors"
                                            >
                                                {runningIds.has(wf.id) ? (
                                                    <RefreshCw className="h-3 w-3 text-white animate-spin" />
                                                ) : (
                                                    <Play className="h-3 w-3 text-white" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Steps */}
                                    {isExpanded && (
                                        <div className="border-t border-zinc-800 p-4 space-y-2">
                                            {wf.steps.map((step, idx) => {
                                                const Icon = STEP_TYPE_ICONS[step.stepType] || Clock;
                                                return (
                                                    <div key={step.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-800/30">
                                                        <span className="text-[10px] font-mono text-zinc-600 w-5">{idx + 1}</span>
                                                        <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                                        <span className="text-sm text-zinc-300 flex-1">{step.name}</span>
                                                        <span className="text-[10px] font-mono text-zinc-600">{step.stepType}</span>
                                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${STATUS_COLORS[step.status] || STATUS_COLORS.pending}`}>
                                                            {step.status}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
