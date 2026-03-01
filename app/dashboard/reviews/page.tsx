'use client';

import { useState, useCallback } from 'react';
import {
    Code2,
    Send,
    Loader2,
    AlertCircle,
    FileCode,
    Sparkles,
    Copy,
    CheckCircle2
} from 'lucide-react';

interface ReviewResult {
    review?: string;
    summary?: string;
    issues?: { severity: string; message: string; line?: number }[];
    suggestions?: string[];
    [key: string]: unknown;
}

const PROVIDERS = [
    { id: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
    { id: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'] },
    { id: 'gemini', label: 'Gemini', models: ['gemini-2.5-pro', 'gemini-2.0-flash'] },
];

export default function ReviewDashboard() {
    const [codeContext, setCodeContext] = useState('');
    const [provider, setProvider] = useState('openai');
    const [model, setModel] = useState('gpt-4o');
    const [reviewType, setReviewType] = useState('standard');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ReviewResult | null>(null);
    const [copied, setCopied] = useState(false);

    const selectedProvider = PROVIDERS.find(p => p.id === provider);

    const runReview = useCallback(async () => {
        if (!codeContext.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch('/api/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codeContext,
                    provider,
                    model,
                    reviewType,
                    outputFormat: 'json'
                })
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${res.status}`);
            }
            setResult(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Review failed');
        } finally {
            setLoading(false);
        }
    }, [codeContext, provider, model, reviewType]);

    const copyResult = () => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Code2 className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Code Review</h1>
                        <p className="text-sm text-zinc-500">AI-powered multi-provider code analysis</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Input Panel */}
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-zinc-500 block mb-1.5">Code or Diff</label>
                            <textarea
                                value={codeContext}
                                onChange={e => setCodeContext(e.target.value)}
                                placeholder="Paste your code, diff, or PR context here..."
                                className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>

                        <button
                            onClick={runReview}
                            disabled={loading || !codeContext.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Reviewing...</>
                            ) : (
                                <><Send className="h-4 w-4" /> Run Review</>
                            )}
                        </button>
                    </div>

                    {/* Config Panel */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-zinc-500 block mb-1.5">Provider</label>
                            <select
                                value={provider}
                                onChange={e => {
                                    setProvider(e.target.value);
                                    const p = PROVIDERS.find(pr => pr.id === e.target.value);
                                    if (p) setModel(p.models[0]);
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            >
                                {PROVIDERS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-zinc-500 block mb-1.5">Model</label>
                            <select
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            >
                                {selectedProvider?.models.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-zinc-500 block mb-1.5">Review Type</label>
                            <select
                                value={reviewType}
                                onChange={e => setReviewType(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            >
                                <option value="standard">Standard</option>
                                <option value="security">Security Audit</option>
                                <option value="performance">Performance</option>
                                <option value="architecture">Architecture</option>
                            </select>
                        </div>

                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                                Uses server-side API keys when available
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 mt-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                                <FileCode className="h-4 w-4 text-cyan-400" />
                                Review Result
                            </div>
                            <button
                                onClick={copyResult}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-xs text-zinc-400"
                            >
                                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>

                        {result.summary && (
                            <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{result.summary}</p>
                        )}

                        {result.review && (
                            <pre className="text-xs text-zinc-400 bg-zinc-900 rounded-lg p-4 overflow-x-auto max-h-96 whitespace-pre-wrap">
                                {result.review}
                            </pre>
                        )}

                        {result.issues && result.issues.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Issues</h3>
                                {result.issues.map((issue, i) => (
                                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${issue.severity === 'error' ? 'bg-red-500/10 text-red-400' :
                                            issue.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                                                'bg-blue-500/10 text-blue-400'
                                        }`}>
                                        {issue.line && <span className="font-mono text-xs opacity-60">L{issue.line}</span>}
                                        <span>{issue.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!result.review && !result.summary && !result.issues && (
                            <pre className="text-xs text-zinc-500 bg-zinc-900 rounded-lg p-4 overflow-x-auto max-h-64">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
