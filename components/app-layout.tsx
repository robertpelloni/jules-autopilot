'use client';

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJules } from "@/lib/jules/provider";
import type { Session, Activity, SessionTemplate, Artifact } from "@/types/jules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SessionKeeperManager } from "./session-keeper-manager";
import { SessionKeeper } from "@/components/SessionKeeper";
import { useSessionKeeperStore } from "@/lib/stores/session-keeper";
import { DebateDialog, UIParticipant } from './debate-dialog';

import { AppHeader } from "./layout/app-header";
import { AppSidebar } from "./layout/app-sidebar";
import { MainContent } from "./layout/main-content";
import { SearchCommandDialog } from "./search-command-dialog";

interface AppLayoutProps {
  initialView?: "sessions" | "analytics" | "templates" | "kanban" | "debates" | "board" | "artifacts";
}

export function AppLayout({ initialView }: AppLayoutProps) {
  const { client, apiKey, clearApiKey } = useJules();
  const { config, setConfig } = useSessionKeeperStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<'sessions' | 'analytics' | 'templates' | 'kanban' | 'debates' | 'board' | 'artifacts'>('sessions');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [codeDiffSidebarCollapsed, setCodeDiffSidebarCollapsed] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [showCodeDiffs, setShowCodeDiffs] = useState(false);
  const [currentActivities, setCurrentActivities] = useState<Activity[]>([]);
  const [codeSidebarWidth, setCodeSidebarWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);

  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newSessionInitialValues, setNewSessionInitialValues] = useState<{
    sourceId?: string;
    title?: string;
    prompt?: string;
    startingBranch?: string;
  } | undefined>(undefined);

  // API Key Dialog State
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  // Search Dialog State
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    // Only update if the value actually changes to avoid unnecessary renders
    // Use setTimeout to avoid synchronous state updates during render phase
    const timer = setTimeout(() => {
      if (!apiKey && !isApiKeyDialogOpen) {
        setIsApiKeyDialogOpen(true);
      } else if (apiKey && isApiKeyDialogOpen) {
        setIsApiKeyDialogOpen(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [apiKey, isApiKeyDialogOpen]);

  const handleApiKeySuccess = () => {
    setIsApiKeyDialogOpen(false);
  };

  // Debate Dialog State
  const [debateOpen, setDebateOpen] = useState(false);
  const [debateTopic, setDebateTopic] = useState('');
  const [debateContext, setDebateContext] = useState('');

  // Map session keeper participants to UI participants
  const debateParticipants: UIParticipant[] | undefined = config.debateParticipants?.map(p => {
    const provider = p.provider as 'openai' | 'anthropic' | 'gemini' | 'qwen';
    const providerConfigs: Record<string, { apiKeyKey: string, envFallback: string }> = {
      openai: { apiKeyKey: 'openai_api_key', envFallback: 'NEXT_PUBLIC_OPENAI_KEY' },
      anthropic: { apiKeyKey: 'anthropic_api_key', envFallback: 'NEXT_PUBLIC_ANTHROPIC_KEY' },
      gemini: { apiKeyKey: 'google_api_key', envFallback: 'NEXT_PUBLIC_GEMINI_KEY' },
      qwen: { apiKeyKey: 'qwen_api_key', envFallback: 'NEXT_PUBLIC_QWEN_KEY' }
    };
    const providerConfig = providerConfigs[provider] || providerConfigs.openai;

    return {
      ...p,
      provider,
      apiKeyKey: providerConfig.apiKeyKey,
      envFallback: providerConfig.envFallback
    };
  });

  const handleStartDebate = (topic?: string, context?: string) => {
      setDebateTopic(topic || '');
      setDebateContext(context || '');
      setDebateOpen(true);
  };

  const handleReviewArtifact = (artifact: Artifact) => {
      const content = artifact.changeSet?.gitPatch?.unidiffPatch || artifact.changeSet?.unidiffPatch || '';
      handleStartDebate(`Code Review: ${artifact.name || 'Artifact'}`, content);
      setView('sessions');
  };

  // Sync session selection with URL query param
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    if (sessionId && client) {
      if (selectedSession?.id !== sessionId) {
        // Prevent infinite loop if we are already in the process of selecting this session
        // or if the session ID is invalid
        client.getSession(sessionId)
          .then(session => {
            if (session.id === sessionId) {
                // Only update if the fetched session matches the URL (handle race conditions)
                // and if it's different from current
                setSelectedSession(prev => prev?.id === session.id ? prev : session);
                setView('sessions');
            }
          })
          .catch(err => {
            console.error('Failed to load session from URL', err);
            // Optionally clear the invalid session ID from URL to prevent loop
          });
      }
    } else if (!sessionId && selectedSession) {
        // If URL has no sessionId but we have a selected session, we might want to clear it
        // Or do nothing if we want to persist state despite URL.
        // For now, let's respect the URL as the source of truth for "no session selected" ONLY if needed
        // But clicking "Sessions" in header might clear URL.
    }
  }, [searchParams, client, selectedSession?.id]);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        if (newWidth > 300 && newWidth < 1200) {
          setCodeSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleSessionSelect = (session: Session | string) => {
    const sessionId = typeof session === 'string' ? session : session.id;
    const sessionObj = typeof session === 'string' ? null : session;

    // Optimistic update to prevent the useEffect loop
    if (selectedSession?.id === sessionId) return;
    
    if (sessionObj) {
        setSelectedSession(sessionObj);
    }
    
    setView('sessions');
    setMobileMenuOpen(false);
    
    // Update URL without triggering a full page navigation if possible, 
    // but Next.js router.push will trigger the searchParams effect.
    // The key is ensuring the effect condition `selectedSession?.id !== sessionId` handles it.
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('sessionId', sessionId);
    router.push(`/?${newParams.toString()}`);
  };

  const handleSessionSelectById = (sessionId: string) => {
    if (client) {
        client.getSession(sessionId).then(handleSessionSelect).catch(console.error);
    }
  };

  const handleSessionCreated = (sessionId: string) => {
    setRefreshKey((prev) => prev + 1);
    setIsNewSessionOpen(false);
    if (client) {
      client.getSession(sessionId).then(handleSessionSelect).catch(console.error);
    }
  };

  const handleSessionArchived = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleLogout = () => {
    clearApiKey();
    setSelectedSession(null);
  };

  const handleStartSessionFromTemplate = (template: SessionTemplate) => {
    setNewSessionInitialValues({
      prompt: template.prompt,
      title: template.title
    });
    setIsNewSessionOpen(true);
  };

  const handleOpenNewSession = () => {
    setNewSessionInitialValues(undefined);
    setIsNewSessionOpen(true);
  };

  // Session Keeper Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-black max-w-full overflow-hidden">
      <SearchCommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">API Key Required</DialogTitle>
            <DialogDescription className="text-white/40">
              Enter your Jules API key to start a session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">Please configure API key in settings.</div>
        </DialogContent>
      </Dialog>
      
      <SessionKeeperManager />
      
      <AppHeader
        view={view}
        setView={setView}
        onToggleSearch={() => setIsSearchOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        refreshKey={refreshKey}
        selectedSession={selectedSession}
        onSelectSession={handleSessionSelect}
        isNewSessionOpen={isNewSessionOpen}
        setIsNewSessionOpen={setIsNewSessionOpen}
        newSessionInitialValues={newSessionInitialValues}
        onSessionCreated={(id) => handleSessionCreated(id || '')}
        onOpenNewSession={handleOpenNewSession}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        isLogPanelOpen={isLogPanelOpen}
        setIsLogPanelOpen={setIsLogPanelOpen}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          refreshKey={refreshKey}
          onSelectSession={handleSessionSelect}
          selectedSessionId={selectedSession?.id}
        />

        {/* Resizable Panel Group (Vertical: Top = Main, Bottom = Logs) */}
        <ResizablePanelGroup 
          direction="vertical" 
          className="flex-1 min-w-0"
          key={isLogPanelOpen ? "vertical-layout-open" : "vertical-layout-closed"}
        >

          {/* Main Panel: Dashboard */}
          <ResizablePanel defaultSize={isLogPanelOpen ? 70 : 100} minSize={30} className="min-w-0">
            <MainContent
              view={view}
              selectedSession={selectedSession}
              onSessionSelect={handleSessionSelect}
              onStartSessionFromTemplate={handleStartSessionFromTemplate}
              onArchiveSession={handleSessionArchived}
              showCodeDiffs={showCodeDiffs}
              onToggleCodeDiffs={setShowCodeDiffs}
              onActivitiesChange={setCurrentActivities}
              currentActivities={currentActivities}
              codeDiffSidebarCollapsed={codeDiffSidebarCollapsed}
              onToggleCodeDiffSidebar={() => setCodeDiffSidebarCollapsed(!codeDiffSidebarCollapsed)}
              codeSidebarWidth={codeSidebarWidth}
              isResizing={isResizing}
              onStartResizing={startResizing}
              onOpenNewSession={handleOpenNewSession}
              onReviewArtifact={handleReviewArtifact}
              onStartDebate={handleStartDebate}
            />
          </ResizablePanel>

          {/* Bottom Panel: System/Logs */}
          {isLogPanelOpen && (
            <>
              <ResizableHandle 
                withHandle 
                className="min-h-[8px] w-full cursor-row-resize bg-zinc-900 border-y border-white/10 hover:bg-purple-500/20 transition-colors" 
              />
              <ResizablePanel defaultSize={30} minSize={10} maxSize={50}>
                <SessionKeeper onClose={() => setIsLogPanelOpen(false)} isSidebar={false} />
              </ResizablePanel>
            </>
          )}

        </ResizablePanelGroup>
      </div>

      {selectedSession && (
        <DebateDialog
          sessionId={selectedSession.id}
          open={debateOpen}
          onOpenChange={setDebateOpen}
          initialTopic={debateTopic}
          initialContext={debateContext}
          initialParticipants={debateParticipants}
          onDebateStart={() => setRefreshKey(prev => prev + 1)}
        />
      )}
    </div>
  );
}
