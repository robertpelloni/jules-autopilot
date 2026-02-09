'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Database, Terminal, FileCode, Server, ShieldCheck, Globe, Cpu, Lock, Zap } from "lucide-react";

// Mock data reflecting standard MCP tools
const MOCK_TOOLS = [
  { name: 'read_file', category: 'FileSystem', description: 'Reads file content from the local workspace.', status: 'active', latency: '2ms', secured: false },
  { name: 'write_file', category: 'FileSystem', description: 'Writes content to a file.', status: 'active', latency: '12ms', secured: true },
  { name: 'list_files', category: 'FileSystem', description: 'Lists files in a directory.', status: 'active', latency: '4ms', secured: false },
  { name: 'run_command', category: 'Terminal', description: 'Executes a bash command.', status: 'restricted', latency: '45ms', secured: true },
  { name: 'browserbase_navigate', category: 'Browser', description: 'Navigates to a URL using Browserbase.', status: 'beta', latency: '1.2s', secured: true },
  { name: 'memory_store', category: 'Memory', description: 'Stores key-value pairs in session memory.', status: 'active', latency: '1ms', secured: false },
  { name: 'memory_retrieve', category: 'Memory', description: 'Retrieves value from session memory.', status: 'active', latency: '1ms', secured: false },
  { name: 'git_status', category: 'Version Control', description: 'Checks git status of the repo.', status: 'active', latency: '15ms', secured: false },
];

export function McpServerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = MOCK_TOOLS.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch(category) {
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
            <CardTitle className="text-sm font-medium text-white/60">Server Status</CardTitle>
            <Server className="h-4 w-4 text-green-400 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">Online</div>
            <p className="text-xs text-white/40 mt-1">Uptime: 4d 12h 30m</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Active Tools</CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{MOCK_TOOLS.length}</div>
            <p className="text-xs text-white/40 mt-1">Across 5 categories</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Security Level</CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">High</div>
            <p className="text-xs text-white/40 mt-1">3 Restricted Tools</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-medium text-white">Tools Registry</CardTitle>
            <CardDescription className="text-white/40">Available capabilities exposed via MCP.</CardDescription>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => (
              <div key={tool.name} className="group relative rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(tool.category)}
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-white/10 text-white/60">
                      {tool.category}
                    </Badge>
                  </div>
                  {tool.secured && (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-400 h-5 px-1.5 gap-1 hover:bg-red-500/20">
                      <Lock className="h-3 w-3" /> Secured
                    </Badge>
                  )}
                </div>
                <h3 className="mt-3 font-mono text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="mt-1 text-xs text-white/60 line-clamp-2">
                  {tool.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-white/30">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${tool.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="uppercase">{tool.status}</span>
                  </div>
                  <span>~{tool.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
