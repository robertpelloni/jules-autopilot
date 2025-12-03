'use client';

import { useState } from 'react';
import { useJules } from '@/lib/jules/provider';
import type { Session } from '@/types/jules';
import { SessionList } from './session-list';
import { ActivityFeed } from './activity-feed';
import { AnalyticsDashboard } from './analytics-dashboard';
import { NewSessionDialog } from './new-session-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu, LogOut, Settings, LayoutDashboard, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function AppLayout() {
  const { clearApiKey } = useJules();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<'sessions' | 'analytics'>('sessions');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
    setView('sessions');
    setMobileMenuOpen(false);
  };

  const handleSessionCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleSessionArchived = () => {
    // Clear the selected session and refresh the session list
    setSelectedSession(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleLogout = () => {
    clearApiKey();
    setSelectedSession(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
                <SheetHeader className="border-b border-sidebar-border px-3 py-2.5">
                  <SheetTitle className="text-[10px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider">Sessions</SheetTitle>
                </SheetHeader>
                <SessionList
                  key={refreshKey}
                  onSelectSession={handleSessionSelect}
                  selectedSessionId={selectedSession?.id}
                />
              </SheetContent>
            </Sheet>
            <h1 className="text-sm font-semibold tracking-tight">Jules Task Manager</h1>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setView(view === 'analytics' ? 'sessions' : 'analytics')}
              title={view === 'analytics' ? "Back to Sessions" : "Analytics Dashboard"}
            >
              {view === 'analytics' ? <MessageSquare className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
            </Button>
            <NewSessionDialog onSessionCreated={handleSessionCreated} />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span className="text-xs">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className={`hidden md:flex border-r border-sidebar-border flex-col bg-sidebar transition-all duration-200 ${
          sidebarCollapsed ? 'md:w-12' : 'md:w-64'
        }`}>
          <div className="px-3 py-2 border-b border-sidebar-border flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-[10px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider">Sessions</h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 hover:bg-sidebar-accent ${sidebarCollapsed ? 'mx-auto' : ''}`}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {!sidebarCollapsed && (
              <SessionList
                key={refreshKey}
                onSelectSession={handleSessionSelect}
                selectedSessionId={selectedSession?.id}
              />
            )}
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 overflow-hidden">
          {view === 'analytics' ? (
            <AnalyticsDashboard />
          ) : selectedSession ? (
            <ActivityFeed session={selectedSession} onArchive={handleSessionArchived} />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center space-y-3 max-w-sm">
                <h2 className="text-lg font-semibold text-muted-foreground">
                  No session selected
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a session from the sidebar or create a new one to get started
                </p>
                <div className="pt-2">
                  <NewSessionDialog onSessionCreated={handleSessionCreated} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
