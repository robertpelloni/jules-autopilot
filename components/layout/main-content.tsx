import { lazy, Suspense } from "react";
import { Session, Activity } from '@jules/shared';

const SessionBoard = lazy(() => import("@/components/session-board").then(m => ({ default: m.SessionBoard })));
const ActivityFeed = lazy(() => import("@/components/activity-feed").then(m => ({ default: m.ActivityFeed })));
const CodeDiffSidebar = lazy(() => import("@/components/code-diff-sidebar").then(m => ({ default: m.CodeDiffSidebar })));
const SystemLogs = lazy(() => import("@/components/system-logs").then(m => ({ default: m.SystemLogs })));

function ViewLoader() {
  return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
}

export type ViewType = 'sessions' | 'logs';

interface MainContentProps {
  view: ViewType;
  selectedSession: Session | null;
  onSessionSelect: (session: Session | string) => void;
  showCodeDiffs: boolean;
  onToggleCodeDiffs: (show: boolean) => void;
  onActivitiesChange: (activities: Activity[]) => void;
  currentActivities: Activity[];
  onRefresh: () => void;
}

export function MainContent({
  view,
  selectedSession,
  onSessionSelect,
  showCodeDiffs,
  onToggleCodeDiffs,
  onActivitiesChange,
  currentActivities,
}: MainContentProps) {
  return (
    <div className="flex h-full w-full flex-row min-w-0">
      <main className="flex-1 overflow-hidden bg-black flex flex-col min-w-0">
        <Suspense fallback={<ViewLoader />}>
        {view === "logs" ? (
          <SystemLogs />
        ) : selectedSession ? (
          <ActivityFeed
            session={selectedSession}
            showCodeDiffs={showCodeDiffs}
            onToggleCodeDiffs={onToggleCodeDiffs}
            onActivitiesChange={onActivitiesChange}
          />
        ) : (
          <SessionBoard
            onSelectSession={(s) => onSessionSelect(s)}
            onOpenNewSession={() => {}}
          />
        )}
        </Suspense>
      </main>

      {showCodeDiffs && selectedSession && (
        <Suspense fallback={null}>
        <CodeDiffSidebar
          activities={currentActivities}
          onClose={() => onToggleCodeDiffs(false)}
        />
        </Suspense>
      )}
    </div>
  );
}
