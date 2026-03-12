'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, GitBranch, ArrowRight, Server, Terminal, Lock, ExternalLink, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const PRESETS = [
  {
    repo: 'robertpelloni',
    name: 'jules-autopilot',
    description: 'The core Jules orchestrator environment. Connect to manage the master control plane.',
    icon: <Terminal className="h-5 w-5 text-purple-400" />,
    color: 'border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5',
    status: 'Ready',
    type: 'Core Control'
  },
  {
    repo: 'robertpelloni',
    name: 'opencode-autopilot',
    description: 'The OpenCode integration node. Connect to synchronize external swarm tasks.',
    icon: <GitBranch className="h-5 w-5 text-blue-400" />,
    color: 'border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5',
    status: 'Ready',
    type: 'Integration Node'
  }
];

export default function EnvironmentsDashboard() {
  const [customRepo, setCustomRepo] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (repo: string, name: string) => {
    setConnecting(`${repo}/${name}`);
    // Simulate connection flow for the dashboard
    setTimeout(() => {
      setConnecting(null);
      toast.success(`Successfully connected to ${repo}/${name} cloud environment.`);
    }, 1500);
  };

  const handleCustomConnect = () => {
    if (!customRepo || !customRepo.includes('/')) {
      toast.error('Please enter a valid repository format (e.g. owner/repo)');
      return;
    }
    const [repo, name] = customRepo.split('/');
    handleConnect(repo, name);
    setCustomRepo('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-teal-500/20">
                 <Cloud className="h-6 w-6 text-teal-400" />
             </div>
             <div>
                <h1 className="text-2xl font-bold">Cloud Dev Environments</h1>
                <p className="text-sm text-zinc-500">Manage and connect to specialized remote coding environments</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 px-2.5 py-1">
              <Zap className="h-3.5 w-3.5 mr-1 animate-pulse" /> Platform Online
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {PRESETS.map((env) => (
            <Card key={`${env.repo}/${env.name}`} className={`bg-zinc-900 border-white/10 ${env.color} transition-all duration-300 relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {env.icon}
              </div>
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 border-none">
                    {env.type}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-green-400 font-mono bg-green-500/10 px-2 py-0.5 rounded">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    {env.status}
                  </div>
                </div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white/90">
                   {env.icon}
                   {env.repo} / <span className="text-white">{env.name}</span>
                </CardTitle>
                <CardDescription className="text-zinc-400 mt-2 leading-relaxed">
                  {env.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                        <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Server className="h-3 w-3" /> Compute</div>
                        <div className="text-zinc-200 font-mono">16 vCPU / 64GB</div>
                    </div>
                    <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                        <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Lock className="h-3 w-3" /> Access</div>
                        <div className="text-zinc-200 font-mono">SSH / TCP Port-Forward</div>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="bg-black/20 border-t border-white/5 mt-auto pt-4">
                <Button 
                  className={`w-full bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/20 ${connecting === `${env.repo}/${env.name}` ? 'opacity-80' : ''}`}
                  onClick={() => handleConnect(env.repo, env.name)}
                  disabled={connecting !== null}
                >
                  {connecting === `${env.repo}/${env.name}` ? (
                    'Connecting...'
                  ) : (
                    <span className="flex items-center">
                      Launch Environment <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Custom Input Section */}
        <Card className="bg-zinc-900/50 border-white/5 mt-8">
           <CardHeader>
              <CardTitle className="text-base font-semibold text-white/80">Connect Custom Environment</CardTitle>
              <CardDescription>Target a specific remote Github repository environment.</CardDescription>
           </CardHeader>
           <CardContent>
              <div className="flex gap-3">
                  <Input 
                     placeholder="e.g. microsoft/vscode" 
                     className="bg-black/50 border-white/10 text-white font-mono"
                     value={customRepo}
                     onChange={(e) => setCustomRepo(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleCustomConnect()}
                  />
                  <Button variant="outline" className="border-white/10 hover:bg-white/5 text-zinc-300" onClick={handleCustomConnect} disabled={connecting !== null}>
                      Connect <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
              </div>
           </CardContent>
        </Card>

      </div>
    </div>
  );
}
