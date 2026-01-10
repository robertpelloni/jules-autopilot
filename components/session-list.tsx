"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useJules } from "@/lib/jules/provider";
import { useCloudDevStore } from "@/lib/stores/cloud-dev";
import { useDaemonEvent } from "@/lib/hooks/use-daemon-events";
import type { SessionsListUpdatedPayload } from "@jules/shared";
import { CLOUD_DEV_PROVIDERS, type CloudDevProviderId } from "@/types/cloud-dev";
import type { Session } from "@/types/jules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Sparkles, Bot, Brain, Code2, Github, Blocks, Filter } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { formatDistanceToNow, isValid, parseISO, isToday, differenceInDays } from "date-fns";
import { getArchivedSessions } from "@/lib/archive";
import { cn } from "@/lib/utils";

const PROVIDER_ICONS: Record<CloudDevProviderId, React.ReactNode> = {
  jules: <Sparkles className="h-3 w-3" />,
  devin: <Bot className="h-3 w-3" />,
  manus: <Brain className="h-3 w-3" />,
  openhands: <Code2 className="h-3 w-3" />,
  'github-spark': <Github className="h-3 w-3" />,
  blocks: <Blocks className="h-3 w-3" />,
  'claude-code': <Code2 className="h-3 w-3" />,
  codex: <Brain className="h-3 w-3" />,
};

type DisplaySession = Session & { providerId?: CloudDevProviderId };

function truncateText(text: string, maxLength: number) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

interface SessionListProps {
  onSelectSession?: (sessionId: string | Session) => void;
  selectedSessionId?: string | null;
  className?: string;
  showProviderFilter?: boolean;
}

export function SessionList({
  onSelectSession,
  selectedSessionId,
  className,
  showProviderFilter = true,
}: SessionListProps) {
  const { client, refreshTrigger } = useJules();
  const { getConfiguredProviders, initializeProviders } = useCloudDevStore();
  
  const [sessions, setSessions] = useState<DisplaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedSessionIds, setArchivedSessionIds] = useState<Set<string>>(new Set());
  const [selectedProviders, setSelectedProviders] = useState<Set<CloudDevProviderId>>(new Set(['jules']));

  const configuredProviders = useMemo(() => {
    const providers = getConfiguredProviders();
    return providers.length > 0 ? providers : ['jules' as CloudDevProviderId];
  }, [getConfiguredProviders]);

  useEffect(() => {
    initializeProviders();
  }, [initializeProviders]);

  useEffect(() => {
    setArchivedSessionIds(getArchivedSessions());
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";

    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "Unknown date";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown date";
    }
  };

  const loadSessions = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    if (sessions.length === 0) setLoading(true);
    
    setError(null);
    try {
      const data = await client.listSessions();
      const sessionsWithProvider: DisplaySession[] = data.map(s => ({
        ...s,
        providerId: 'jules' as CloudDevProviderId,
      }));
      setSessions(sessionsWithProvider.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (err) {
      console.error("Failed to load sessions:", err);
      if (err instanceof Error) {
        if (err.message.includes("Invalid API key")) {
          setError("Invalid API key. Please check your API key and try again.");
        } else if (err.message.includes("Resource not found")) {
          setSessions([]);
          setError(null);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to load sessions");
      }
      if (sessions.length === 0) setSessions([]); 
    } finally {
      setLoading(false);
    }
  }, [client, sessions.length]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshTrigger]);

  useDaemonEvent<SessionsListUpdatedPayload>(
    'sessions_list_updated',
    () => {
      loadSessions();
    },
    [loadSessions]
  );

  useDaemonEvent<{ sessionId?: string }>(
    'session_updated',
    () => {
      loadSessions();
    },
    [loadSessions]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "paused":
        return "bg-yellow-500";
      case "awaiting_approval":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
      case "running":
        return "Active";
      case "completed":
        return "Done";
      case "failed":
        return "Failed";
      case "paused":
        return "Paused";
      case "awaiting_approval":
        return "Pending";
      default:
        return status;
    }
  };

  const getDaysOld = (dateString: string) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      return differenceInDays(new Date(), date);
    } catch {
      return null;
    }
  };

  const getFirstTopic = (prompt: string | undefined, maxLength = 40) => {
    if (!prompt) return null;
    const firstLine = prompt.split('\n')[0].trim();
    return firstLine.length <= maxLength ? firstLine : firstLine.slice(0, maxLength) + "..."
  };

  const getRepoShortName = (sourceId: string) => {
    const parts = sourceId.split("/");
    return parts[parts.length - 1] || sourceId;
  };

  const visibleSessions = useMemo(() => {
    return sessions
      .filter((session) => !archivedSessionIds.has(session.id))
      .filter((session) => {
        const providerId = session.providerId || 'jules';
        return selectedProviders.has(providerId);
      })
      .filter((session) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const title = (session.title || "").toLowerCase();
        const repo = (session.sourceId || "").toLowerCase();
        return title.includes(query) || repo.includes(query);
      });
  }, [sessions, archivedSessionIds, searchQuery, selectedProviders]);

  const toggleProvider = (providerId: CloudDevProviderId) => {
    setSelectedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        if (next.size > 1) {
          next.delete(providerId);
        }
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  if (loading && sessions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 gap-3", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          Loading sessions...
        </p>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 p-6", className)}>
        <p className="text-xs text-destructive text-center">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSessions}
          className="h-7 text-[10px] font-mono uppercase tracking-widest"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (visibleSessions.length === 0 && !loading) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {showProviderFilter && configuredProviders.length > 1 && (
          <div className="px-3 py-2 border-b border-white/[0.08] shrink-0">
            <ProviderFilterDropdown
              configuredProviders={configuredProviders}
              selectedProviders={selectedProviders}
              onToggle={toggleProvider}
            />
          </div>
        )}
        <div className="flex items-center justify-center p-6 flex-1">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            {searchQuery
              ? "No sessions match your search."
              : sessions.length === 0
                ? "No sessions yet. Create one to get started!"
                : "All sessions are archived."}
          </p>
        </div>
      </div>
    );
  }

  const sessionLimit = 100;
  const dailySessionCount = sessions.filter((session) => {
    if (!session.createdAt) return false;
    try {
      return isToday(parseISO(session.createdAt));
    } catch {
      return false;
    }
  }).length;
  const percentage = Math.min((dailySessionCount / sessionLimit) * 100, 100);

  return (
    <TooltipProvider>
      <div className={cn("h-full flex flex-col bg-zinc-950 overflow-hidden", className)}>
        <div className="px-3 py-2 border-b border-white/[0.08] shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for repo or sessions"
              aria-label="Search sessions"
              className="h-7 w-full bg-black/50 pl-7 text-[10px] border-white/10 focus-visible:ring-purple-500/50 placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {showProviderFilter && configuredProviders.length > 1 && (
            <ProviderFilterDropdown
              configuredProviders={configuredProviders}
              selectedProviders={selectedProviders}
              onToggle={toggleProvider}
            />
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {visibleSessions.map((session) => {
              const daysOld = getDaysOld(session.createdAt);
              const displayDate = session.lastActivityAt || session.updatedAt || session.createdAt;
              const firstTopic = getFirstTopic(session.prompt);
              const providerId = session.providerId || 'jules';
              
              return (
              <CardSpotlight
                key={session.id}
                radius={250}
                color={selectedSessionId === session.id ? "#a855f7" : "#404040"}
                className={`relative ${
                  selectedSessionId === session.id ? "border-purple-500/30" : ""
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Select session ${session.title || "Untitled"}`}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left relative z-10 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-purple-500/50"
                  onClick={() => onSelectSession?.(session)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectSession?.(session);
                    }
                  }}
                >
                  <div className="flex-shrink-0 mt-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`}
                      title={getStatusLabel(session.status)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 w-full min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-[10px] font-bold leading-tight text-white uppercase tracking-wide flex-1 min-w-0 block overflow-hidden text-ellipsis whitespace-nowrap">
                            {truncateText(session.title || "Untitled", 30)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          align="start"
                          className="bg-zinc-900 border-white/10 text-white text-[10px] max-w-[200px] break-words z-[60]"
                        >
                          <p>{session.title || "Untitled"}</p>
                        </TooltipContent>
                      </Tooltip>
                      {configuredProviders.length > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "shrink-0 p-0.5 rounded",
                              providerId === 'jules' ? 'text-purple-400' : 'text-white/60'
                            )}>
                              {PROVIDER_ICONS[providerId]}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-zinc-900 border-white/10 text-white text-[10px] z-[60]">
                            {CLOUD_DEV_PROVIDERS[providerId]?.name || providerId}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Badge 
                        className={`shrink-0 text-[8px] px-1 py-0 h-3.5 font-mono border-0 rounded-sm uppercase tracking-wider ${
                          session.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                          session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          session.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          session.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                          session.status === 'awaiting_approval' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-white/10 text-white/70'
                        }`}
                      >
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                    
                    {firstTopic && (
                      <div className="text-[9px] text-white/50 leading-tight mb-1 truncate">
                        {firstTopic}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-[9px] text-white/40 leading-tight font-mono tracking-wide">
                      <span>{formatDate(displayDate)}</span>
                      {daysOld !== null && daysOld > 0 && (
                        <span className={`${daysOld > 7 ? 'text-orange-400/60' : ''}`}>
                          ({daysOld}d)
                        </span>
                      )}
                      {session.sourceId && (
                        <Badge className="text-[8px] px-1 py-0 h-3.5 font-mono bg-white/5 text-white/50 hover:bg-white/10 border-0 rounded-sm">
                          {getRepoShortName(session.sourceId)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardSpotlight>
            )})}
          </div>
        </ScrollArea>

        {/* Session Limit Indicator */}
        <div className="border-t border-white/[0.08] px-3 py-2.5 bg-black/50 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
              DAILY
            </span>
            <span className="text-[10px] font-mono font-bold text-white/60">
              {dailySessionCount}/{sessionLimit}
            </span>
          </div>
          <div className="w-full h-1 bg-white/5 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {dailySessionCount >= sessionLimit * 0.8 && (
            <p className="text-[8px] text-white/30 mt-1 leading-tight uppercase tracking-wider font-mono">
              {dailySessionCount >= sessionLimit
                ? "LIMIT REACHED"
                : "APPROACHING LIMIT"}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

interface ProviderFilterDropdownProps {
  configuredProviders: CloudDevProviderId[];
  selectedProviders: Set<CloudDevProviderId>;
  onToggle: (providerId: CloudDevProviderId) => void;
}

function ProviderFilterDropdown({ configuredProviders, selectedProviders, onToggle }: ProviderFilterDropdownProps) {
  const selectedCount = selectedProviders.size;
  const totalCount = configuredProviders.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10 w-full justify-between">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            <span>Providers</span>
          </div>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-white/20">
            {selectedCount}/{totalCount}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-zinc-900 border-white/10">
        <DropdownMenuLabel className="text-[10px] text-white/50 uppercase tracking-wider">
          Filter by Provider
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {configuredProviders.map((providerId) => {
          const config = CLOUD_DEV_PROVIDERS[providerId];
          return (
            <DropdownMenuCheckboxItem
              key={providerId}
              checked={selectedProviders.has(providerId)}
              onCheckedChange={() => onToggle(providerId)}
              className="text-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-white/60">{PROVIDER_ICONS[providerId]}</span>
                <span>{config?.name || providerId}</span>
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
