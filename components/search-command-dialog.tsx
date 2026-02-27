'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useJules } from '@/lib/jules/provider';
import { Session, Activity } from '@jules/shared';
import { Loader2, MessageSquare, Search, FileCode, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  type: 'session' | 'activity';
  session: Session;
  activity?: Activity;
  matchContext?: string;
}

interface SearchCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommandDialog({ open, onOpenChange }: SearchCommandDialogProps) {
  const { client } = useJules();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);

  // Toggle with Cmd+K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Load sessions on open
  React.useEffect(() => {
    if (open && client && sessions.length === 0) {
      client.listSessions().then(setSessions).catch(console.error);
    }
  }, [open, client, sessions.length]);
  // Debounced Search
  React.useEffect(() => {
    if (!query || !client) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        // 1. Search Sessions (Title/Repo)
        sessions.forEach(session => {
          if (
            (session.title || '').toLowerCase().includes(lowerQuery) ||
            (session.sourceId || '').toLowerCase().includes(lowerQuery)
          ) {
            searchResults.push({ type: 'session', session });
          }
        });

        // 2. Deep Search (Content) - Limit to top 20 recent sessions for performance
        // In a real app, this should be a backend endpoint.
        const recentSessions = sessions.slice(0, 20);
        const activityPromises = recentSessions.map(s =>
          client.listActivities(s.id)
            .then(acts => ({ sessionId: s.id, activities: acts }))
            .catch(() => ({ sessionId: s.id, activities: [] }))
        );

        const allActivities = await Promise.all(activityPromises);

        allActivities.forEach(({ sessionId, activities }) => {
          const session = sessions.find(s => s.id === sessionId);
          if (!session) return;

          activities.forEach(activity => {
            const content = activity.content || '';
            const bash = activity.bashOutput || '';
            const diff = activity.diff || '';

            if (
              content.toLowerCase().includes(lowerQuery) ||
              bash.toLowerCase().includes(lowerQuery) ||
              diff.toLowerCase().includes(lowerQuery)
            ) {
              // Create snippet
              let matchContext = '';
              const index = content.toLowerCase().indexOf(lowerQuery);
              if (index !== -1) {
                const start = Math.max(0, index - 20);
                const end = Math.min(content.length, index + query.length + 40);
                matchContext = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
              } else if (bash.toLowerCase().includes(lowerQuery)) {
                matchContext = '[CLI Output Match]';
              } else if (diff.toLowerCase().includes(lowerQuery)) {
                matchContext = '[Code Diff Match]';
              }

              searchResults.push({
                type: 'activity',
                session,
                activity,
                matchContext
              });
            }
          });
        });

        setResults(searchResults);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query, client, sessions]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    const params = new URLSearchParams();
    params.set('sessionId', result.session.id);
    router.push(`/?${params.toString()}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search sessions, code, or conversations..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching history...</span>
            </div>
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {!query && (
          <CommandGroup heading="Recent Sessions">
            {sessions.slice(0, 5).map(session => (
              <CommandItem key={session.id} onSelect={() => handleSelect({ type: 'session', session })}>
                <MessageSquare className="mr-2 h-4 w-4 opacity-50" />
                <div className="flex flex-col">
                  <span>{session.title || 'Untitled'}</span>
                  <span className="text-[10px] text-muted-foreground">{session.sourceId} • {formatDistanceToNow(new Date(session.createdAt))} ago</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.length > 0 && (
          <>
            <CommandGroup heading="Sessions">
              {results.filter(r => r.type === 'session').map(result => (
                <CommandItem key={result.session.id} onSelect={() => handleSelect(result)}>
                  <MessageSquare className="mr-2 h-4 w-4 opacity-50" />
                  <div className="flex flex-col">
                    <span>{result.session.title || 'Untitled'}</span>
                    <span className="text-[10px] text-muted-foreground">{result.session.sourceId}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Conversations & Code">
              {results.filter(r => r.type === 'activity').map(result => (
                <CommandItem key={`${result.session.id}-${result.activity?.id}`} onSelect={() => handleSelect(result)}>
                  {result.activity?.bashOutput ? (
                    <FileCode className="mr-2 h-4 w-4 opacity-50" />
                  ) : result.activity?.diff ? (
                    <FileCode className="mr-2 h-4 w-4 opacity-50" />
                  ) : (
                    <Search className="mr-2 h-4 w-4 opacity-50" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{result.session.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {result.matchContext}
                    </span>
                  </div>
                  <ArrowRight className="ml-auto h-3 w-3 opacity-30" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
