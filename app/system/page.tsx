'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, GitBranch, FolderTree, Clock, Hash, RefreshCw, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import submodulesData from "../submodules.json";

interface LiveSubmoduleStatus {
  path: string;
  commit: string;
  status: 'synced' | 'modified' | 'uninitialized';
  describe: string;
}

export default function SystemDashboard() {
  const { submodules: buildSubmodules, generatedAt } = (submodulesData as unknown as { 
    submodules: { path: string; commit: string; describe: string; lastUpdated: string }[], 
    generatedAt: string 
  });

  const [liveStatus, setLiveStatus] = useState<LiveSubmoduleStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.submodules) {
        setLiveStatus(data.submodules);
      }
    } catch (e) {
      console.error("Failed to fetch live status", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusBadge = (path: string) => {
    const live = liveStatus.find(s => s.path === path);
    if (!live) return <Badge variant="outline" className="text-white/40 border-white/10">Unknown</Badge>;
    
    if (live.status === 'synced') {
      return <Badge variant="outline" className="text-green-400 border-green-500/20 bg-green-500/10 gap-1"><CheckCircle2 className="h-3 w-3" /> Synced</Badge>;
    }
    if (live.status === 'modified') {
      return <Badge variant="outline" className="text-yellow-400 border-yellow-500/20 bg-yellow-500/10 gap-1"><AlertCircle className="h-3 w-3" /> Modified</Badge>;
    }
    return <Badge variant="outline" className="text-red-400 border-red-500/20 bg-red-500/10 gap-1"><HelpCircle className="h-3 w-3" /> Uninitialized</Badge>;
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <FolderTree className="h-6 w-6 text-purple-500" />
              System Dashboard
            </h1>
            <p className="text-white/40 text-sm">
              Submodule status and project structure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchStatus} disabled={isLoading} className="border-white/10 hover:bg-white/5">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            <Link href="/">
              <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to App
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Build Info */}
          <Card className="bg-zinc-950 border-white/10 md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-white/40">Build Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">Version</span>
                <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                  v{process.env.NEXT_PUBLIC_APP_VERSION || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">Generated</span>
                <span className="text-xs text-white/40 text-right">
                  {new Date(generatedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">Total Modules</span>
                <span className="text-xs font-bold">{buildSubmodules.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Project Structure Explanation */}
          <Card className="bg-zinc-950 border-white/10 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-white/40">Directory Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2 text-xs text-white/60">
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">app/</span>
                    <span>Next.js App Router pages, API routes, and layouts.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">components/</span>
                    <span>React components (UI, Features, Dialogs).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">external/</span>
                    <span>Git submodules for shared libraries, MCP servers, and tools.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">hooks/</span>
                    <span>Custom React hooks (e.g., use-notifications).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">lib/</span>
                    <span>Utility functions, API clients, and state stores.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">scripts/</span>
                    <span>Build and maintenance scripts (e.g., submodule info).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">docs/</span>
                    <span>Project documentation, PRDs, and handoff notes.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-400 font-bold">types/</span>
                    <span>TypeScript definitions.</span>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Separator className="bg-white/10" />

        {/* Submodules List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-wide text-white/80">Submodules</h2>
          <div className="grid gap-4">
            {buildSubmodules.map((mod) => (
              <Card key={mod.path} className="bg-zinc-950 border-white/10 hover:border-white/20 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded bg-white/5 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-white/40" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white/90">{mod.path}</div>
                      <div className="text-xs text-white/40 font-mono mt-1 flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        {mod.commit.substring(0, 7)}
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        {mod.describe}
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <Clock className="h-3 w-3" />
                        {new Date(mod.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(mod.path)}
                    <Badge variant="secondary" className="bg-white/5 text-white/60 hover:bg-white/10">
                      {mod.path.split('/')[0]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
