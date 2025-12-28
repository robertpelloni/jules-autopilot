'use client';

import { DebateResult, DebateRound, DebateTurn } from '@/lib/orchestration/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function DebateViewer({ result }: { result: DebateResult }) {
  if (!result || !result.rounds) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-purple-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <span>Multi-Agent Debate</span>
            {result.topic && <span className="text-white/60 font-normal normal-case">{result.topic}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue={`round-${result.rounds.length}`} className="w-full">
            {result.rounds.map((round) => (
              <AccordionItem key={round.roundNumber} value={`round-${round.roundNumber}`} className="border-white/10">
                <AccordionTrigger className="text-xs uppercase tracking-wide hover:no-underline hover:text-purple-300">
                  Round {round.roundNumber}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {round.turns.map((turn, idx) => (
                      <div key={idx} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0 bg-zinc-900 border border-white/10">
                          <AvatarFallback className="bg-zinc-800 text-xs font-bold text-white/70">
                            {turn.participantName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white/90">{turn.participantName}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-white/10 text-white/50">
                              {turn.role}
                            </Badge>
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
                <p className="text-xs text-white/80 leading-relaxed">{result.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
