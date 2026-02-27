'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useJules } from '@/lib/jules/provider';
import { RotateCw, Brain, X, Check, Activity, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getArchivedSessions } from '@/lib/archive';
import { SessionKeeperSettings } from './session-keeper-settings';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { SessionKeeperConfig } from '@jules/shared';
import { DebateVisualizer } from './debate-visualizer';
import { MemoryManager } from './memory-manager';

import type { Session } from '@jules/shared';

// Persistent Supervisor State
interface SupervisorState {
  [sessionId: string]: {
    lastProcessedActivityTimestamp: string;
    history: { role: string; content: string }[];
    openaiThreadId?: string;
    openaiAssistantId?: string;
  };
}

export function SessionKeeper({ onClose }: { isSidebar?: boolean, onClose?: () => void }) {
  const { client, apiKey } = useJules();
  const router = useRouter();
  const pathname = usePathname();
  
  // Use global store
  const { 
    config, setConfig, 
    logs, addLog: addLogToStore, clearLogs,
    statusSummary, setStatusSummary,
    sessionStates, updateSessionState
  } = useSessionKeeperStore();

  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);

  // Helper wrapper for addLog to match existing signature
  const addLog = (message: string, type: 'info' | 'action' | 'error' | 'skip') => {
    if (type === 'info') return;
    addLogToStore(message, type);
  };

  // Fetch sessions for the dropdown
  useEffect(() => {
    if (client) {
      client.listSessions().then(data => {
        setSessions(data.map(s => ({ id: s.id, title: s.title || s.id })));
      }).catch(e => console.error('Failed to list sessions for config', e));
    }
  }, [client]);

  const clearSupervisorMemory = (sessionId: string) => {
    const savedState = localStorage.getItem('jules_supervisor_state');
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state[sessionId]) {
        delete state[sessionId];
        localStorage.setItem('jules_supervisor_state', JSON.stringify(state));
        addLog(`Cleared Supervisor memory for ${sessionId.substring(0,8)}`, 'action');
      }
    }
  };

  // if (!apiKey) return null; // Removed to prevent blank panel

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-l border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-950/50">
        <div className="flex items-center gap-3">
          {config.smartPilotEnabled ? (
            <div className="relative">
               <Brain className="h-5 w-5 text-purple-500" />
               <Sparkles className="h-2 w-2 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
          ) : (
            <RotateCw className={`h-5 w-5 ${config.isEnabled ? 'text-green-500 animate-spin-slow' : 'text-white/40'}`} />
          )}
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase text-white">Auto-Pilot</h2>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${config.isEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-[10px] text-white/50 font-mono uppercase">
                {config.isEnabled ? 'Active' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <MemoryManager sessionId={sessions.find(s => s.id === pathname?.split('=')[1])?.id} />
           <SessionKeeperSettings
             config={config}
             onConfigChange={setConfig}
             sessions={sessions}
             onClearMemory={clearSupervisorMemory}
           />
           {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
           )}
        </div>
      </div>

      {!apiKey ? (
        <div className="flex-1 flex items-center justify-center text-white/40 text-xs font-mono">
          API Key Required to Monitor Sessions
        </div>
      ) : (
      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
           <Card className="bg-white/5 border-white/10 p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Monitored</span>
              <div className="text-2xl font-mono text-white">{statusSummary.monitoringCount}</div>
           </Card>
           <Card className="bg-white/5 border-white/10 p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Next Check</span>
              <div className="text-xs font-mono text-white/80 mt-1">
                 {config.isEnabled ? `${config.checkIntervalSeconds}s` : 'Paused'}
              </div>
           </Card>
        </div>

        {/* Last Action */}
        <Card className="bg-purple-500/10 border-purple-500/20 p-3">
           <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] uppercase text-purple-300 font-bold tracking-wider">Last Action</span>
           </div>
           <p className="text-xs text-purple-100 font-mono truncate">
              {statusSummary.lastAction}
           </p>
        </Card>

        {/* Tabs for Logs and Council */}
        <Tabs defaultValue="logs" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-2 bg-white/5">
            <TabsTrigger value="logs" className="text-xs">Activity Log</TabsTrigger>
            <TabsTrigger value="council" className="text-xs">Council Debates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs" className="flex-1 flex flex-col min-h-0 border border-white/10 rounded-lg bg-black/50 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
              <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Activity Log</span>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] hover:bg-white/5 text-white/40" onClick={clearLogs}>
                CLEAR
              </Button>
            </div>
            <ScrollArea className="flex-1 p-0">
              <div className="flex flex-col font-mono text-[10px]">
                {logs.length === 0 && (
                  <div className="p-4 text-center text-white/20 italic">No activity recorded...</div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-3 px-3 py-1.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${
                    log.type === 'error' ? 'text-red-400 bg-red-950/10' :
                    log.type === 'action' ? 'text-green-400 bg-green-950/10' :
                    log.type === 'skip' ? 'text-yellow-500/50' :
                    'text-white/40'
                  }`}>
                    <span className="opacity-40 shrink-0 w-14">{log.time}</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="council" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
             <DebateVisualizer />
          </TabsContent>
        </Tabs>
      </div>
      )}
    </div>
  );
}
