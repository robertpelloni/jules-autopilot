'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plug, Download, Star, Check, Zap, Globe, ShieldCheck, Box, Trash2 } from "lucide-react";
import { ContextHelp } from "@/components/context-help";
import Link from 'next/link';
import { toast } from "sonner";

const AVAILABLE_PLUGINS = [
  { id: 'p1', name: 'Jira Integration', description: 'Connect tasks directly to Jira tickets and sync status updates.', author: 'Atlassian', installs: '12k', rating: 4.8, category: 'Productivity' },
  { id: 'p2', name: 'Slack Notifications', description: 'Get real-time updates in your Slack channels for critical events.', author: 'Slack', installs: '45k', rating: 4.9, category: 'Communication' },
  { id: 'p3', name: 'Figma to Code', description: 'Convert Figma designs into React components automatically.', author: 'Figma', installs: '8k', rating: 4.7, category: 'Design' },
  { id: 'p4', name: 'Sentry Reporting', description: 'Automatically log errors and exceptions to Sentry.', author: 'Sentry', installs: '22k', rating: 4.9, category: 'Monitoring' },
  { id: 'p5', name: 'VS Code Sync', description: 'Sync your local VS Code workspace settings with Jules.', author: 'Microsoft', installs: '55k', rating: 4.9, category: 'Developer Tools' },
  { id: 'p6', name: 'GitHub Copilot Bridge', description: 'Use Copilot suggestions within the Jules terminal.', author: 'GitHub', installs: '30k', rating: 4.6, category: 'AI' },
];

export default function PluginsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [installedPlugins, setInstalledPlugins] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('jules-installed-plugins');
    if (saved) {
      try {
        setInstalledPlugins(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse installed plugins", e);
      }
    }
  }, []);

  const handleInstall = (id: string) => {
    setProcessingId(id);
    // Simulate network request
    setTimeout(() => {
      const newSet = new Set(installedPlugins);
      newSet.add(id);
      setInstalledPlugins(newSet);
      localStorage.setItem('jules-installed-plugins', JSON.stringify(Array.from(newSet)));
      setProcessingId(null);
      toast.success("Plugin installed successfully");
    }, 1500);
  };

  const handleUninstall = (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
        const newSet = new Set(installedPlugins);
        newSet.delete(id);
        setInstalledPlugins(newSet);
        localStorage.setItem('jules-installed-plugins', JSON.stringify(Array.from(newSet)));
        setProcessingId(null);
        toast.info("Plugin uninstalled");
    }, 800);
  };

  const filteredPlugins = AVAILABLE_PLUGINS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
               <Link href="/system" className="text-white/40 hover:text-white transition-colors">
                  <Box className="h-6 w-6" />
               </Link>
               <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                Plugin Marketplace
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">Live</Badge>
              </h1>
            </div>
            <p className="text-white/40 mt-1 pl-9">Extend Jules with community-built integrations and tools.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search extensions..."
              className="pl-9 bg-zinc-900 border-white/10 text-white placeholder:text-white/30 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredPlugins.map((plugin) => {
              const isInstalled = installedPlugins.has(plugin.id);
              const isProcessing = processingId === plugin.id;

              return (
              <Card key={plugin.id} className={`bg-zinc-950 border-white/10 flex flex-col transition-all duration-200 group ${isInstalled ? 'border-purple-500/30 bg-purple-500/[0.02]' : 'hover:border-white/20'}`}>
                 <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                       <div className={`h-10 w-10 rounded flex items-center justify-center border ${isInstalled ? 'bg-purple-500/20 border-purple-500/30' : 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-white/5'}`}>
                          <Plug className={`h-5 w-5 ${isInstalled ? 'text-purple-300' : 'text-white/80'}`} />
                       </div>
                       {isInstalled && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-400 gap-1 h-5 text-[10px] border border-green-500/20">
                             <Check className="h-3 w-3" /> Installed
                          </Badge>
                       )}
                    </div>
                    <CardTitle className="mt-3 text-lg">{plugin.name}</CardTitle>
                    <CardDescription className="line-clamp-2 h-10">{plugin.description}</CardDescription>
                 </CardHeader>
                 <CardContent className="flex-1">
                    <div className="flex items-center gap-4 text-xs text-white/40">
                       <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" /> {plugin.installs}
                       </div>
                       <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500/20" /> {plugin.rating}
                       </div>
                       <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> {plugin.author}
                       </div>
                    </div>
                 </CardContent>
                 <CardFooter className="pt-0 gap-2">
                    {isInstalled ? (
                       <>
                           <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-white/60">Configure</Button>
                           <Button
                               variant="ghost"
                               size="icon"
                               className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                               onClick={() => handleUninstall(plugin.id)}
                               disabled={isProcessing}
                           >
                               <Trash2 className="h-4 w-4" />
                           </Button>
                       </>
                    ) : (
                       <Button
                         className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                         onClick={() => handleInstall(plugin.id)}
                         disabled={isProcessing}
                       >
                         {isProcessing ? (
                            <span className="flex items-center gap-2">
                               <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                               Installing...
                            </span>
                         ) : 'Install'}
                       </Button>
                    )}
                 </CardFooter>
              </Card>
           )})}
        </div>
      </div>
    </div>
  );
}
