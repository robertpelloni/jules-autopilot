'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';

interface ShadowPilotStatus {
  running: boolean;
}

interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  isResolved: boolean;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ShadowPilotPanel() {
  const { data: statusData, mutate: mutateStatus } = useSWR<ShadowPilotStatus>('/api/shadow-pilot/status', fetcher, {
    refreshInterval: 5000,
  });

  const { data: anomalies, mutate: mutateAnomalies } = useSWR<Anomaly[]>('/api/health/anomalies', fetcher, {
    refreshInterval: 10000,
  });

  const isRunning = statusData?.running || false;
  const activeAnomalies = anomalies?.filter(a => !a.isResolved) || [];

  const handleToggle = async () => {
    try {
      const endpoint = isRunning ? '/api/shadow-pilot/stop' : '/api/shadow-pilot/start';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Action failed');
      await mutateStatus();
      toast.success(isRunning ? 'Shadow Pilot stopped' : 'Shadow Pilot started');
    } catch (_err) {
      toast.error('Failed to change Shadow Pilot state');
    }
  };

  const handleManualScan = async () => {
    try {
      const res = await fetch('/api/shadow/scan', { method: 'POST' });
      if (!res.ok) throw new Error('Scan failed');
      await mutateStatus();
      toast.success('Manual scan initiated');
    } catch (_err) {
      toast.error('Failed to start manual scan');
    }
  };

  const resolveAnomaly = async (id: string) => {
    try {
      const res = await fetch(`/api/health/anomalies/${id}/resolve`, { method: 'POST' });
      if (!res.ok) throw new Error('Resolve failed');
      await mutateAnomalies();
      toast.success('Anomaly marked as resolved');
    } catch (_err) {
      toast.error('Failed to resolve anomaly');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isRunning ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Shadow Pilot</h3>
            <p className="text-[10px] text-zinc-500">Autonomous regression and vulnerability monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="shadow-pilot-toggle" className="text-[10px] uppercase tracking-tighter text-zinc-500">
              {isRunning ? 'Running' : 'Stopped'}
            </Label>
            <Switch
              id="shadow-pilot-toggle"
              checked={isRunning}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualScan}
            disabled={isRunning}
            className="h-8 text-[10px] uppercase tracking-widest border-white/10"
          >
            <Play className="mr-2 h-3 w-3" />
            Scan Now
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Activity className="h-3 w-3" />
          Active Anomalies ({activeAnomalies.length})
        </h4>

        {activeAnomalies.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-8 border-dashed flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500/20 mb-2" />
            <p className="text-xs text-zinc-500 italic">No anomalies detected. System is healthy.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {activeAnomalies.map((anomaly) => (
              <Card key={anomaly.id} className="bg-zinc-900/50 border-white/10 p-3 hover:bg-zinc-900 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-md ${
                      anomaly.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                      anomaly.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
                      anomaly.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{anomaly.title}</span>
                        <Badge variant="outline" className={`text-[8px] uppercase px-1.5 h-4 ${
                          anomaly.severity === 'critical' ? 'text-red-500 border-red-500/20' :
                          anomaly.severity === 'high' ? 'text-orange-500 border-orange-500/20' :
                          anomaly.severity === 'medium' ? 'text-yellow-500 border-yellow-500/20' :
                          'text-blue-500 border-blue-500/20'
                        }`}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-400 mb-2 line-clamp-2">{anomaly.description}</p>
                      <div className="text-[9px] text-zinc-600 font-mono">
                        {new Date(anomaly.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveAnomaly(anomaly.id)}
                    className="h-7 text-[9px] uppercase tracking-tighter text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Resolve
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
