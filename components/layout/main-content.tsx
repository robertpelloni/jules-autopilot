import { lazy, Suspense } from "react";
import { Session, Activity, SessionTemplate } from '@jules/shared';

// Lazy-load view components for code-splitting (reduces initial bundle from ~680KB)
const TemplatesPage = lazy(() => import("@/components/templates-page").then(m => ({ default: m.TemplatesPage })));
const KanbanBoard = lazy(() => import("@/components/kanban-board").then(m => ({ default: m.KanbanBoard })));
const SessionBoard = lazy(() => import("@/components/session-board").then(m => ({ default: m.SessionBoard })));
const ActivityFeed = lazy(() => import("@/components/activity-feed").then(m => ({ default: m.ActivityFeed })));
const CodeDiffSidebar = lazy(() => import("@/components/code-diff-sidebar").then(m => ({ default: m.CodeDiffSidebar })));
const DebateHistoryList = lazy(() => import("@/components/debate-history-list").then(m => ({ default: m.DebateHistoryList })));
const SystemLogs = lazy(() => import("@/components/system-logs").then(m => ({ default: m.SystemLogs })));
const SystemHealthDashboard = lazy(() => import("@/components/system-health-dashboard").then(m => ({ default: m.SystemHealthDashboard })));
const AuditTrail = lazy(() => import("@/components/audit-trail").then(m => ({ default: m.AuditTrail })));
const SwarmDashboard = lazy(() => import("@/components/swarm-dashboard").then(m => ({ default: m.SwarmDashboard })));

function ViewLoader() {
  return <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>;
}

interface MainContentProps {
  view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms';
  selectedSession: Session | null;
  onSessionSelect: (session: Session | string) => void;
  onStartSessionFromTemplate: (template: SessionTemplate) => void;
  onViewChange: (view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs' | 'health' | 'audit' | 'swarms') => void;
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
        <Suspense fallback={<ViewLoader />}>
        {view === "templates" ? (
          <TemplatesPage
            onStartSession={onStartSessionFromTemplate}
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
        ) : view === "health" ? (
          <SystemHealthDashboard />
        ) : view === "audit" ? (
          <AuditTrail />
        ) : view === "swarms" ? (
          <SwarmDashboard />
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
          <SessionBoard
            onSelectSession={(s) => onSessionSelect(s)}
            onOpenNewSession={() => onViewChange('templates')}
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
