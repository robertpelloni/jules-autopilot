'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@jules/shared';
import { useJules } from '@/lib/jules/provider';
import { useCloudDevStore } from '@/lib/stores/cloud-dev';
import { CLOUD_DEV_PROVIDERS, type CloudDevProviderId } from '@/types/cloud-dev';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { SessionColumn } from './session-column';
import { SessionCard } from './session-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Filter, Sparkles, Bot, Brain, Code2, Github, Blocks } from 'lucide-react';

const PROVIDER_ICONS: Record<CloudDevProviderId, React.ReactNode> = {
  jules: <Sparkles className="h-3 w-3" />,
  devin: <Bot className="h-3 w-3" />,
  manus: <Brain className="h-3 w-3" />,
  openhands: <Code2 className="h-3 w-3" />,
  'github-spark': <Github className="h-3 w-3" />,
  blocks: <Blocks className="h-3 w-3" />,
  'claude-code': <Code2 className="h-3 w-3" />,
  codex: <Brain className="h-3 w-3" />,
};

type Columns = {
  [key: string]: Session[];
};

export function SessionBoard() {
  const { client } = useJules();
  const { getConfiguredProviders, initializeProviders } = useCloudDevStore();
  const [columns, setColumns] = useState<Columns>({
    active: [],
    paused: [],
    completed: [],
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<Set<CloudDevProviderId>>(new Set(['jules']));

  const configuredProviders = useMemo(() => {
    const providers = getConfiguredProviders();
    return providers.length > 0 ? providers : ['jules' as CloudDevProviderId];
  }, [getConfiguredProviders]);

  useEffect(() => {
    initializeProviders();
  }, [initializeProviders]);

  useEffect(() => {
    if (!client) return;
    async function fetchSessions() {
      if (!client) return;
      const fetchedSessions = await client.listSessions();
      const newColumns: Columns = {
        active: [],
        paused: [],
        completed: [],
      };
      for (const session of fetchedSessions) {
         const statusKey = (session.status === 'failed' ? 'completed' : session.status) as keyof Columns;
         if (newColumns[statusKey]) {
            newColumns[statusKey].push(session);
         } else {
             newColumns.active.push(session);
         }
      }
      setColumns(newColumns);
    }
    fetchSessions();
  }, [client]);

  const findContainer = (id: string) => {
    if (id in columns) {
      return id;
    }
    return Object.keys(columns).find((key) => columns[key].find((item) => item.id === id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);

    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      setColumns((prev) => {
        const activeItems = prev[activeContainer];
        const oldIndex = activeItems.findIndex((item) => item.id === active.id);
        const newIndex = activeItems.findIndex((item) => item.id === over.id);
        return {
          ...prev,
          [activeContainer]: arrayMove(activeItems, oldIndex, newIndex),
        };
      });
    } else {
      let draggedSession: Session | undefined;
      const newColumns = { ...columns };

      const oldColumn = newColumns[activeContainer];
      const activeIndex = oldColumn.findIndex((item) => item.id === active.id);
      if (activeIndex > -1) {
        draggedSession = oldColumn.splice(activeIndex, 1)[0];
      }

      if (draggedSession) {
        const newColumn = newColumns[overContainer];
        const overIndex = newColumn.findIndex((item) => item.id === over.id);

        if (overIndex > -1) {
          newColumn.splice(overIndex, 0, draggedSession);
        } else {
          newColumns[overContainer] = [...newColumns[overContainer], draggedSession];
        }

        const newStatus = overContainer as 'active' | 'paused' | 'completed';
        draggedSession.status = newStatus;
        if (client) {
          client.updateSession(draggedSession.id, { status: newStatus });
        }

        setColumns(newColumns);
      }
    }
  };

  const activeSession = activeId ? Object.values(columns).flat().find((session) => session.id === activeId) : null;
  const showMultiProvider = configuredProviders.length > 1;

  const toggleProvider = (providerId: CloudDevProviderId) => {
    setSelectedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        if (next.size > 1) next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      collisionDetection={closestCorners}
    >
      <div className="flex-1 overflow-x-auto p-4 sm:p-6 md:p-8">
        {showMultiProvider && (
          <div className="mb-4 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Providers ({selectedProviders.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Filter by Provider</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {configuredProviders.map((providerId) => (
                  <DropdownMenuCheckboxItem
                    key={providerId}
                    checked={selectedProviders.has(providerId)}
                    onCheckedChange={() => toggleProvider(providerId)}
                  >
                    <span className="flex items-center gap-2">
                      {PROVIDER_ICONS[providerId]}
                      {CLOUD_DEV_PROVIDERS[providerId].name}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div className="flex gap-6">
          <SessionColumn id="active" title="Active" sessions={columns.active || []} showProvider={showMultiProvider} />
          <SessionColumn id="paused" title="Paused" sessions={columns.paused || []} showProvider={showMultiProvider} />
          <SessionColumn id="completed" title="Completed" sessions={columns.completed || []} showProvider={showMultiProvider} />
        </div>
      </div>
      <DragOverlay>
        {activeSession ? <SessionCard session={activeSession} isDragging showProvider={showMultiProvider} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
