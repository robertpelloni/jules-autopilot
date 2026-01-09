'use client';

import { DebateResult } from '@/lib/orchestration/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Coins, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function DebateViewer({ result }: { result: DebateResult }) {
  if (!result || !result.rounds || !Array.isArray(result.rounds)) return null;

  const getApprovalColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'flagged': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getRiskColor = (score?: number) => {
    if (score === undefined) return 'text-zinc-400';
    if (score < 20) return 'text-green-400';
    if (score < 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
          {result.totalUsage && (
            <>
              <Card className="bg-zinc-900/50 border-zinc-800 p-2 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Prompt</div>
                      <div className="text-sm font-mono text-zinc-200">{result.totalUsage.prompt_tokens.toLocaleString()}</div>
                  </div>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800 p-2 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Completion</div>
                      <div className="text-sm font-mono text-zinc-200">{result.totalUsage.completion_tokens.toLocaleString()}</div>
                  </div>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800 p-2 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Coins className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total Tokens</div>
                      <div className="text-sm font-mono text-zinc-200">{result.totalUsage.total_tokens.toLocaleString()}</div>
                  </div>
              </Card>
            </>
          )}
          <Card className="bg-zinc-900/50 border-zinc-800 p-2 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full bg-zinc-500/10 flex items-center justify-center`}>
                  <ShieldCheck className={`h-4 w-4 ${getRiskColor(result.riskScore)}`} />
              </div>
              <div className="flex-1 overflow-hidden">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold flex justify-between">
                      <span>Risk</span>
                      <span className={getRiskColor(result.riskScore)}>{result.riskScore || 0}%</span>
                  </div>
                  <Progress value={result.riskScore || 0} className="h-1 mt-1" />
              </div>
          </Card>
      </div>

      <Card className="bg-zinc-950 border-purple-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Multi-Agent Debate</span>
              {result.topic && <span className="text-white/60 font-normal normal-case truncate max-w-[200px]">{result.topic}</span>}
            </div>
            <Badge variant="outline" className={`text-[10px] uppercase tracking-tighter ${getApprovalColor(result.approvalStatus)}`}>
              {result.approvalStatus || 'Pending'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue={result.rounds.length > 0 ? `round-${result.rounds.length}` : undefined} className="w-full">
            {result.rounds.map((round) => (
              <AccordionItem key={round.roundNumber} value={`round-${round.roundNumber}`} className="border-white/10">
                <AccordionTrigger className="text-xs uppercase tracking-wide hover:no-underline hover:text-purple-300">
                  Round {round.roundNumber}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {round.turns && round.turns.map((turn, idx) => (
                      <div key={idx} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0 bg-zinc-900 border border-white/10">
                          <AvatarFallback className="bg-zinc-800 text-xs font-bold text-white/70">
                            {turn.participantName ? turn.participantName.substring(0, 2).toUpperCase() : 'AG'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white/90">{turn.participantName || 'Agent'}</span>
                                <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-white/10 text-white/50">
                                  {turn.role || 'Participant'}
                                </Badge>
                                {turn.timestamp && (
                                  <span className="text-[9px] text-zinc-600 font-mono ml-1">
                                    {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                             </div>
                             {turn.usage && (
                                <div className="text-[10px] text-zinc-600 font-mono">
                                    {turn.usage.total_tokens} tokens
                                </div>
                             )}
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-white/80">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {result.summary && (
            <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Summary</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-white/80">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.summary}</ReactMarkdown>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
