'use client';

import { useEffect, useState } from 'react';
import { useJules } from '@/lib/jules/provider';
import type { Session } from '@/types/jules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { getArchivedSessions } from '@/lib/archive';

interface SessionListProps {
  onSelectSession: (session: Session) => void;
  selectedSessionId?: string;
}

export function SessionList({ onSelectSession, selectedSessionId }: SessionListProps) {
  const { client } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';

    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Unknown date';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  useEffect(() => {
    loadSessions();
  }, [client]);

  const loadSessions = async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await client.listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      // Provide helpful error messages
      if (err instanceof Error) {
        if (err.message.includes('Invalid API key')) {
          setError('Invalid API key. Please check your API key and try again.');
        } else if (err.message.includes('Resource not found')) {
          // For 404, just show empty state instead of error
          setSessions([]);
          setError(null);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load sessions');
      }
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRepoShortName = (sourceId: string) => {
    // Extract just the repo name from "owner/repo"
    const parts = sourceId.split('/');
    return parts[parts.length - 1] || sourceId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-xs text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-xs text-destructive text-center">{error}</p>
        <Button variant="outline" size="sm" onClick={loadSessions} className="h-7 text-xs">
          Retry
        </Button>
      </div>
    );
  }

  // Filter out archived sessions
  const archivedSessions = getArchivedSessions();
  const visibleSessions = sessions.filter(session => !archivedSessions.has(session.id));

  if (visibleSessions.length === 0) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {sessions.length === 0
            ? 'No sessions yet. Create one to get started!'
            : 'All sessions are archived.'}
        </p>
      </div>
    );
  }

  const sessionLimit = 100;
  const sessionCount = visibleSessions.length;
  const percentage = Math.min((sessionCount / sessionLimit) * 100, 100);

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="py-0.5">
          {visibleSessions.map((session) => (
            <button
              key={session.id}
              className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors duration-150 ${
                selectedSessionId === session.id
                  ? 'bg-sidebar-accent border-l-2 border-sidebar-primary'
                  : 'border-l-2 border-transparent hover:bg-sidebar-accent/50'
              }`}
              onClick={() => onSelectSession(session)}
            >
              <div className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                session.status === 'completed'
                  ? 'bg-sidebar-primary'
                  : session.status === 'active'
                  ? 'border-2 border-sidebar-primary/60'
                  : 'border-2 border-muted-foreground/20'
              }`}>
                {session.status === 'completed' && (
                  <svg className="w-2.5 h-2.5 text-sidebar-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="text-xs font-medium truncate leading-tight text-sidebar-foreground">
                    {session.title || 'Untitled session'}
                  </div>
                  {session.sourceId && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0 font-normal bg-sidebar-accent border-sidebar-border">
                      {getRepoShortName(session.sourceId)}
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-sidebar-foreground/50 leading-tight">
                  {formatDate(session.createdAt)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Session Limit Indicator */}
      <div className="border-t border-sidebar-border px-3 py-2.5 bg-sidebar-accent/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Daily Sessions
          </span>
          <span className="text-xs font-semibold text-sidebar-foreground">
            {sessionCount}/{sessionLimit}
          </span>
        </div>
        <div className="w-full h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sidebar-primary to-primary transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {sessionCount >= sessionLimit * 0.8 && (
          <p className="text-[9px] text-sidebar-foreground/50 mt-1 leading-tight">
            {sessionCount >= sessionLimit ? 'Daily limit reached' : 'Approaching daily limit'}
          </p>
        )}
      </div>
    </div>
  );
}
