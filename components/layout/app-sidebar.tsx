import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SessionList } from "@/components/session-list";
import { Session } from '@jules/shared';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  refreshKey: number;
  onSelectSession: (session: Session | string) => void;
  selectedSessionId?: string;
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  refreshKey,
  onSelectSession,
  selectedSessionId,
}: AppSidebarProps) {
  return (
    <aside
      className={`hidden md:flex border-r border-white/[0.08] flex-col bg-zinc-950 transition-all duration-200 relative z-20 ${
        collapsed ? "md:w-12" : "md:w-64 resize-x"
      }`}
      style={{
        minWidth: collapsed ? "3rem" : "16rem",
        maxWidth: collapsed ? "3rem" : "40rem"
      }}
    >
      <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            SESSIONS
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 hover:bg-white/5 text-white/60 ${
            collapsed ? "mx-auto" : ""
          }`}
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        {!collapsed && (
          <SessionList
            key={refreshKey}
            onSelectSession={onSelectSession}
            selectedSessionId={selectedSessionId}
          />
        )}
      </div>
    </aside>
  );
}
