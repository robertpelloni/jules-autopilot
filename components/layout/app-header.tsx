import { useState, useEffect } from "react";
import { useJules } from "@/lib/jules/provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  LogOut,
  Settings,
  BarChart3,
  MessageSquare,
  Terminal as TerminalIcon,
  LayoutTemplate,
  Plus,
  Kanban,
  Activity as ActivityIcon,
  FolderTree,
  Search,
  LayoutGrid,
  Files
} from "lucide-react";
import { SessionList } from "@/components/session-list";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { BroadcastDialog } from "@/components/broadcast-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Session } from "@/types/jules";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  view: 'sessions' | 'analytics' | 'templates' | 'kanban' | 'board' | 'artifacts';
  setView: (view: 'sessions' | 'analytics' | 'templates' | 'kanban' | 'board' | 'artifacts') => void;
  mobileMenuOpen: boolean;

  setMobileMenuOpen: (open: boolean) => void;
  refreshKey: number;
  selectedSession: Session | null;
  onSelectSession: (session: Session | string) => void;
  terminalAvailable: boolean;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  isNewSessionOpen: boolean;
  setIsNewSessionOpen: (open: boolean) => void;
  newSessionInitialValues?: {
    sourceId?: string;
    title?: string;
    prompt?: string;
    startingBranch?: string;
  };
  onSessionCreated: (sessionId?: string) => void;
  onOpenNewSession: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isLogPanelOpen: boolean;
  setIsLogPanelOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function AppHeader({
  view,
  setView,
  mobileMenuOpen,
  setMobileMenuOpen,
  refreshKey,
  selectedSession,
  onSelectSession,
  terminalAvailable,
  terminalOpen,
  onToggleTerminal,
  isNewSessionOpen,
  setIsNewSessionOpen,
  newSessionInitialValues,
  onSessionCreated,
  onOpenNewSession,
  isSettingsOpen,
  setIsSettingsOpen,
  isLogPanelOpen,
  setIsLogPanelOpen,
  onLogout,
}: AppHeaderProps) {
  const router = useRouter();
  const { client } = useJules();
  const [openSessions, setOpenSessions] = useState<Session[]>([]);

  // Load all sessions for broadcast
  useEffect(() => {
    if (!client) return;
    client.listSessions().then(setOpenSessions).catch(console.error);
  }, [client, refreshKey]);

  return (
    <header className="border-b border-white/[0.08] bg-zinc-950/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-zinc-950 border-white/[0.08]">
              <SheetHeader className="border-b border-white/[0.08] px-3 py-2.5">
                <SheetTitle className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  SESSIONS
                </SheetTitle>
              </SheetHeader>
              <SessionList
                key={refreshKey}
                onSelectSession={onSelectSession}
                selectedSessionId={selectedSession?.id}
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-sm font-bold tracking-tight text-white">JULES</h1>
          <span className="text-[9px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded-sm">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>

          {/* GitHub Repo Link */}
          {selectedSession?.sourceId && (
            <a
              href={`https://github.com/${selectedSession.sourceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 ml-4"
            >
              <span className="opacity-50">Repo:</span> {selectedSession.sourceId}
            </a>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex h-8 px-3 hover:bg-white/5 text-white/60"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            title="Search (Cmd+K)"
          >
            <Search className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Search
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 hover:bg-white/5 ${
              view === "sessions" ? "text-white" : "text-white/60"
            }`}
            onClick={() => setView("sessions")}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Sessions
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 hover:bg-white/5 ${
              view === "board" ? "text-white" : "text-white/60"
            }`}
            onClick={() => setView("board")}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Board
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 hover:bg-white/5 ${
              view === "artifacts" ? "text-white" : "text-white/60"
            }`}
            onClick={() => setView("artifacts")}
            title="Browse Artifacts"
          >
            <Files className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Files
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 hover:bg-white/5 ${
              view === "analytics" ? "text-white" : "text-white/60"
            }`}
            onClick={() => setView("analytics")}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Analytics
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 hover:bg-white/5 ${
              view === "kanban" ? "text-white" : "text-white/60"
            }`}
            onClick={() => setView("kanban")}
          >
            <Kanban className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Kanban
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 hover:bg-white/5 ${
              isLogPanelOpen ? "text-white" : "text-white/60"
            }`}
            onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}
          >
            <ActivityIcon className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Monitor
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 hover:bg-white/5 text-white/60"
            onClick={() => router.push("/system")}
          >
            <FolderTree className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              System
            </span>
          </Button>

          {terminalAvailable && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 hover:bg-white/5 ${
                terminalOpen ? "text-green-500" : "text-white/60"
              }`}
              onClick={onToggleTerminal}
              title="Toggle Terminal (Ctrl+`)"
            >
              <TerminalIcon className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Terminal
              </span>
            </Button>
          )}

          <NewSessionDialog
            onSessionCreated={onSessionCreated}
            open={isNewSessionOpen}
            onOpenChange={setIsNewSessionOpen}
            initialValues={newSessionInitialValues}
            trigger={
              <Button
                className="w-full sm:w-auto h-8 text-[10px] font-mono uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white border-0"
                onClick={onOpenNewSession}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Session
              </Button>
            }
          />

          <BroadcastDialog sessions={openSessions} />

          <ModeToggle />

          {/* Global Settings Dialog (Controlled) */}
          <SettingsDialog
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            trigger={null}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/5 text-white/60"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-zinc-950 border-white/[0.08]"
            >
              <DropdownMenuItem
                onClick={() => setView("templates")}
                className="hover:bg-white/5 text-white/80"
              >
                <LayoutTemplate className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">
                  Manage Templates
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}
                className="hover:bg-white/5 text-white/80"
              >
                <ActivityIcon className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">
                  Session Monitor
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/system")}
                className="hover:bg-white/5 text-white/80"
              >
                <FolderTree className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">
                  System Dashboard
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsSettingsOpen(true)}
                className="hover:bg-white/5 text-white/80"
              >
                <Settings className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">
                  Settings
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10" />

              <DropdownMenuItem
                onClick={onLogout}
                className="hover:bg-white/5 text-white/80"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
