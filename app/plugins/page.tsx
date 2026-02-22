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
import { PluginRegistryItem } from '@/lib/schemas/plugins';

export default function PluginsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [registry, setRegistry] = useState<PluginRegistryItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRegistry = async () => {
    try {
      const res = await fetch('/api/plugins/registry');
      if (res.ok) {
        const data = await res.json();
        setRegistry(data.plugins || []);
      }
    } catch (e) {
      console.error("Failed to load plugin registry", e);
      toast.error('Failed to connect to the plugin registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const handleInstall = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/plugins/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Plugin installed successfully");
      await fetchRegistry(); // Refresh states
    } catch (e) {
      console.error(e);
      toast.error("Failed to install plugin");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUninstall = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/plugins/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(await res.text());

      toast.info("Plugin uninstalled");
      await fetchRegistry(); // Refresh states
    } catch (e) {
      console.error(e);
      toast.error("Failed to uninstall plugin");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPlugins = registry.filter(p =>
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
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-white/40">Connecting to secure plugin registry...</div>
          ) : filteredPlugins.length === 0 ? (
            <div className="col-span-full py-12 text-center text-white/40">No extensions found matching your search.</div>
          ) : filteredPlugins.map((plugin) => {
            const isInstalled = plugin.isInstalled;
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
                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {plugin.version}
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> {plugin.author}
                    </div>
                    {plugin.capabilities.length > 0 && (
                      <div className="flex items-center gap-1 col-span-full mt-2 w-full text-zinc-500 font-mono text-[10px]">
                        <Zap className="h-3 w-3" /> {plugin.capabilities.length} capabilities
                      </div>
                    )}
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
            )
          })}
        </div>
      </div>
    </div>
  );
}
