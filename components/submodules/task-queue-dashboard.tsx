'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Play,
  Pause,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Layers,
  Activity
} from "lucide-react";

// Empty array reflecting that this feature is in preview and backend integration is pending
const INITIAL_TASKS: any[] = [];

export function TaskQueueDashboard() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [isRunning, setIsRunning] = useState(true);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">Completed</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 animate-pulse">Running</Badge>;
      case 'queued':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20">Queued</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-white/40 border-white/10">Unknown</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-white/60';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">Queue Status <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-0 px-1 text-[8px] h-4">PREVIEW</Badge></CardTitle>
            <Activity className={`h-4 w-4 ${isRunning ? 'text-green-400' : 'text-yellow-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">Paused</div>
            <p className="text-xs text-white/40 mt-1">Worker Pool: 0 Threads (Preview)</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">Pending Tasks <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-0 px-1 text-[8px] h-4">PREVIEW</Badge></CardTitle>
            <Layers className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-white/40 mt-1">Queue inactive</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">Success Rate <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-0 px-1 text-[8px] h-4">PREVIEW</Badge></CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-500">-</div>
            <p className="text-xs text-white/40 mt-1">No data available</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">Throughput <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-0 px-1 text-[8px] h-4">PREVIEW</Badge></CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-500">0/min</div>
            <p className="text-xs text-white/40 mt-1">Task queue suspended</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-medium text-white">Task List</CardTitle>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] h-5">PREVIEW MODE</Badge>
            </div>
            <CardDescription className="text-white/40 text-xs">Simulated task queue. Backend integration ETA: Q3.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className="h-8 text-xs border-white/10 hover:bg-white/5 bg-transparent"
            >
              {isRunning ? <Pause className="h-3 w-3 mr-2" /> : <Play className="h-3 w-3 mr-2" />}
              {isRunning ? 'Pause Queue' : 'Resume Queue'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-white/10 hover:bg-white/5 bg-transparent"
              onClick={() => setTasks([...tasks])} // Mock refresh
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 p-8 flex flex-col items-center justify-center text-center">
            <Layers className="h-12 w-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Queue Dashboard Preview</h3>
            <p className="text-sm text-white/50 max-w-sm mb-6">
              This dashboard is currently in preview. The distributed enterprise task queue backend will be available in a future update (ETA: Q3).
            </p>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
              Backend Integration Pending
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
