"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
} from "@dnd-kit/core";
import { useJules } from "@/lib/jules/provider";
import type { Session } from "@/types/jules";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { ExternalLink, GitBranch, Clock } from "lucide-react";
import { getArchivedSessions } from "@/lib/archive";

type KanbanColumnId = "running" | "waiting" | "completed" | "failed";

const COLUMNS: { id: KanbanColumnId; title: string; status: Session["status"] }[] = [
  { id: "running", title: "Running", status: "active" },
  { id: "waiting", title: "Waiting for Approval", status: "paused" },
  { id: "completed", title: "Completed", status: "completed" },
  { id: "failed", title: "Failed", status: "failed" },
];

interface KanbanBoardProps {
  onSelectSession: (session: Session) => void;
}

export function KanbanBoard({ onSelectSession }: KanbanBoardProps) {
  const { client } = useJules();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [archivedSessionIds, setArchivedSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setArchivedSessionIds(getArchivedSessions());
  }, []);

  const loadSessions = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await client.listSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      if (err instanceof Error) {
        if (err.message.includes("Invalid API key")) {
          setError("Invalid API key. Please check your API key and try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to load sessions");
      }
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const columns = useMemo(() => {
    const cols: Record<KanbanColumnId, Session[]> = {
      running: [],
      waiting: [],
      completed: [],
      failed: [],
    };

    sessions
      .filter((session) => !archivedSessionIds.has(session.id))
      .forEach((session) => {
        // Map session status to column
        let columnId: KanbanColumnId | undefined;
        if (session.status === "active") columnId = "running";
        else if (session.status === "paused") columnId = "waiting";
        else if (session.status === "completed") columnId = "completed";
        else if (session.status === "failed") columnId = "failed";

        if (columnId) {
          cols[columnId].push(session);
        }
      });

    return cols;
  }, [sessions, archivedSessionIds]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = () => {
    setActiveId(null);
  };

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId),
    [sessions, activeId]
  );

  if (loading) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <p className="text-sm text-white/50 animate-pulse">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" onClick={loadSessions}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black/95 p-6 overflow-hidden flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Control Tower</h2>
            <p className="text-sm text-white/50">Manage and monitor your active sessions</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSessions} className="border-white/10 text-white hover:bg-white/5">
            Refresh
        </Button>
      </div>
      
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              sessions={columns[col.id]}
              onSelectSession={onSelectSession}
            />
          ))}
        </div>
        <DragOverlay>
          {activeSession ? (
            <KanbanCard session={activeSession} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  sessions,
  onSelectSession,
}: {
  id: KanbanColumnId;
  title: string;
  sessions: Session[];
  onSelectSession: (session: Session) => void;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex h-full min-w-[320px] max-w-[360px] flex-col rounded-lg bg-zinc-900/50 border border-white/5">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide">
          {title}
        </h3>
        <Badge variant="secondary" className="bg-white/10 text-white/70 hover:bg-white/20 border-0">
          {sessions.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {sessions.map((session) => (
            <DraggableKanbanCard
              key={session.id}
              session={session}
              onSelectSession={onSelectSession}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function DraggableKanbanCard({
  session,
  onSelectSession,
}: {
  session: Session;
  onSelectSession: (session: Session) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: session.id,
  });

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="h-[140px] w-full rounded-lg bg-zinc-800/20 border border-white/5 border-dashed opacity-50"
      />
    );
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <KanbanCard session={session} onSelectSession={onSelectSession} />
    </div>
  );
}

function KanbanCard({
  session,
  isOverlay,
  onSelectSession,
}: {
  session: Session;
  isOverlay?: boolean;
  onSelectSession?: (session: Session) => void;
}) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
        const date = parseISO(dateString);
        if (!isValid(date)) return "Unknown";
        return formatDistanceToNow(date, { addSuffix: true });
    } catch {
        return "Unknown";
    }
  };

  const getStatusColor = (status: Session["status"]) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-500/20";
      case "completed": return "bg-blue-500/20 text-blue-400 border-blue-500/20";
      case "failed": return "bg-red-500/20 text-red-400 border-red-500/20";
      case "paused": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <Card
      className={`
        bg-zinc-900 border-white/10 text-left
        ${isOverlay ? "shadow-2xl scale-105 rotate-2 cursor-grabbing" : "hover:border-white/20 cursor-grab"}
        transition-all duration-200
      `}
    >
      <CardHeader className="p-4 pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-white leading-tight line-clamp-2">
                {session.title || "Untitled Session"}
            </CardTitle>
            <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 h-5 border ${getStatusColor(session.status)}`}>
                {session.status}
            </Badge>
        </div>
        {session.sourceId && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
                <GitBranch className="h-3 w-3" />
                <span className="truncate">{session.sourceId}</span>
            </div>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex items-center gap-1.5 text-[11px] text-white/40 mb-4 font-mono">
            <Clock className="h-3 w-3" />
            <span>Last active {formatDate(session.lastActivityAt || session.updatedAt)}</span>
        </div>
        
        {!isOverlay && onSelectSession && (
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session);
                    }}
                >
                    View Details
                    <ExternalLink className="ml-1.5 h-3 w-3" />
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}