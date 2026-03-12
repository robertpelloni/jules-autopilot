'use client';

import { useState } from 'react';
import {
    Vote,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Zap,
    Clock,
    Send,
    RefreshCw,
    Shield
} from 'lucide-react';

interface ProviderVote {
    provider: string;
    model: string;
    verdict: 'approve' | 'reject' | 'abstain';
    reasoning: string;
    latencyMs: number;
}

interface ConsensusResult {
    passed: boolean;
    votes: ProviderVote[];
    approveCount: number;
    rejectCount: number;
    quorumRequired: number;
}

const VERDICT_CONFIG = {
    approve: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-800/50' },
    reject: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-800/50' },
    abstain: { icon: MinusCircle, color: 'text-zinc-500', bg: 'bg-zinc-800', border: 'border-zinc-700' }
};

export default function ConsensusDashboard() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ConsensusResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runVote = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch('/api/consensus/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            setResult(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Vote failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-600 to-orange-700">
                        <Vote className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Consensus Voting</h1>
                        <p className="text-xs text-zinc-500">Multi-model quorum for critical decisions</p>
                    </div>
                </div>

                {/* Input */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                        <Shield className="h-4 w-4" />
                        Decision Prompt
                    </div>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe the decision requiring consensus (e.g., 'Should we deploy this schema migration to production?')"
                        rows={4}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none resize-none"
                    />
                    <button
                        onClick={runVote}
                        disabled={loading || !prompt.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-medium transition-all disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {loading ? 'Querying Models...' : 'Submit for Consensus'}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-4">
                        {/* Verdict Banner */}
                        <div className={`rounded-xl border p-6 text-center ${result.passed
                                ? 'border-emerald-800/50 bg-emerald-950/30'
                                : 'border-red-800/50 bg-red-950/30'
                            }`}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                {result.passed
                                    ? <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                                    : <XCircle className="h-6 w-6 text-red-400" />}
                                <span className={`text-xl font-bold ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {result.passed ? 'CONSENSUS PASSED' : 'CONSENSUS FAILED'}
                                </span>
                            </div>
                            <p className="text-sm text-zinc-400">
                                {result.approveCount} approve / {result.rejectCount} reject
                                {' '}(quorum: {result.quorumRequired})
                            </p>
                        </div>

                        {/* Individual Votes */}
                        <div className="space-y-3">
                            {result.votes.map((vote, idx) => {
                                const config = VERDICT_CONFIG[vote.verdict];
                                const Icon = config.icon;
                                return (
                                    <div key={idx} className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Icon className={`h-4 w-4 ${config.color}`} />
                                                <span className="text-sm font-bold text-white capitalize">{vote.provider}</span>
                                                <span className="text-xs text-zinc-600">{vote.model}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                <Clock className="h-3 w-3" />
                                                {vote.latencyMs}ms
                                            </div>
                                        </div>
                                        <p className="text-xs text-zinc-400 leading-relaxed">{vote.reasoning}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
