'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, GitCommit, Folder, Clock, ShieldCheck, Box } from 'lucide-react';

interface SubmoduleInfo {
  path: string;
  status: string;
  url?: string;
  commit?: string;
  buildNumber?: number;
  lastCommitDate?: string;
  lastUpdate?: string;
}

export default function SystemInternalsPage() {
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system/submodules')
      .then(res => res.json())
      .then(data => {
        if (data.submodules) setSubmodules(data.submodules);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="h-full overflow-hidden flex flex-col bg-black text-white p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">System Internals</h1>
        <p className="text-muted-foreground">
          Architecture overview and submodule status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-hidden">
        {/* Submodules Panel */}
        <Card className="bg-zinc-950 border-white/10 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-purple-400" />
              <CardTitle>Submodules & Dependencies</CardTitle>
            </div>
            <CardDescription>External repositories linked to this project</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading submodule data...</div>
                ) : submodules.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No submodules found.</div>
                ) : (
                  submodules.map((sub, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {sub.path}
                            <Badge variant="outline" className="text-[10px] h-5">{sub.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">{sub.url}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs text-zinc-400" title="Commit Hash">
                          <GitCommit className="h-3 w-3" />
                          <span className="font-mono text-[10px]">{sub.commit?.substring(0, 7)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400" title="Build Number">
                          <ShieldCheck className="h-3 w-3" />
                          <span className="font-mono text-[10px]">v{sub.buildNumber || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400" title="Last Updated">
                          <Clock className="h-3 w-3" />
                          <span className="text-[10px] truncate">{new Date(sub.lastCommitDate || sub.lastUpdate || "").toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Project Structure Panel */}
        <Card className="bg-zinc-950 border-white/10 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-blue-400" />
              <CardTitle>Project Structure</CardTitle>
            </div>
            <CardDescription>Directory layout and component organization</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="p-6 font-mono text-xs leading-relaxed text-zinc-300">
                <ul className="space-y-4">
                  <li>
                    <div className="font-bold text-white flex items-center gap-2"><Folder className="h-3 w-3 text-blue-500" /> app/</div>
                    <ul className="pl-4 pt-1 space-y-1 text-zinc-400">
                      <li>api/ <span className="text-zinc-600">- Next.js API Routes (Serverless)</span></li>
                      <li>(routes)/ <span className="text-zinc-600">- Page routes</span></li>
                      <li>globals.css <span className="text-zinc-600">- Global styles (Tailwind)</span></li>
                    </ul>
                  </li>
                  <li>
                    <div className="font-bold text-white flex items-center gap-2"><Folder className="h-3 w-3 text-blue-500" /> components/</div>
                    <ul className="pl-4 pt-1 space-y-1 text-zinc-400">
                      <li>ui/ <span className="text-zinc-600">- Primitive UI components (buttons, cards)</span></li>
                      <li>session-keeper/ <span className="text-zinc-600">- Auto-pilot & persistence logic</span></li>
                      <li>debate/ <span className="text-zinc-600">- Multi-agent debate visuals</span></li>
                    </ul>
                  </li>
                  <li>
                    <div className="font-bold text-white flex items-center gap-2"><Folder className="h-3 w-3 text-blue-500" /> lib/</div>
                    <ul className="pl-4 pt-1 space-y-1 text-zinc-400">
                      <li>stores/ <span className="text-zinc-600">- Zustand state stores</span></li>
                      <li>prisma.ts <span className="text-zinc-600">- DB client instance</span></li>
                      <li>jules/ <span className="text-zinc-600">- Jules Client SDK</span></li>
                    </ul>
                  </li>
                  <li>
                    <div className="font-bold text-white flex items-center gap-2"><Folder className="h-3 w-3 text-blue-500" /> prisma/</div>
                    <ul className="pl-4 pt-1 space-y-1 text-zinc-400">
                      <li>schema.prisma <span className="text-zinc-600">- Database Schema (SQLite)</span></li>
                      <li>migrations/ <span className="text-zinc-600">- SQL migration history</span></li>
                    </ul>
                  </li>
                  <li>
                    <div className="font-bold text-white flex items-center gap-2"><Folder className="h-3 w-3 text-yellow-500" /> submodules/</div>
                    <ul className="pl-4 pt-1 space-y-1 text-zinc-400">
                      <li>jules-agent-sdk-python/ <span className="text-zinc-600">- Python Reference SDK</span></li>
                    </ul>
                  </li>
                </ul>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
