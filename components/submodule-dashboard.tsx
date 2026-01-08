import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Clock, FolderGit2, Hash } from "lucide-react";
import submoduleInfo from "@/app/submodules.json";
import { formatDistanceToNow } from "date-fns";

interface Submodule {
  name: string;
  path: string;
  branch: string;
  commit: string;
  url: string;
  lastCommitDate?: string;
  describe?: string;
  status?: string;
}

// Ensure type safety for the imported JSON
const submodules = (submoduleInfo as any).submodules as Submodule[];
const generatedAt = (submoduleInfo as any).generatedAt as string;

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'synced': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'modified': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'uninitialized': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'conflict': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    default: return 'bg-white/5 text-white/40 border-white/10';
  }
};

export function SubmoduleDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Project Architecture & Submodules</h1>
        <p className="text-muted-foreground">
          Overview of the Jules monorepo structure, submodule versions, and build status.
          Generated: {new Date(generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {submodules.map((submodule) => (
          <Card key={submodule.path} className="bg-zinc-950 border-white/10 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-purple-400" />
                    {submodule.name}
                  </CardTitle>
                  <CardDescription className="font-mono text-[10px] mt-1 text-white/40 break-all">
                    {submodule.path}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={`text-[10px] font-mono ${getStatusColor(submodule.status)}`}>
                    {submodule.status || 'unknown'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono bg-white/5 border-white/10 text-white/60">
                    {submodule.branch}
                  </Badge>
                  {submodule.describe && (
                    <Badge variant="outline" className="text-[10px] font-mono bg-purple-500/10 border-purple-500/20 text-purple-400">
                      {submodule.describe}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end gap-3 text-xs">
              <div className="flex items-center justify-between py-1 border-t border-white/5">
                <span className="text-white/40 flex items-center gap-1.5">
                  <Hash className="h-3 w-3" /> Commit
                </span>
                <span className="font-mono text-white/80">
                  {submodule.commit.substring(0, 8)}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-1 border-t border-white/5">
                <span className="text-white/40 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Last Updated
                </span>
                <span className="text-white/80">
                   {submodule.lastCommitDate ? formatDistanceToNow(new Date(submodule.lastCommitDate), { addSuffix: true }) : 'Unknown'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-white/5">
                <span className="text-white/40 flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" /> Remote
                </span>
                {submodule.url ? (
                  <a 
                    href={submodule.url.replace('.git', '')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline truncate max-w-[150px]"
                  >
                    View on GitHub
                  </a>
                ) : (
                  <span className="text-white/40">No remote</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-950 border-white/10 mt-8">
        <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Directory Structure Explanation</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm prose-invert max-w-none">
            <p className="text-white/60 mb-4">
                The Jules project follows a modular monorepo structure. The core UI application resides in the root, while specialized functionalities are encapsulated in submodules within the <code>external/</code> directory.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 text-sm text-white/80">
                <li className="bg-white/5 p-3 rounded border border-white/5">
                    <strong className="text-purple-400 block mb-1">app/</strong>
                    Next.js App Router structure containing pages, API routes, and layouts.
                </li>
                 <li className="bg-white/5 p-3 rounded border border-white/5">
                    <strong className="text-purple-400 block mb-1">components/</strong>
                    React components, including UI primitives (shadcn/ui) and feature-specific components like <code>activity-feed</code> and <code>session-list</code>.
                </li>
                 <li className="bg-white/5 p-3 rounded border border-white/5">
                    <strong className="text-purple-400 block mb-1">external/antigravity-jules-orchestration/</strong>
                    Core logic for agent orchestration and task management.
                </li>
                 <li className="bg-white/5 p-3 rounded border border-white/5">
                    <strong className="text-purple-400 block mb-1">external/jules-mcp-server/</strong>
                    The Model Context Protocol (MCP) server implementation for Jules.
                </li>
                <li className="bg-white/5 p-3 rounded border border-white/5">
                    <strong className="text-purple-400 block mb-1">lib/</strong>
                    Utility libraries, API clients (<code>jules-client</code>), and state management stores.
                </li>
                 <li className="bg-white/5 p-3 rounded border border-white/5">
                    <strong className="text-purple-400 block mb-1">prisma/</strong>
                    Database schema and migration files for the main application SQLite database.
                </li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
