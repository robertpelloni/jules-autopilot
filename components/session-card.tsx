'use client';

import type { Session } from '@jules/shared';
import { CLOUD_DEV_PROVIDERS, type CloudDevProviderId } from '@/types/cloud-dev';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Sparkles, Bot, Brain, Code2, Github, Blocks } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type DisplaySession = Session & { providerId?: CloudDevProviderId };

interface SessionCardProps {
  session: DisplaySession;
  isDragging?: boolean;
  showProvider?: boolean;
}

export function SessionCard({ session, showProvider = false }: SessionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 'auto',
  };

  const providerId = session.providerId || 'jules';
  const providerConfig = CLOUD_DEV_PROVIDERS[providerId];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.03 }}
      className="mb-4 rounded-lg bg-zinc-900/50 border border-white/[0.08] cursor-grab active:cursor-grabbing"
    >
      <CardHeader className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-white/80 truncate">{session.title}</CardTitle>
          {showProvider && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "shrink-0 p-1 rounded",
                  providerId === 'jules' ? 'text-purple-400' : 'text-white/60'
                )}>
                  {PROVIDER_ICONS[providerId]}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-zinc-900 border-white/10 text-white text-[10px]">
                {providerConfig?.name || providerId}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-xs text-white/50">
           {session.prompt?.substring(0, 100) || 'No summary available.'}...
        </p>
      </CardContent>
    </motion.div>
  );
}
