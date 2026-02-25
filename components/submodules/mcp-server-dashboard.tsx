'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Database, Terminal, FileCode, Server, ShieldCheck, Globe, Cpu, Lock, Zap } from "lucide-react";

// Empty array reflecting that this feature is in preview and backend integration is pending
const MOCK_TOOLS: any[] = [];

export function McpServerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = MOCK_TOOLS.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'FileSystem': return <FileCode className="h-4 w-4 text-blue-400" />;
      case 'Terminal': return <Terminal className="h-4 w-4 text-green-400" />;
      case 'Browser': return <Globe className="h-4 w-4 text-orange-400" />;
      case 'Memory': return <Database className="h-4 w-4 text-purple-400" />;
      case 'Version Control': return <ShieldCheck className="h-4 w-4 text-yellow-400" />;
      default: return <Cpu className="h-4 w-4 text-white/40" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">Server Status <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-0 px-1 text-[8px] h-4">PREVIEW</Badge></CardTitle>
            <Server className="h-4 w-4 text-green-400 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-500">Offline</div>
            <p className="text-xs text-white/40 mt-1">Pending Configuration</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">Active Tools <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-0 px-1 text-[8px] h-4">PREVIEW</Badge></CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-white/40 mt-1">No MCP servers connected</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">Security Level <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-0 px-1 text-[8px] h-4">PREVIEW</Badge></CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-500">N/A</div>
            <p className="text-xs text-white/40 mt-1">No active transport</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-medium text-white">Tools Registry</CardTitle>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] h-5">PREVIEW MODE</Badge>
            </div>
            <CardDescription className="text-white/40 text-xs">Simulated MCP registry. Dynamic MCP connections ETA: Q3.</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search tools..."
              className="pl-8 bg-zinc-900 border-white/10 text-white placeholder:text-white/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 p-8 flex flex-col items-center justify-center text-center">
            <Server className="h-12 w-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">MCP Registry Preview</h3>
            <p className="text-sm text-white/50 max-w-sm mb-6">
              This registry is currently in preview. The dynamic MCP connection management and routing features will be available in a future update (ETA: Q3).
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
