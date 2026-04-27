'use client';

import * as React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  MessageSquare, 
  Terminal,
  Settings,
  Plus,
} from 'lucide-react';
import type { ViewType } from './layout/main-content';

interface SearchCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (view: ViewType) => void;
}

export function SearchCommandDialog({
  open,
  onOpenChange,
  onNavigate,
}: SearchCommandDialogProps) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList className="bg-zinc-950 text-white">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('sessions'))}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Go to Sessions</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('logs'))}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Go to System Logs</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator className="bg-white/10" />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Session</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
