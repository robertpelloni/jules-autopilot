'use client';

import { useState } from "react";
import { AppHeader } from "./layout/app-header";
import { AppSidebar } from "./layout/app-sidebar";
import type { Session } from '@jules/shared';

export interface AppLayoutProps {
  children: React.ReactNode;
  currentView: 'sessions' | 'logs';
  onViewChange: (view: 'sessions' | 'logs') => void;
  selectedSessionId?: string;
  onSessionSelect: (session: Session | string) => void;
}

export function AppLayout({ 
  children, 
  currentView, 
  onViewChange, 
  selectedSessionId, 
  onSessionSelect 
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className="flex h-screen flex-col bg-black max-w-full overflow-hidden">
      <AppHeader 
        onNewSession={() => {}}
      />

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar 
          currentView={currentView}
          onViewChange={onViewChange}
          selectedSessionId={selectedSessionId}
          onSessionSelect={onSessionSelect}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-hidden relative bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
