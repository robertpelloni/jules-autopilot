'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitMerge, AlertTriangle, ArrowLeft, Check, CheckCircle2 } from 'lucide-react';
import { BorderGlow } from '@/components/ui/border-glow';
import Link from 'next/link';
import { useState } from 'react';

export default function ConflictResolutionPage() {
    const [resolved, setResolved] = useState(false);

    return (
        <div className="flex h-screen items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm font-medium text-white/50 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>

                {resolved ? (
                    <BorderGlow glowColor="rgba(34, 197, 94, 0.5)">
                        <Card className="bg-zinc-950/90 border-green-500/20 shadow-2xl backdrop-blur-xl">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Conflicts Resolved</h2>
                                <p className="text-muted-foreground mb-8 max-w-md">
                                    All merge conflicts have been successfully identified and resolved.
                                    The workspace is now clean and ready for the next operation.
                                </p>
                                <Button
                                    onClick={() => window.history.back()}
                                    className="bg-green-600 hover:bg-green-700 text-white min-w-[150px]"
                                >
                                    Continue
                                </Button>
                            </CardContent>
                        </Card>
                    </BorderGlow>
                ) : (
                    <BorderGlow glowColor="rgba(249, 115, 22, 0.4)" animated>
                        <Card className="bg-zinc-950/80 border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden">
                            {/* Header Header */}
                            <div className="bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent border-b border-orange-500/20">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-orange-400" />
                                                Merge Conflict Detected
                                            </CardTitle>
                                            <CardDescription className="text-orange-200/60 mt-1.5">
                                                Multiple agents attempted to modify the same file state simultaneously.
                                                Manual intervention or automated smart-merge is required.
                                            </CardDescription>
                                        </div>
                                        <div className="px-3 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono font-medium flex items-center gap-1.5">
                                            <GitMerge className="h-3 w-3" />
                                            HEAD DETACHED
                                        </div>
                                    </div>
                                </CardHeader>
                            </div>

                            <CardContent className="p-6 space-y-6">
                                {/* File list placeholder */}
                                <div className="rounded-lg border border-white/10 bg-black/50 overflow-hidden">
                                    <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex text-xs font-medium text-white/50">
                                        <div className="flex-1">Conflicting File</div>
                                        <div className="w-24 text-right">Status</div>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {[
                                            { name: 'src/lib/routing/engine.ts', type: 'src modified on both sides' },
                                            { name: 'package.json', type: 'version bump collision' }
                                        ].map((file, i) => (
                                            <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                                <div className="font-mono text-sm text-white/80">{file.name}</div>
                                                <div className="text-xs text-orange-400/80">{file.type}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
                                    <Button variant="outline" className="border-white/10 hover:bg-white/5">
                                        Abort Merge
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                                        onClick={() => setResolved(true)}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Accept Auto-Merge (AI)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </BorderGlow>
                )}
            </div>
        </div>
    );
}
