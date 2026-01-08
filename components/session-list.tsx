'use client';

import { useEffect, useState } from 'react';
import { useJules } from '@/lib/jules/provider';
import type { Session } from '@/types/jules';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle2, XCircle, PlayCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionListProps {
  onSelectSession?: (sessionId: string | Session) => void;
  selectedSessionId?: string | null;
  className?: string; // Added for compatibility
}

export function SessionList({ onSelectSession, selectedSessionId, className }: SessionListProps) {
  const { client, refreshTrigger } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;

    const loadSessions = async () => {
        try {
            const data = await client.listSessions();
            setSessions(data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [client, refreshTrigger]);

  if (loading) {
     return <div className="p-4 flex justify-center"><Loader2 className="animate-spin h-5 w-5 text-zinc-500" /></div>;
  }

  const getStatusIcon = (status: string) => {
     switch(status) {
         case 'completed': return <CheckCircle2 className="h-3 w-3 text-green-500" />;
         case 'failed': return <XCircle className="h-3 w-3 text-red-500" />;
         default: return <PlayCircle className="h-3 w-3 text-blue-500" />;
     }
  };

  const getSourceLabel = (sourceId?: string) => {
    if (!sourceId) return null;
    const match = sourceId.match(/^sources\/[^\/]+\/([^\/]+\/[^\/]+)$/);
    if (match) return match[1];
    return sourceId.replace('sources/', '');
  };

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-2 p-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession?.(session)}
            className={cn(
               "group flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/5",
               selectedSessionId === session.id
                 ? "bg-white/10 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                 : "bg-zinc-950/50 border-white/5"
            )}
          >
            <div className="flex justify-between items-start">
               <span className="font-semibold text-xs text-zinc-200 line-clamp-1">{session.title || 'Untitled Session'}</span>
               {getStatusIcon(session.status)}
            </div>
            
            {session.sourceId && (
              <div className="text-xs text-zinc-400 font-mono truncate opacity-70">
                {getSourceLabel(session.sourceId)}
              </div>
            )}

            <div className="flex justify-between items-end mt-1">
               <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
               </span>
               <Badge variant="outline" className="text-[10px] h-4 px-1 border-white/10 text-zinc-400">
                  {session.status}
               </Badge>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">No sessions found.</div>
        )}
      </div>
    </ScrollArea>
  );
}
