'use client';

import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Submodule {
  name: string;
  path: string;
  hash: string;
  fullHash: string;
  ref: string;
  status: 'synced' | 'modified' | 'uninitialized';
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function SubmoduleList() {
  const { data, error, mutate, isLoading } = useSWR<{ submodules: Submodule[] }>('/api/system/submodules', fetcher, {
    refreshInterval: 30000,
  });

  const handleRefresh = async () => {
    toast.promise(mutate(), {
      loading: 'Updating submodule status...',
      success: 'Submodule status updated',
      error: 'Failed to update submodules',
    });
  };

  if (error) return <div className="p-4 text-red-400 text-xs">Failed to load submodules</div>;

  const submodules = data?.submodules || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-purple-400" />
          Git Submodules
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-8 text-[10px] uppercase tracking-widest border-white/10"
        >
          <RefreshCw className={`mr-2 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {submodules.length === 0 && !isLoading && (
          <p className="text-xs text-zinc-500 italic p-4 border border-dashed border-white/10 rounded-lg">
            No submodules detected in this repository.
          </p>
        )}

        {submodules.map((sub) => (
          <Card key={sub.path} className="bg-white/5 border-white/10 p-3 flex items-center justify-between group hover:bg-white/[0.08] transition-colors">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{sub.name}</span>
                <Badge variant="outline" className={`text-[9px] uppercase h-4 px-1.5 ${
                  sub.status === 'synced' ? 'text-green-400 border-green-500/20 bg-green-500/5' :
                  sub.status === 'modified' ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' :
                  'text-zinc-500 border-zinc-500/20 bg-zinc-500/5'
                }`}>
                  {sub.status === 'synced' ? <CheckCircle2 className="h-2 w-2 mr-1" /> : <AlertCircle className="h-2 w-2 mr-1" />}
                  {sub.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                <span className="flex items-center gap-1">
                  <span className="text-zinc-600">hash:</span> {sub.hash}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-600">ref:</span> {sub.ref}
                </span>
              </div>
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white" asChild>
              <a href={`https://github.com/robertpelloni/${sub.name}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
