'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Terminal, Play, Pause, RefreshCw, Maximize2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock data generator for terminal logs
const MOCK_LOGS = [
  "[info] Initializing gemini-cli-jules v0.4.2...",
  "[info] Connected to MCP server at ws://localhost:8080",
  "[info] Loaded 12 tools successfully.",
  "[debug] Checking for pending tasks...",
  "[info] No pending tasks found. Waiting for input.",
];

export function TerminalStream({ agentName = "gemini-cli-jules" }: { agentName?: string }) {
  const [logs, setLogs] = useState<string[]>(MOCK_LOGS);
  const [isRunning, setIsRunning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate live logs
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const actions = [
        "[info] Heartbeat received from server.",
        `[debug] analyzing workspace context for ${agentName}...`,
        "[info] Task queue polling... empty.",
        "[warn] High memory usage detected (latency: 45ms).",
        "[info] Syncing state with dashboard...",
        "[debug] Vector DB query completed in 120ms.",
      ];
      const randomLog = actions[Math.floor(Math.random() * actions.length)];
      const timestamp = new Date().toLocaleTimeString();

      setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${randomLog}`]);
    }, 2500);

    return () => clearInterval(interval);
  }, [isRunning, agentName]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [logs]);

  return (
    <Card className="bg-zinc-950 border-white/10 h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-zinc-900 flex items-center justify-center border border-white/10">
                <Terminal className="h-4 w-4 text-green-400" />
            </div>
            <div>
                <CardTitle className="text-sm font-mono text-white/90">Live Terminal Stream</CardTitle>
                <CardDescription className="text-[10px] font-mono text-white/40">
                    Watching process: <span className="text-purple-400">{agentName}</span>
                </CardDescription>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className={`h-5 text-[10px] border-0 ${isRunning ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {isRunning ? 'LIVE' : 'PAUSED'}
            </Badge>
            <div className="h-4 w-[1px] bg-white/10 mx-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setIsRunning(!isRunning)}>
                {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setLogs([])}>
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden bg-black/50 font-mono text-xs">
        <ScrollArea className="h-full" ref={scrollRef}>
            <div className="p-4 space-y-1.5">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 group hover:bg-white/[0.02] px-2 -mx-2 rounded">
                        <span className="text-zinc-600 select-none">{(i + 1).toString().padStart(3, '0')}</span>
                        <span className={
                            log.includes('[error]') ? 'text-red-400' :
                            log.includes('[warn]') ? 'text-yellow-400' :
                            log.includes('[debug]') ? 'text-blue-400' :
                            'text-zinc-300'
                        }>
                            {log}
                        </span>
                    </div>
                ))}
                {logs.length === 0 && (
                    <div className="text-zinc-600 italic text-center py-10">Terminal cleared. Waiting for new output...</div>
                )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
