import { ActivityFeed } from "@/components/activity-feed";
import { CodeDiffSidebar } from "@/components/code-diff-sidebar";
import { SystemLogs } from "@/components/system-logs";
import { Session, Activity, SessionTemplate } from '@jules/shared';

interface MainContentProps {
  view: 'sessions' | 'logs';
  selectedSession: Session | null;
  onSessionSelect: (session: Session | string) => void;
  onStartSessionFromTemplate: (template: SessionTemplate) => void;
  onViewChange: (view: 'sessions' | 'logs') => void;
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
  onViewChange,
  showCodeDiffs,
  onToggleCodeDiffs,
  onActivitiesChange,
  currentActivities,
  onStartDebate,
  onSaveTemplate,
}: MainContentProps) {
  return (
    <div className="flex h-full w-full flex-row min-w-0">
      <main className="flex-1 overflow-hidden bg-black flex flex-col min-w-0">
        {view === "logs" ? (
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
          <div className="flex-1 flex items-center justify-center text-zinc-600 uppercase tracking-widest text-xs font-mono p-12 text-center">
            <div className="max-w-md space-y-4">
              <div className="w-12 h-12 border border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-2 h-2 bg-zinc-800 rounded-full animate-pulse" />
              </div>
              <p>Autopilot Ready</p>
              <p className="text-[10px] text-zinc-800 lowercase italic">Select a session from the sidebar to begin orchestration</p>
            </div>
          </div>
        )}
      </main>

      {showCodeDiffs && selectedSession && (
        <CodeDiffSidebar
          activities={currentActivities}
          onClose={() => onToggleCodeDiffs(false)}
        />
      )}
    </div>
  );
}
