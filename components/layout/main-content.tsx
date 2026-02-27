import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { TemplatesPage } from "@/components/templates-page";
import { KanbanBoard } from "@/components/kanban-board";
import { ActivityFeed } from "@/components/activity-feed";
import { CodeDiffSidebar } from "@/components/code-diff-sidebar";
import { DebateHistoryList } from "@/components/debate-history-list";
import { Session, Activity, SessionTemplate, Artifact } from '@jules/shared';

interface MainContentProps {
  view: 'sessions' | 'analytics' | 'templates' | 'kanban' | 'debates' | 'board' | 'artifacts';
  selectedSession: Session | null;
  onSessionSelect: (session: Session) => void;
  onStartSessionFromTemplate: (template: SessionTemplate) => void;
  onArchiveSession: () => void;
  showCodeDiffs: boolean;
  onToggleCodeDiffs: (show: boolean) => void;
  onActivitiesChange: (activities: Activity[]) => void;
  currentActivities: Activity[];
  codeDiffSidebarCollapsed: boolean;
  onToggleCodeDiffSidebar: () => void;
  codeSidebarWidth: number;
  isResizing: boolean;
  onStartResizing: () => void;
  onOpenNewSession: () => void;
  onReviewArtifact: (artifact: Artifact) => void;
  onStartDebate: (topic?: string, context?: string) => void;
}

export function MainContent({
  view,
  selectedSession,
  onSessionSelect,
  onStartSessionFromTemplate,
  onArchiveSession,
  showCodeDiffs,
  onToggleCodeDiffs,
  onActivitiesChange,
  currentActivities,
  codeDiffSidebarCollapsed,
  onToggleCodeDiffSidebar,
  codeSidebarWidth,
  isResizing,
  onStartResizing,
  onOpenNewSession,
  onReviewArtifact,
  onStartDebate,
}: MainContentProps) {
  return (
    <div className="flex h-full w-full flex-row min-w-0">
      <main className="flex-1 overflow-hidden bg-black flex flex-col min-w-0">
        {view === "analytics" ? (
          <AnalyticsDashboard />
        ) : view === "templates" ? (
          <TemplatesPage onStartSession={onStartSessionFromTemplate} />
        ) : view === "kanban" ? (
          <KanbanBoard onSelectSession={onSessionSelect} />
        ) : view === "debates" ? (
          <div className="p-6 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Debate History</h1>
            <DebateHistoryList />
          </div>
        ) : selectedSession ? (
          <ActivityFeed
            key={selectedSession.id}
            session={selectedSession}
            onArchive={onArchiveSession}
            showCodeDiffs={showCodeDiffs}
            onToggleCodeDiffs={onToggleCodeDiffs}
            onActivitiesChange={onActivitiesChange}
            onReviewArtifact={onReviewArtifact}
            onStartDebate={onStartDebate}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-sm">
              <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">
                NO SESSION
              </h2>
              <p className="text-[11px] text-white/30 leading-relaxed uppercase tracking-wide font-mono">
                Select session or create new
              </p>
              <div className="pt-2">
                <Button
                  className="w-full sm:w-auto h-8 text-[10px] font-mono uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white border-0"
                  onClick={onOpenNewSession}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Session
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Code Diff Sidebar */}
      {selectedSession && showCodeDiffs && view === "sessions" && (
        <>
          {!codeDiffSidebarCollapsed && (
            <div
              className="w-1 cursor-col-resize bg-transparent hover:bg-blue-500/50 transition-colors z-50"
              onMouseDown={onStartResizing}
            />
          )}
          <aside
            className={`hidden md:flex border-l border-white/[0.08] flex-col bg-zinc-950 ${
              isResizing ? "transition-none" : "transition-all duration-200"
            } ${codeDiffSidebarCollapsed ? "md:w-12" : ""}`}
            style={{
              width: codeDiffSidebarCollapsed ? undefined : codeSidebarWidth,
            }}
          >
            <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
              {!codeDiffSidebarCollapsed && (
                <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  CODE CHANGES
                </h2>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 hover:bg-white/5 text-white/60 ${
                  codeDiffSidebarCollapsed ? "mx-auto" : ""
                }`}
                onClick={onToggleCodeDiffSidebar}
              >
                {codeDiffSidebarCollapsed ? (
                  <ChevronLeft className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {!codeDiffSidebarCollapsed && (
                <CodeDiffSidebar
                  activities={currentActivities}
                  repoUrl={
                    selectedSession
                      ? `https://github.com/${selectedSession.sourceId}`
                      : undefined
                  }
                />
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
