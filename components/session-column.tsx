'use client';

import type { Session } from '@jules/shared';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SessionCard } from './session-card';
import { motion } from 'framer-motion';

interface SessionColumnProps {
  id: string;
  title: string;
  sessions: Session[];
  showProvider?: boolean;
}

export function SessionColumn({ id, title, sessions, showProvider }: SessionColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-1 rounded-lg bg-zinc-950/50 p-4">
      <h3 className="text-sm font-bold tracking-wider text-white/40 uppercase mb-4">{title}</h3>
      <SortableContext items={sessions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <motion.div layout>
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} showProvider={showProvider} />
          ))}
        </motion.div>
      </SortableContext>
    </div>
  );
}
