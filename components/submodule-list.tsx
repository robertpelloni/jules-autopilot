'use client';

import { useState, useEffect } from 'react';
import { 
  Github, 
  GitBranch, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Search,
  ExternalLink,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Submodule {
  name: string;
  path: string;
  hash: string;
  fullHash: string;
  ref: string;
  status: 'synced' | 'modified' | 'uninitialized';
}

export function SubmoduleList() {
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadSubmodules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/submodules');
      const data = await response.json();
      setSubmodules(data.submodules || []);
    } catch (err) {
      console.error("Failed to load submodules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmodules();
  }, []);

  const filtered = submodules.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input 
            placeholder="Search submodules..." 
            className="h-9 pl-9 bg-black/40 border-white/10 text-xs font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadSubmodules}
          disabled={loading}
          className="h-9 border-white/10 hover:bg-white/5 font-mono uppercase text-[10px] tracking-widest"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} />
          Sync Status
        </Button>
      </div>

      <div className="flex-1 min-h-0 border border-white/5 rounded-xl bg-black/20 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-white/5">
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Repository</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Commit SHA</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
                      {loading ? "Discovering local architecture..." : "No submodules detected in this environment."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((sub) => (
                    <tr key={sub.path} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-tight">{sub.name}</span>
                            <a href={`https://github.com/robertpelloni/${sub.name}`} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="h-2.5 w-2.5 text-zinc-500 hover:text-white" />
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500">
                            <Code className="h-2.5 w-2.5" />
                            <span>{sub.path}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-3 w-3 text-zinc-600" />
                          <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{sub.hash}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {sub.status === 'synced' ? (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-green-500 uppercase tracking-widest">
                              <CheckCircle2 className="h-3 w-3" />
                              Synced
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-yellow-500 uppercase tracking-widest">
                              <AlertCircle className="h-3 w-3" />
                              Modified
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-300/80 leading-relaxed font-mono">
          <span className="text-white font-bold uppercase tracking-tighter">Architecture Note:</span> This node utilizes a Git Submodule architecture for plugin isolation. Live status tracking ensures that the collective intelligence is always operating on the correct build versions.
        </p>
      </div>
    </div>
  );
}
