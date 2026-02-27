'use client';

import { useState } from 'react';
import { SessionKeeperConfig } from '@jules/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionKeeperSettingsContent } from './session-keeper-settings-content';

interface SessionKeeperSettingsProps {
  config: SessionKeeperConfig;
  onConfigChange: (config: SessionKeeperConfig) => void;
  sessions: { id: string; title: string }[];
  onClearMemory: (sessionId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function SessionKeeperSettings({
  config,
  onConfigChange,
  sessions,
  onClearMemory,
  open: propOpen,
  onOpenChange: propOnOpenChange,
  trigger: propTrigger
}: Partial<SessionKeeperSettingsProps>) {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = propOpen !== undefined ? propOpen : isOpen;
  const onOpenChange = propOnOpenChange || setIsOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {propTrigger !== null && (
        <DialogTrigger asChild>
          {propTrigger || (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 hover:bg-white/10 transition-colors",
                config?.isEnabled ? "text-green-400 hover:text-green-300" : "text-white/60 hover:text-white"
              )}
              title={config?.isEnabled ? "Auto-Pilot Active" : "Auto-Pilot Settings"}
            >
              <Settings className={cn("h-4 w-4", config?.isEnabled && "animate-spin [animation-duration:3s]")} />
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="text-lg font-bold tracking-wide">Auto-Pilot Configuration</DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Configure how Jules monitors and interacts with your sessions.
          </DialogDescription>
        </DialogHeader>

        <SessionKeeperSettingsContent 
          config={config}
          onConfigChange={onConfigChange}
          sessions={sessions}
          onClearMemory={onClearMemory}
        />
      </DialogContent>
    </Dialog>
  );
}
