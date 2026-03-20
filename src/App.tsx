import { useState, useCallback } from "react";
import { JulesProvider } from "@/lib/jules/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/app-layout";
import { MainContent } from "@/components/layout/main-content";
import type { Session, Activity } from "@jules/shared";

function App() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<'sessions' | 'templates' | 'kanban' | 'debates'>('sessions');
  const [showCodeDiffs, setShowCodeDiffs] = useState(false);
  const [currentActivities, setCurrentActivities] = useState<Activity[]>([]);

  const handleSessionSelect = useCallback((session: Session | string) => {
    if (typeof session === 'string') {
      console.log("Selected session ID:", session);
    } else {
      setSelectedSession(session);
      setView('sessions');
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <JulesProvider>
        <TooltipProvider>
          <AppLayout
            currentView={view}
            onViewChange={setView}
            selectedSessionId={selectedSession?.id}
            onSessionSelect={handleSessionSelect}
          >
            <MainContent 
              view={view}
              selectedSession={selectedSession}
              onSessionSelect={handleSessionSelect}
              showCodeDiffs={showCodeDiffs}
              onToggleCodeDiffs={setShowCodeDiffs}
              onActivitiesChange={setCurrentActivities}
              currentActivities={currentActivities}
              onStartSessionFromTemplate={() => {}}
              onViewChange={setView}
              onRefresh={() => {}}
              onStartDebate={() => {}}
              onSaveTemplate={() => {}}
            />
          </AppLayout>
          <Toaster position="bottom-right" theme="dark" className="font-mono text-xs uppercase" />
        </TooltipProvider>
      </JulesProvider>
    </ThemeProvider>
  );
}

export default App;
