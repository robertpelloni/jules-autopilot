'use client';

import { useState } from 'react';
import {
  Zap,
  DollarSign,
  Brain,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskType = 'code_review' | 'fast_chat' | 'deep_reasoning' | 'default';

interface SimulationResult {
  selectedProvider: string;
  selectedModel: string;
  estimatedCost: number;
  budgetRemainingBefore: number;
  budgetRemainingAfter: number;
  policyReason: string;
}

interface SimulationError {
  error: string;
  message?: string;
}

const TASK_TYPES: { id: TaskType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'code_review',
    label: 'Code Review',
    description: 'Static analysis and quality assessment',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    id: 'fast_chat',
    label: 'Fast Chat',
    description: 'Quick Q&A and short-form responses',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: 'deep_reasoning',
    label: 'Deep Reasoning',
    description: 'Complex architectural planning and analysis',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'default',
    label: 'Default',
    description: 'General-purpose inference',
    icon: <Info className="h-4 w-4" />,
  },
];

/**
 * RoutingDashboard
 * 
 * Interactive dashboard that lets users simulate the intelligent provider
 * routing engine's behavior. Users select a task type and token counts,
 * and the API returns which provider/model would be selected, the estimated
 * cost, and the remaining budget — all without actually invoking an LLM.
 */
export function RoutingDashboard() {
  const [taskType, setTaskType] = useState<TaskType>('code_review');
  const [promptTokens, setPromptTokens] = useState(1000);
  const [completionTokens, setCompletionTokens] = useState(500);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/routing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType, promptTokens, completionTokens }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errData = data as SimulationError;
        setError(errData.message || errData.error || `Request failed with status ${res.status}`);
        return;
      }

      setResult(data as SimulationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  // Budget health indicator
  const getBudgetHealth = (remaining: number, total: number) => {
    const pct = (remaining / total) * 100;
    if (pct > 50) return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Healthy' };
    if (pct > 20) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Moderate' };
    if (pct > 5) return { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Low' };
    return { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Critical' };
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Routing Simulation</h1>
        <p className="text-muted-foreground">
          Preview which provider and model the routing engine will select — without incurring any cost.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Configuration Panel */}
        <div className="space-y-6">
          {/* Task Type Selector */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="mb-3 text-sm font-medium text-zinc-400 uppercase tracking-wider">Task Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TYPES.map((tt) => (
                <button
                  key={tt.id}
                  onClick={() => setTaskType(tt.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-all',
                    taskType === tt.id
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                      : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                  )}
                >
                  {tt.icon}
                  <div>
                    <div className="font-medium">{tt.label}</div>
                    <div className="text-xs text-zinc-500">{tt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Token Count Inputs */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="mb-3 text-sm font-medium text-zinc-400 uppercase tracking-wider">Token Estimate</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="prompt-tokens" className="block text-sm text-zinc-400 mb-1">Prompt Tokens</label>
                <input
                  id="prompt-tokens"
                  type="number"
                  min={1}
                  value={promptTokens}
                  onChange={(e) => setPromptTokens(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="completion-tokens" className="block text-sm text-zinc-400 mb-1">Completion Tokens</label>
                <input
                  id="completion-tokens"
                  type="number"
                  min={1}
                  value={completionTokens}
                  onChange={(e) => setCompletionTokens(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Quick presets */}
              <div className="flex gap-2">
                {[
                  { label: 'Light', p: 500, c: 200 },
                  { label: 'Medium', p: 2000, c: 1000 },
                  { label: 'Heavy', p: 8000, c: 4000 },
                  { label: 'Mega', p: 32000, c: 16000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => { setPromptTokens(preset.p); setCompletionTokens(preset.c); }}
                    className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Simulate Button */}
          <button
            onClick={runSimulation}
            disabled={isLoading}
            className={cn(
              'w-full rounded-lg py-3 text-sm font-semibold transition-all',
              isLoading
                ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20'
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Simulating...
              </span>
            ) : (
              'Run Simulation'
            )}
          </button>
        </div>

        {/* Right Column: Results Panel */}
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium text-sm">Simulation Failed</span>
              </div>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          )}

          {result && (
            <>
              {/* Selected Provider */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="mb-3 text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  Selected Provider
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                    <Brain className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-100">{result.selectedProvider}</div>
                    <div className="text-sm text-zinc-400">{result.selectedModel}</div>
                  </div>
                </div>
                <div className="mt-3 rounded-md bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400">
                  <span className="text-zinc-500">Reason: </span>
                  {result.policyReason}
                </div>
              </div>

              {/* Cost Estimate */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="mb-3 text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  Cost Estimate
                </h3>
                <div className="text-3xl font-bold text-green-400">
                  ${result.estimatedCost.toFixed(6)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  For {promptTokens.toLocaleString()} prompt + {completionTokens.toLocaleString()} completion tokens
                </div>
              </div>

              {/* Budget Impact */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="mb-3 text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-yellow-400" />
                  Budget Impact
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Before</span>
                    <span className="text-zinc-200">${result.budgetRemainingBefore.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">After</span>
                    <span className="text-zinc-200">${result.budgetRemainingAfter.toFixed(2)}</span>
                  </div>

                  {/* Budget Bar */}
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                        getBudgetHealth(result.budgetRemainingAfter, result.budgetRemainingBefore + result.estimatedCost).bg.replace('/20', '/60')
                      )}
                      style={{
                        width: `${Math.min(100, (result.budgetRemainingAfter / (result.budgetRemainingBefore + result.estimatedCost)) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Status Badge */}
                  {(() => {
                    const health = getBudgetHealth(result.budgetRemainingAfter, result.budgetRemainingBefore + result.estimatedCost);
                    return (
                      <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', health.bg, health.color)}>
                        {health.label === 'Critical' ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {health.label}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {!result && !error && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 p-12 text-center">
              <Brain className="h-12 w-12 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500">
                Configure parameters and run a simulation to preview routing decisions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
