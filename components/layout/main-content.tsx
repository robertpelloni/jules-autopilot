import { TemplatesPage } from "@/components/templates-page";
import { KanbanBoard } from "@/components/kanban-board";
import { ActivityFeed } from "@/components/activity-feed";
import { CodeDiffSidebar } from "@/components/code-diff-sidebar";
import { DebateHistoryList } from "@/components/debate-history-list";
import { SystemLogs } from "@/components/system-logs";
import { Session, Activity, SessionTemplate } from '@jules/shared';
import { Button } from "@/components/ui/button";

interface MainContentProps {
  view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs';
  selectedSession: Session | null;
  onSessionSelect: (session: Session | string) => void;
  onStartSessionFromTemplate: (template: SessionTemplate) => void;
  onViewChange: (view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs') => void;
  showCodeDiffs: boolean;
  onToggleCodeDiffs: (show: boolean) => void;
  onActivitiesChange: (activities: Activity[]) => void;
  currentActivities: Activity[];
  onRefresh: () => void;
  onStartDebate: (topic?: string, context?: string) => void;
  onSaveTemplate: () => void;
}

export function MainContent({
  view,
  selectedSession,
  onSessionSelect,
  onStartSessionFromTemplate,
  onViewChange,
  showCodeDiffs,
  onToggleCodeDiffs,
  onActivitiesChange,
  currentActivities,
  onRefresh,
  onStartDebate,
  onSaveTemplate,
}: MainContentProps) {
  return (
    <div className="flex h-full w-full flex-row min-w-0">
      <main className="flex-1 overflow-hidden bg-black flex flex-col min-w-0">
        {view === "templates" ? (
          <TemplatesPage 
            onStartSession={onStartSessionFromTemplate}
            onBack={() => onViewChange('sessions')}
          />
        ) : view === "kanban" ? (
          <KanbanBoard 
            onSelectSession={onSessionSelect}
          />
        ) : view === "debates" ? (
          <DebateHistoryList 
            onRefresh={onRefresh}
          />
        ) : view === "logs" ? (
          <SystemLogs />
        ) : selectedSession ? (
          <ActivityFeed
            session={selectedSession}
            showCodeDiffs={showCodeDiffs}
            onToggleCodeDiffs={onToggleCodeDiffs}
            onActivitiesChange={onActivitiesChange}
            onStartDebate={onStartDebate}
            onSaveTemplate={onSaveTemplate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
            <p className="text-xs font-mono uppercase tracking-widest">Select a session to begin</p>
            <Button 
              variant="outline" 
              className="border-white/10 text-white/40 hover:text-white"
              onClick={() => onViewChange('templates')}
            >
              Start from Template
            </Button>
          </div>
        )}
      </main>

      {showCodeDiffs && selectedSession && (
        <CodeDiffSidebar
          session={selectedSession}
          activities={currentActivities}
          onClose={() => onToggleCodeDiffs(false)}
        />
      )}
    </div>
  );
}
