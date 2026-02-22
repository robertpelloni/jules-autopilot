'use client';

import { useSessionKeeperStore, DebateResult } from '@/lib/stores/session-keeper';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Zap,
  Network,
  Target,
  Bot,
  Gavel,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function DebateVisualizer() {
  const { debates } = useSessionKeeperStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (debates.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4 text-sm">
        No debates recorded yet. Enable &quot;Council Mode&quot; in Session Keeper settings to see multi-agent interactions here.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {debates.map((debate) => (
          <DebateCard 
            key={debate.id} 
            debate={debate} 
            isExpanded={expandedId === debate.id}
            onToggle={() => setExpandedId(expandedId === debate.id ? null : debate.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function getRoleIcon(role: string) {
  const r = role.toLowerCase();
  if (r.includes('security')) return <ShieldAlert className="h-3 w-3 text-red-400" />;
  if (r.includes('performance')) return <Zap className="h-3 w-3 text-yellow-400" />;
  if (r.includes('architect')) return <Network className="h-3 w-3 text-blue-400" />;
  if (r.includes('product')) return <Target className="h-3 w-3 text-green-400" />;
  return <Bot className="h-3 w-3 text-muted-foreground" />;
}

function getRiskColor(score: number) {
  if (score < 20) return 'text-green-500';
  if (score < 50) return 'text-yellow-500';
  if (score < 80) return 'text-orange-500';
  return 'text-red-500';
}

function getRiskBg(score: number) {
  if (score < 20) return 'bg-green-500';
  if (score < 50) return 'bg-yellow-500';
  if (score < 80) return 'bg-orange-500';
  return 'bg-red-500';
}

function DebateCard({ debate, isExpanded, onToggle }: { debate: DebateResult, isExpanded: boolean, onToggle: () => void }) {
  // Infer risk if not present (mocking/legacy data compatibility)
  const riskScore = (debate as any).riskScore ?? 50;
  const riskLabel = riskScore < 20 ? 'Low Risk' : riskScore < 50 ? 'Moderate Risk' : riskScore < 80 ? 'High Risk' : 'Critical Risk';

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden transition-all hover:border-border/80">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <Badge variant={debate.mode === 'conference' ? 'secondary' : 'default'} className="uppercase text-[10px] tracking-wider font-mono">
            {debate.mode === 'conference' ? 'Conference' : 'Council'}
          </Badge>
          <div className="flex flex-col">
             <span className="text-sm font-medium text-foreground">
                {format(debate.timestamp, 'MMM d, h:mm a')}
             </span>
             <span className="text-[10px] text-muted-foreground font-mono">
                {debate.sessionId.substring(0, 8)}
             </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
            {/* Mini Risk Indicator */}
            <div className="flex items-center gap-1.5" title={`Risk Score: ${riskScore}`}>
                <div className={cn("h-2 w-2 rounded-full", getRiskBg(riskScore))} />
                <span className={cn("text-xs font-medium", getRiskColor(riskScore))}>{riskLabel}</span>
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Separator className="opacity-50" />
            <CardContent className="p-4 space-y-6 bg-muted/10">
              
              {/* Risk Assessment Section */}
              <div className="space-y-2">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider">Risk Assessment</span>
                    <span className={cn("font-mono", getRiskColor(riskScore))}>{riskScore}/100</span>
                 </div>
                 <Progress value={riskScore} className="h-1.5" indicatorClassName={getRiskBg(riskScore)} />
              </div>

              {/* Council Opinions */}
              <div className="grid grid-cols-1 gap-3">
                {debate.opinions.map((op, idx) => (
                  <Card key={idx} className="bg-card border-border/40 shadow-sm relative overflow-hidden group">
                    <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-border to-transparent opacity-50" />
                    <CardHeader className="p-3 pb-2 flex flex-row items-center gap-2 space-y-0 border-b border-border/10 bg-muted/20">
                      {getRoleIcon(op.participant.role || op.participant.model)}
                      <div className="flex flex-col">
                          <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {op.participant.role || op.participant.model}
                          </div>
                          <div className="text-[9px] text-muted-foreground font-mono">
                            {op.participant.provider} / {op.participant.model}
                          </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 text-xs text-muted-foreground leading-relaxed prose prose-invert max-w-none">
                      {op.content}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Final Verdict */}
              <div className={cn(
                  "border rounded-lg p-4 relative overflow-hidden",
                  riskScore > 50 ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"
              )}>
                <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    riskScore > 50 ? "bg-red-500/50" : "bg-green-500/50"
                )} />
                <div className="flex items-center gap-2 mb-2">
                  <Gavel className={cn("h-4 w-4", riskScore > 50 ? "text-red-500" : "text-green-500")} />
                  <span className={cn(
                      "text-sm font-bold uppercase tracking-wider",
                      riskScore > 50 ? "text-red-500" : "text-green-500"
                  )}>
                      Final Verdict
                  </span>
                  {riskScore > 80 && <Badge variant="destructive" className="ml-auto text-[10px]">VETOED</Badge>}
                  {riskScore < 20 && <Badge variant="outline" className="ml-auto text-[10px] text-green-500 border-green-500/30">APPROVED</Badge>}
                </div>
                <p className="text-sm text-foreground leading-relaxed pl-1 font-medium">
                  {debate.finalInstruction}
                </p>
              </div>

            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
