'use client';

import { useState, useEffect } from 'react';
import { useJules } from '@/lib/jules/provider';
import { RotateCw, Brain, X, Activity, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionKeeperSettings } from './session-keeper-settings';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';

export function SessionKeeper({ onClose }: { isSidebar?: boolean, onClose?: () => void }) {
  const { client } = useJules();
  const { config, statusSummary, setConfig } = useSessionKeeperStore();
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);

  // Fetch sessions for the config dropdown
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
      }
    }
  };

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

        {/* Note about logs */}
        <div className="mt-auto p-4 rounded-lg bg-white/5 border border-white/10 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-wide">
             Logs have been moved to the bottom panel.
             Toggle them using the "Logs" button in the header.
          </p>
        </div>
      </div>
    </div>
  );
}
