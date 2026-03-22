import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  LayoutTemplate, 
  Trello, 
  Users,
  Terminal
} from "lucide-react";
import { SessionList } from "@/components/session-list";
import { Session } from '@jules/shared';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSessionSelect: (session: Session | string) => void;
  selectedSessionId?: string;
  currentView: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs';
  onViewChange: (view: 'sessions' | 'templates' | 'kanban' | 'debates' | 'logs') => void;
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  onSessionSelect,
  selectedSessionId,
  currentView,
  onViewChange
}: AppSidebarProps) {
  const navItems = [
    { id: 'sessions', label: 'Sessions', icon: MessageSquare },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'kanban', label: 'Kanban', icon: Trello },
    { id: 'debates', label: 'Debates', icon: Users },
    { id: 'logs', label: 'System Logs', icon: Terminal },
  ] as const;

  return (
    <aside
      className={`hidden md:flex border-r border-white/[0.08] flex-col bg-zinc-950 transition-all duration-200 relative z-20 ${
        collapsed ? "md:w-12" : "md:w-64"
      }`}
    >
      <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            COMMAND CENTER
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

      <div className="p-2 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={`w-full ${collapsed ? "justify-center" : "justify-start"} gap-2 text-xs h-8 ${
              currentView === item.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
            }`}
            onClick={() => onViewChange(item.id)}
          >
            <item.icon className="h-3.5 w-3.5" />
            {!collapsed && <span>{item.label}</span>}
          </Button>
        ))}
      </div>

      <div className="mt-4 flex-1 overflow-hidden border-t border-white/[0.08] flex flex-col">
        {!collapsed && (
          <>
            <div className="px-4 py-2">
              <h2 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                SESSIONS
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <SessionList
                onSelectSession={onSessionSelect}
                selectedSessionId={selectedSessionId}
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
