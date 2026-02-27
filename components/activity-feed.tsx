'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import useSWR from 'swr'; // Keeping for potential future use, though origin uses manual polling
import { useJules } from '@/lib/jules/provider';
import type { CloudDevProviderId } from '@/types/cloud-dev';
import { CLOUD_DEV_PROVIDERS } from '@/types/cloud-dev';
import type { Activity, Session, Artifact } from '@jules/shared';
import { exportSessionToJSON, exportSessionToMarkdown } from '@/lib/export';
import { useNotifications } from '@/hooks/use-notifications';
import { useDaemonEvent } from '@/lib/hooks/use-daemon-events';
import type { ActivitiesUpdatedPayload } from '@jules/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { Send, Archive, ArchiveRestore, Code, Terminal, ChevronDown, ChevronRight, Play, GitBranch, GitPullRequest, MoreVertical, Book, ArrowUp, ArrowDown, Download, Copy, Check, Loader2, Bell, Users, LayoutTemplate, Sparkles, Bot, Cpu, Zap, Github, Blocks as BlocksIcon, MessageSquare, FileCode } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { archiveSession, unarchiveSession, isSessionArchived } from '@/lib/archive';
import { ActivityInput } from './activity-input';
import { SessionHealthBadge } from './session-health-badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BashOutput } from '@/components/ui/bash-output';
import { NewSessionDialog } from './new-session-dialog';
import { ReviewScorecard } from './review/review-scorecard';
import { DebateDialog } from './debate-dialog';
import { DebateViewer } from './debate-viewer';
import { PlanContent } from './plan-content';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

interface ActivityFeedProps {
  session: Session;
  onArchive?: () => void;
  showCodeDiffs: boolean;
  onToggleCodeDiffs: (show: boolean) => void;
  onActivitiesChange: (activities: Activity[]) => void;
  onStartDebate?: () => void;
  onSaveTemplate?: () => void;
  onReviewArtifact?: (artifact: Artifact) => void;
}

const PROVIDER_ICONS: Record<CloudDevProviderId, React.ReactNode> = {
  jules: <Sparkles className="h-3 w-3" />,
  devin: <Bot className="h-3 w-3" />,
  manus: <Cpu className="h-3 w-3" />,
  openhands: <Zap className="h-3 w-3" />,
  'github-spark': <Github className="h-3 w-3" />,
  blocks: <BlocksIcon className="h-3 w-3" />,
  'claude-code': <MessageSquare className="h-3 w-3" />,
  codex: <FileCode className="h-3 w-3" />,
};

const PROVIDER_COLORS: Record<CloudDevProviderId, string> = {
  jules: '#4285F4',
  devin: '#00D4AA',
  manus: '#FF6B35',
  openhands: '#8B5CF6',
  'github-spark': '#238636',
  blocks: '#D97706',
  'claude-code': '#D97706',
  codex: '#10A37F',
};

function getProviderIdFromSessionId(sessionId: string): CloudDevProviderId {
  const colonIndex = sessionId.indexOf(':');
  if (colonIndex > 0) {
    return sessionId.slice(0, colonIndex) as CloudDevProviderId;
  }
  return 'jules';
}

export function ActivityFeed({ session, onArchive, showCodeDiffs, onToggleCodeDiffs, onActivitiesChange, onStartDebate, onSaveTemplate, onReviewArtifact }: ActivityFeedProps) {
  const { client } = useJules();
  const providerId = getProviderIdFromSessionId(session.id);
  const providerConfig = CLOUD_DEV_PROVIDERS[providerId];
  const [sending, setSending] = useState(false);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedBashOutputs, setExpandedBashOutputs] = useState<Set<string>>(new Set());
  const [isArchived, setIsArchived] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [localError, setLocalError] = useState<string | null>(null);
  const { sendNotification, permission, requestPermission } = useNotifications();
  // We need loading state from origin
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  // We need error state from origin
  const [error, setError] = useState<string | null>(null);

  // Check archive status on session change
  useEffect(() => {
    setIsArchived(isSessionArchived(session.id));
  }, [session.id]);

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

  const formatContent = (content: string, metadata?: Record<string, unknown>) => {
    if (content === '[userMessaged]' || content === '[agentMessaged]') {
        const realContent = metadata?.original_content || metadata?.message || metadata?.text;
        if (realContent && typeof realContent === 'string') {
             return formatContent(realContent, undefined);
        }
        if (content === '[userMessaged]') return <span className="text-white/50 italic">Message sent</span>;
        if (content === '[agentMessaged]') return <span className="text-white/50 italic">Agent working...</span>;
    }

    if (content.startsWith('{') || content.startsWith('[')) {
        try {
          const parsed = JSON.parse(content);
          if (typeof parsed === 'object' && parsed !== null) {
             if (Array.isArray(parsed) && parsed.length === 0) return null;
             if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) return null;
          }

          // Check for ReviewResult structure (score + issues + summary)
          if (!Array.isArray(parsed) && 'score' in parsed && 'issues' in parsed && 'summary' in parsed) {
             return <ReviewScorecard result={parsed} />;
          }

          if (Array.isArray(parsed) || (parsed.steps && Array.isArray(parsed.steps))) {
             // Assuming PlanContent component is available, if not we fall back to pre
             // For now, I will use PlanContent if I can find it, otherwise JSON stringify
             return <PlanContent content={parsed} />;
          }
          return <pre className="text-[11px] overflow-x-auto font-mono bg-muted/50 p-2 rounded">{JSON.stringify(parsed, null, 2)}</pre>;
        } catch { }
    }

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:text-xs prose-p:leading-relaxed prose-p:break-words prose-headings:text-xs prose-headings:font-semibold prose-headings:mb-1 prose-headings:mt-2 prose-ul:text-xs prose-ol:text-xs prose-li:text-xs prose-li:my-0.5 prose-code:text-[11px] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:break-all prose-pre:text-[11px] prose-pre:bg-muted prose-pre:p-2 prose-pre:overflow-x-auto prose-blockquote:text-xs prose-blockquote:border-l-primary prose-strong:font-semibold">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
    );
  };

  const loadActivities = useCallback(async (isInitialLoad = true) => {
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      if (isInitialLoad) setLoading(true);
      setError(null);

      const sessionDetails = await client.getSession(session.id);
      const data = await client.listActivities(session.id);

      if (sessionDetails.prompt) {
         const hasPrompt = data.some(a => a.content === sessionDetails.prompt);
         if (!hasPrompt) {
            data.unshift({
              id: 'initial-prompt',
              sessionId: session.id,
              type: 'message',
              role: 'user',
              content: sessionDetails.prompt,
              createdAt: session.createdAt
            });
         }
      }

      setActivities(prevActivities => {
        if (prevActivities.length === 0 || isInitialLoad) return data;
        const prevIds = new Set(prevActivities.map(a => a.id));
        const newActivities = data.filter(newAct => !prevIds.has(newAct.id));
        if (newActivities.length > 0) {
          setNewActivityIds(new Set(newActivities.map(a => a.id)));
          setTimeout(() => setNewActivityIds(new Set()), 500);
          
          // Notification Logic from HEAD
          const newAgentMessage = newActivities.find(a => a.role === 'agent' && (a.type === 'message' || a.type === 'plan' || a.type === 'error'));
          if (newAgentMessage && document.hidden && permission === 'granted') {
             const title = newAgentMessage.type === 'error' ? 'Jules Error' : 'Jules Update';
             sendNotification(title, {
                 body: newAgentMessage.content.substring(0, 100) + (newAgentMessage.content.length > 100 ? '...' : ''),
                 tag: session.id
             });
          }

          return [...prevActivities, ...newActivities];
        }
        return prevActivities;
      });
    } catch (err) {
      console.error('Failed to load activities:', err);
      if (err instanceof Error && err.message.includes('Resource not found')) {
        setActivities([]);
        setError(null);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load activities';
        setError(errorMessage);
        if (isInitialLoad) setActivities([]);
      }
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [client, session.id, session.createdAt, permission, sendNotification]);

  useEffect(() => {
    loadActivities(true);
  }, [session.id, loadActivities]);

  useDaemonEvent<ActivitiesUpdatedPayload>(
    'activities_updated',
    (data) => {
      if (data?.sessionId === session.id && !isArchived) {
        loadActivities(false);
      }
    },
    [session.id, isArchived, loadActivities]
  );

  useDaemonEvent<{ sessionId?: string }>(
    'session_updated',
    (data) => {
      if (data?.sessionId === session.id && !isArchived) {
        loadActivities(false);
      }
    },
    [session.id, isArchived, loadActivities]
  );

  useEffect(() => {
    onActivitiesChange(activities);
  }, [activities, onActivitiesChange]);

  const handleApprovePlan = async () => {
    if (!client || approvingPlan || isArchived) return;
    try {
      setApprovingPlan(true);
      setLocalError(null);
      await client.approvePlan(session.id);
      // Optimistic update or just trigger revalidation
      setTimeout(() => loadActivities(false), 1000);
    } catch (err) {
      console.error('Failed to approve plan:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to approve plan');
    } finally {
      setApprovingPlan(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!client || sending || isArchived) return;
    try {
      setSending(true);
      setLocalError(null);
      const userMessage = await client.createActivity({
        sessionId: session.id,
        content: content.trim(),
      });
      
      // Optimistically update the list
      setActivities(prev => [...prev, userMessage]);

      // Poll for agent's response after a short delay
      setTimeout(() => loadActivities(false), 2000);
    } catch (err) {
      console.error("Failed to send message:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setLocalError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReview = async () => {
    if (!client || sending) return;
    try {
        setSending(true);
        setError(null);

        // 1. Add an optimistic "I'm starting the review..." message from the user
        const userPrompt = "Start a comprehensive code review.";
        const userMessage = await client.createActivity({
            sessionId: session.id,
            content: userPrompt,
            role: 'user',
            type: 'message'
        });
        setActivities(prev => [...prev, userMessage]);

        // 2. Gather local context to make the review specific
        let codeContext = "";
        try {
             if (typeof client.gatherRepositoryContext === 'function') {
                 codeContext = await client.gatherRepositoryContext('.');
             }
        } catch (e) {
             console.warn("Could not gather local context for in-session review:", e);
             codeContext = "Could not access local files. Please review based on available knowledge.";
        }

        // 3. Call the specialized API endpoint
        // Extract PR URL from session metadata if available
        const prUrl = session.metadata?.pull_request && typeof session.metadata.pull_request === 'object' && 'url' in session.metadata.pull_request 
            ? (session.metadata.pull_request as { url: string }).url 
            : undefined;

        const response = await fetch('/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codeContext,
                provider: 'openai', 
                model: 'gpt-4o',
                apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '', // Fallback to env var if available
                outputFormat: 'json',
                reviewType: 'comprehensive',
                prUrl
            })
        });

        if (!response.ok) {
            throw new Error(`Review failed: ${response.statusText}`);
        }

        const reviewResult = await response.json();

        // 4. Create the 'result' activity with the JSON payload
        const agentActivity = await client.createActivity({
            sessionId: session.id,
            content: JSON.stringify(reviewResult, null, 2),
            role: 'agent',
            type: 'result'
        });

        setActivities(prev => [...prev, agentActivity]);

    } catch (err) {
        console.error('Failed to run review:', err);
        setError(err instanceof Error ? err.message : 'Failed to run review');
    } finally {
        setSending(false);
    }
  };

  const handleArchive = () => {
    archiveSession(session.id);
    setIsArchived(true);
    onArchive?.();
  };

  const handleUnarchive = () => {
    unarchiveSession(session.id);
    setIsArchived(false);
    onArchive?.();
  };

  const toggleCodeDiffsSidebar = () => {
    onToggleCodeDiffs(!showCodeDiffs);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (format: 'json' | 'txt' | 'md') => {
    if (format === 'json') {
      exportSessionToJSON(session, activities);
    } else {
      // Use Markdown export for both .md and .txt (it's readable text)
      exportSessionToMarkdown(session, activities);
    }
  };

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('#activity-feed-scroll-area [data-radix-scroll-area-viewport]');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  };

  const scrollToBottom = () => {
    const scrollContainer = document.querySelector('#activity-feed-scroll-area [data-radix-scroll-area-viewport]');
    if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const filteredActivities = useMemo(() => activities.filter((activity) => {
    if (activity.bashOutput || activity.diff || activity.media) return true;
    const content = activity.content?.trim();
    if (!content) return false;
    const cleanContent = content.replace(/\s/g, '');
    if (cleanContent === '{}' || cleanContent === '[]') return false;
    if (content.startsWith('{') || content.startsWith('[')) {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          if (Array.isArray(parsed) && parsed.length === 0) return false;
          if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) return false;
        }
      } catch { }
    }
    return true;
  }), [activities]);

  const groupedActivities = useMemo(() => {
    const grouped: Array<Activity | Activity[]> = [];
    let currentGroup: Activity[] | null = null;

    filteredActivities.forEach((activity, index) => {
      const shouldGroup = activity.type === 'progress' && activity.role === 'agent';
      const prevActivity = index > 0 ? filteredActivities[index - 1] : null;
      const prevShouldGroup = prevActivity && prevActivity.type === 'progress' && prevActivity.role === 'agent';

      if (shouldGroup) {
        if (prevShouldGroup && currentGroup) currentGroup.push(activity);
        else {
          currentGroup = [activity];
          grouped.push(currentGroup);
        }
      } else {
        currentGroup = null;
        grouped.push(activity);
      }
    });
    return grouped;
  }, [filteredActivities]);

  const virtualizer = useVirtualizer({
    count: groupedActivities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const finalDiff = activities.filter(activity => activity.diff).slice(-1);
  const hasDiffs = finalDiff.length > 0;
  const outputBranch = session.branch || 'main';

  const toggleBashOutput = (activityId: string) => {
    setExpandedBashOutputs(prev => {
      const next = new Set(prev);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  };

  const getActivityIcon = (activity: Activity) => {
    if (activity.role === 'user') {
      return <AvatarFallback className="bg-purple-500 text-white text-[9px] font-bold uppercase tracking-wider">U</AvatarFallback>;
    }
    return <AvatarFallback className="bg-white text-black text-[9px] font-bold uppercase tracking-wider">J</AvatarFallback>;
  };

  const getActivityTypeColor = (type: Activity['type']) => {
    switch (type) {
      case 'message': return 'bg-blue-500';
      case 'plan': return 'bg-purple-500';
      case 'progress': return 'bg-yellow-500';
      case 'result': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'debate': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const sessionDuration = session.createdAt ? Math.floor((new Date().getTime() - new Date(session.createdAt).getTime()) / 1000 / 60) : 0;

  const getStatusInfo = () => {
    if (session.status === 'active') return { color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Active', icon: '●' };
    if (session.status === 'completed') return { color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Completed', icon: '✓' };
    if (session.status === 'failed') return { color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Failed', icon: '✕' };
    if (session.status === 'paused') return { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Paused', icon: '⏸' };
    return { color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: session.status, icon: '○' };
  };

  const statusInfo = getStatusInfo();
  const pullRequest = session.metadata?.pull_request as { url: string, number: number } | undefined;

  if (loading && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
          Loading activities...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black relative">
      <div className="border-b border-white/[0.08] bg-zinc-950/95 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wide truncate text-white">{session.title}</h2>
              <div className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded" style={{ backgroundColor: `${PROVIDER_COLORS[providerId]}20`, color: PROVIDER_COLORS[providerId] }}>
                {PROVIDER_ICONS[providerId]}
                <span>{providerConfig.name}</span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${statusInfo.bgColor} ${statusInfo.color}`}>
                <span>{statusInfo.icon}</span>
                <span>{statusInfo.label}</span>
              </div>
              <SessionHealthBadge session={session} />
              {pullRequest && (
                <a href={pullRequest.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-green-500/10 text-green-400 hover:text-green-300 hover:underline border border-green-500/20 rounded">
                  <GitPullRequest className="h-3 w-3" />
                  <span>PR Created</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono text-white/40 uppercase tracking-wide">
              <span>Started {formatDate(session.createdAt)}</span>
              <span>•</span>
              <div className="flex items-center gap-1 text-white/60">
                <Book className="h-3 w-3" />
                <span>{session.sourceId}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                <span>{session.branch || 'main'}</span>
              </div>
              {session.status === 'active' && (
                <>
                  <span>•</span>
                  <span>Running {sessionDuration}m</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasDiffs && (
              <Button variant="ghost" size="icon" onClick={toggleCodeDiffsSidebar} className={`h-7 w-7 hover:bg-white/5 ${showCodeDiffs ? 'bg-purple-500/20 text-purple-400' : 'text-white/60'}`}>
                <Code className="h-3.5 w-3.5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5 text-white/60">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-white/10 text-white/80">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    <Download className="mr-2 h-3.5 w-3.5" /> Export Chat
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-zinc-950 border-white/10 text-white/80">
                    <DropdownMenuItem onClick={() => handleExport('md')} className="text-xs cursor-pointer">Markdown</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('txt')} className="text-xs cursor-pointer">Text</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json')} className="text-xs cursor-pointer">JSON</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => handleCopy(JSON.stringify(activities, null, 2), 'full')} className="text-xs cursor-pointer">
                  {copiedId === 'full' ? <Check className="mr-2 h-3.5 w-3.5 text-green-500" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                  Copy Full JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                
                {permission === 'default' && (
                    <DropdownMenuItem onClick={requestPermission} className="text-xs cursor-pointer">
                        <Bell className="mr-2 h-3.5 w-3.5" />
                        Enable Notifications
                    </DropdownMenuItem>
                )}

                {session.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={handleQuickReview} disabled={sending} className="focus:bg-white/10 focus:text-white text-xs cursor-pointer">
                      <Play className="mr-2 h-3.5 w-3.5" />
                      <span>Start Code Review</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStartDebate?.(); }} className="focus:bg-white/10 focus:text-white text-xs cursor-pointer">
                      <Users className="mr-2 h-3.5 w-3.5" />
                      <span>Start Debate</span>
                    </DropdownMenuItem>
                    {onSaveTemplate && (
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onSaveTemplate(); }} className="focus:bg-white/10 focus:text-white text-xs cursor-pointer text-purple-400 focus:text-purple-400">
                        <LayoutTemplate className="mr-2 h-3.5 w-3.5" />
                        <span>Save as Template</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {isArchived ? (
                  <DropdownMenuItem onClick={handleUnarchive} className="text-xs cursor-pointer text-purple-400 focus:text-purple-400">
                    <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                    Unarchive Session
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleArchive} className="text-xs cursor-pointer text-red-400 focus:text-red-400">
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    Archive Session
                  </DropdownMenuItem>
                )}
                {session.status === 'completed' && hasDiffs && (
                  <NewSessionDialog
                    onSessionCreated={() => {}}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-white/10 focus:text-white text-xs cursor-pointer">
                        <GitPullRequest className="mr-2 h-3.5 w-3.5" />
                        <span>Review & Create PR</span>
                      </DropdownMenuItem>
                    }
                    initialValues={{
                      sourceId: session.sourceId ? `sources/github/${session.sourceId}` : undefined,
                      title: outputBranch ? `Review: ${outputBranch}` : 'PR Review',
                      prompt: 'Review the changes in this branch. Verify they meet the requirements, check for bugs, and draft a Pull Request description.',
                      startingBranch: outputBranch || undefined
                    }}
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isArchived && (
        <div className="bg-zinc-900 border-b border-white/[0.08] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-white/40" />
            <span className="text-[11px] font-mono text-white/60 uppercase tracking-wide">Archived Session (Read-only)</span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleUnarchive} className="h-6 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
            Unarchive
          </Button>
        </div>
      )}

      {error && (
        <div className="border-b border-white/[0.08] bg-red-950/20 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-mono text-red-400 uppercase tracking-wide">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadActivities(false)} className="h-7 text-[10px] border-white/10 hover:bg-white/5 text-white/80">Retry</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative group">
        <ScrollArea className="h-full" ref={parentRef} id="activity-feed-scroll-area">
          <div 
            className="p-3 relative" 
            style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%' }}
          >
            {groupedActivities.length === 0 && !loading && !error && (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center space-y-4 max-w-md">
                  <Sparkles className="h-8 w-8 text-white/10 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">No activities yet</p>
                    <p className="text-xs text-white/30 leading-relaxed">
                      Jules is initializing or waiting for input. Send a message below to start the conversation, or wait for the agent to begin processing the initial prompt.
                    </p>
                    {session.status !== 'completed' && session.status !== 'failed' && (
                      <p className="text-[9px] font-mono text-purple-400/50 uppercase tracking-wide">
                        Session is {session.status}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = groupedActivities[virtualItem.index];
              if (!item) return null;

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: '10px'
                  }}
                >
                  {Array.isArray(item) ? (() => {
                    const firstActivity = item[0];
                    const validItems = item.filter(a => formatContent(a.content, a.metadata) !== null);
                    if (validItems.length === 0) return null;

                    return (
                      <div className="flex gap-2.5 px-3">
                        <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-zinc-900 border border-white/10">{getActivityIcon(firstActivity)}</Avatar>
                        <Card className="flex-1 border-white/[0.08] bg-zinc-950/50">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider bg-yellow-500/90 border-transparent text-black font-bold">progress</Badge>
                              <span className="text-[9px] font-mono text-white/40 tracking-wide">{validItems.length} updates</span>
                            </div>
                            <div className="space-y-2">
                              {validItems.map((activity, idx) => (
                                <div key={activity.id} className={idx > 0 ? 'pt-2 border-t border-white/[0.08]' : ''}>
                                  <div className="text-[11px] leading-relaxed text-white/90 break-words">{formatContent(activity.content, activity.metadata)}</div>
                                  {activity.bashOutput && (
                                    <div className="mt-2 pt-2 border-t border-white/[0.05]">
                                      <button
                                        onClick={() => toggleBashOutput(activity.id)}
                                        className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors mb-2"
                                      >
                                        {expandedBashOutputs.has(activity.id) ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                        <Terminal className="h-3 w-3" />
                                        <span>Command Output</span>
                                      </button>
                                      {expandedBashOutputs.has(activity.id) && (
                                        <BashOutput output={activity.bashOutput} />
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })() : (() => {
                    const activity = item;
                    if (activity.type === 'debate' && activity.metadata?.debate) {
                        return (
                            <div className={`flex gap-2.5 px-3 ${newActivityIds.has(activity.id) ? 'animate-in fade-in slide-in-from-bottom-2 duration-500' : ''}`}>
                                <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-zinc-900 border border-white/10">{getActivityIcon(activity)}</Avatar>
                                <div className="flex-1">
                                    <DebateViewer result={activity.metadata.debate as any} />
                                </div>
                            </div>
                        );
                    }

                    const contentNode = formatContent(activity.content, activity.metadata);
                    if (contentNode === null && !activity.media) return null;
                    const showApprove = !isArchived && activity.type === 'plan' && session.status === 'awaiting_approval';

                    return (
                      <div className={`flex gap-2.5 px-3 ${activity.role === 'user' ? 'flex-row-reverse' : ''} ${newActivityIds.has(activity.id) ? 'animate-in fade-in slide-in-from-bottom-2 duration-500' : ''}`}>
                        <Avatar className="h-6 w-6 shrink-0 mt-0.5 bg-zinc-900 border border-white/10">{getActivityIcon(activity)}</Avatar>
                        <Card className={`flex-1 border-white/[0.08] ${activity.role === 'user' ? 'bg-purple-950/20 border-purple-500/20' : 'bg-zinc-950/50'}`}>
                          <CardContent className="p-3 group/card relative">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 font-mono uppercase tracking-wider ${getActivityTypeColor(activity.type)} border-transparent text-black font-bold`}>{activity.type}</Badge>
                              <span className="text-[9px] font-mono text-white/40 tracking-wide">{formatDate(activity.createdAt)}</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => handleCopy(activity.content, activity.id)}>
                                {copiedId === activity.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-white/40" />}
                              </Button>
                            </div>
                            {activity.media && activity.media.data && (
                               <div className="mb-2 rounded overflow-hidden border border-white/10">
                                  <img src={`data:${activity.media.mimeType};base64,${activity.media.data}`} alt="Generated Artifact" className="max-w-full h-auto block" />
                               </div>
                            )}
                            <div className="text-[11px] leading-relaxed text-white/90 break-words">{contentNode}</div>
                            {activity.bashOutput && (
                              <div className="mt-3 pt-3 border-t border-white/[0.08]">
                                <button onClick={() => toggleBashOutput(activity.id)} className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-green-400 hover:text-green-300 transition-colors mb-2">
                                  {expandedBashOutputs.has(activity.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  <Terminal className="h-3.5 w-3.5" />
                                  <span>Command Output</span>
                                </button>
                                {expandedBashOutputs.has(activity.id) && <BashOutput output={activity.bashOutput} />}
                              </div>
                            )}
                            {showApprove && (
                              <div className="mt-3 pt-3 border-t border-white/[0.08]">
                                <Button onClick={handleApprovePlan} disabled={approvingPlan} size="sm" className="h-7 px-3 text-[9px] font-mono uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white border-0">
                                  {approvingPlan ? 'Approving...' : 'Approve Plan'}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800" onClick={scrollToTop} title="Jump to Top">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800" onClick={scrollToBottom} title="Jump to Bottom">
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isArchived && (
        <ActivityInput 
          onSendMessage={handleSendMessage} 
          disabled={sending} 
          placeholder="Send a message to Jules..." 
        />
      )}
      {session.status === 'failed' && (
        <div className="border-t border-white/[0.08] bg-zinc-950/95 p-3 text-center">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
            Session {session.status} • Cannot send new messages
          </p>
        </div>
      )}
    </div>
  );
}
