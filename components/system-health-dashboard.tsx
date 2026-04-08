'use client';

import { useEffect, useState } from 'react';
import { Activity, Cpu, Database, HeartPulse, RefreshCw, Wifi, Clock, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchHealth, fetchMetricsText, fetchScheduledTasks, triggerScheduledTask, type HealthResponse, type ScheduledTask } from '@/lib/api/health';
import { toast } from 'sonner';

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [metricsText, setMetricsText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);

  const load = async (showToast = false) => {
    try {
      setIsRefreshing(true);
      const [healthData, taskData, metrics] = await Promise.allSettled([
        fetchHealth(), 
        fetchScheduledTasks().catch(() => []), 
        fetchMetricsText()
      ]);

      if (healthData.status === 'fulfilled') {
        setHealth(healthData.value);
      }
      if (taskData.status === 'fulfilled') {
        setTasks(taskData.value);
      }
      if (metrics.status === 'fulfilled') {
        setMetricsText(metrics.value);
      }

      if (showToast) {
        toast.success('Health dashboard refreshed');
      }
    } catch (error) {
      console.error(error);
      if (showToast) {
        toast.error('Failed to refresh health dashboard');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTriggerTask = async (name: string) => {
    try {
      setTriggeringTask(name);
      await triggerScheduledTask(name);
      toast.success(`Task ${name} triggered manually`);
      void load();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to trigger task ${name}`);
    } finally {
      setTriggeringTask(null);
    }
  };

  useEffect(() => {    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const databaseHealthy = health?.checks?.database?.status === 'ok';
  const daemonRunning = !!health?.checks?.daemon?.running;
  const workerRunning = !!health?.checks?.worker?.running;
  const keeperEnabled = !!health?.checks?.daemon?.enabled;
  const julesConfigured = !!health?.checks?.credentials?.julesConfigured;

  return (
    <div className="h-full overflow-y-auto bg-black text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 text-emerald-400" />
              <h1 className="text-lg font-bold uppercase tracking-widest">System Health</h1>
            </div>
            <p className="mt-2 text-xs text-zinc-500 font-mono uppercase tracking-wider">
              Runtime observability sourced from the Go backend health and metrics endpoints.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void load(true)}
            disabled={isRefreshing}
            className="border-white/10 hover:bg-white/5 text-[10px] font-mono uppercase tracking-widest"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Database className="h-3.5 w-3.5" /> Database
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{databaseHealthy ? 'Healthy' : 'Degraded'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">{health?.checks?.database?.error || 'SQLite connectivity is healthy.'}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Cpu className="h-3.5 w-3.5" /> Daemon
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{daemonRunning ? 'Running' : 'Stopped'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Keeper {keeperEnabled ? 'enabled' : 'disabled'}.</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Activity className="h-3.5 w-3.5" /> Worker
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{workerRunning ? 'Running' : 'Stopped'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Queue job execution loop state.</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Wifi className="h-3.5 w-3.5" /> Credentials
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{julesConfigured ? 'Ready' : 'Missing'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Jules API configuration availability.</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              <Activity className="h-3.5 w-3.5" /> Runtime
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight">{health?.status || 'unknown'}</div>
            <p className="mt-2 text-[11px] text-zinc-500">Version {health?.version || 'unknown'}.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Backend Totals</h2>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase">Live</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                ['Sessions', health?.totals?.sessions ?? 0],
                ['Code Chunks', health?.totals?.codeChunks ?? 0],
                ['Memory Chunks', health?.totals?.memoryChunks ?? 0],
                ['Templates', health?.totals?.templates ?? 0],
                ['Debates', health?.totals?.debates ?? 0],
                ['WS Clients', health?.realtime?.wsClients ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
                  <div className="mt-2 text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Queue State</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-white/5 bg-black/20 p-3 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pending</span>
                <span className="text-xl font-bold">{health?.queue?.pending ?? 0}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Processing</span>
                <span className="text-xl font-bold">{health?.queue?.processing ?? 0}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Timestamp</div>
                <div className="mt-2 text-[11px] text-zinc-300 break-all">{health?.timestamp || 'unknown'}</div>
              </div>
            </div>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-white">Scheduled Automation Engine</h2>
              </div>
              <Badge variant="outline" className="border-white/10 text-zinc-500 text-[9px] uppercase">Active</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tasks.map(task => (
                <div key={task.name} className="rounded-lg border border-white/5 bg-black/20 p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-white mb-2">{task.name}</div>
                    <div className="text-[9px] font-mono text-zinc-500 mb-1">
                      Interval: {task.intervalMs / 1000 / 60} minutes
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 mb-1">
                      Next run: {new Date(task.nextRun).toLocaleTimeString()}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500">
                      Last run: {task.lastRun ? new Date(task.lastRun).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full border-white/10 hover:bg-white/5 text-[9px] uppercase tracking-widest h-7"
                    disabled={triggeringTask === task.name}
                    onClick={() => void handleTriggerTask(task.name)}
                  >
                    {triggeringTask === task.name ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                    Run Now
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Prometheus Metrics Preview</h2>
            <Badge variant="outline" className="border-white/10 text-zinc-500 text-[9px] uppercase">Raw</Badge>
          </div>
          <pre className="mt-4 max-h-[320px] overflow-auto rounded-lg border border-white/5 bg-black/30 p-4 text-[11px] leading-relaxed text-zinc-300">
            {metricsText || 'Metrics not yet available from the current frontend origin. They remain available directly from the Go runtime when served there.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
