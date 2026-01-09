import React, { useRef, useEffect } from 'react';
import { useSessionKeeperStore, Log } from '@/lib/stores/session-keeper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, X, Pause, Play, RefreshCw, Download, FileJson, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportSystemLogsToJSON, exportSystemLogsToMarkdown } from '@/lib/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionKeeperLogPanelProps {
  onClose?: () => void;
}

export function SessionKeeperLogPanel({ onClose }: SessionKeeperLogPanelProps) {
  const { logs, clearLogs, isPausedAll, interruptAll, continueAll, refreshSessionStates } = useSessionKeeperStore();

  return (
    <div className="flex flex-col h-full bg-background border-t overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            Auto-Pilot Activity
            <span className="text-xs font-normal text-muted-foreground">({logs.length})</span>
          </h3>
          
          <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-md border border-white/5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-[10px] gap-1.5 transition-colors",
                !isPausedAll ? "text-green-400 bg-green-500/10 hover:bg-green-500/20" : "text-white/40 hover:text-white/60"
              )}
              onClick={continueAll}
              disabled={!isPausedAll}
            >
              <Play className="h-3 w-3 fill-current" />
              RUNNING
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-[10px] gap-1.5 transition-colors",
                isPausedAll ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20" : "text-white/40 hover:text-white/60"
              )}
              onClick={interruptAll}
              disabled={isPausedAll}
            >
              <Pause className="h-3 w-3 fill-current" />
              INTERRUPT
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-white/5"
                title="Export Logs"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => exportSystemLogsToJSON(logs)} className="gap-2 cursor-pointer">
                <FileJson className="h-4 w-4" />
                <span>Export JSON</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportSystemLogsToMarkdown(logs)} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                <span>Export MD</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-white/5"
            onClick={refreshSessionStates}
            title="Restart Stagnant Sessions"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onClose}
              title="Close panel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-0">
          <table className="w-full text-xs text-left">
            <thead className="text-muted-foreground bg-muted/20 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium w-24">Time</th>
                <th className="px-4 py-2 font-medium w-20">Type</th>
                <th className="px-4 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No activity recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/30 font-mono">
                    <td className="px-4 py-1.5 whitespace-nowrap text-muted-foreground">
                      {log.time}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <BadgeForType type={log.type} />
                    </td>
                    <td className="px-4 py-1.5 break-all">
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}

function BadgeForType({ type }: { type: Log['type'] }) {
  const styles = {
    info: 'text-blue-500',
    action: 'text-green-500 font-bold',
    error: 'text-red-500 font-bold',
    skip: 'text-gray-400',
  };

  return (
    <span className={styles[type] || ''}>
      {type.toUpperCase()}
    </span>
  );
}
