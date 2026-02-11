import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Clock, FolderGit2, Hash, BookOpen, Info, ShieldCheck } from "lucide-react";
import { ContextHelp } from "@/components/context-help";
import Link from "next/link";
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

const getSubmoduleFeatures = (name: string) => {
  switch (name) {
    case 'antigravity-jules-orchestration':
      return ['65 MCP Tools', 'Task Queue', 'Autonomous Workflows'];
    case 'google-jules-mcp':
      return ['5 Auth Modes', 'Browserbase support', 'Screenshots'];
    case 'jules-action':
      return ['GitHub Events', 'Gemini 3 Pro', 'CI/CD Ready'];
    case 'jules-task-queue':
      return ['Concurrency Fix', 'Auto-Retry', 'Label Management'];
    case 'gemini-cli-jules':
      return ['Terminal Delegation', 'Async Tasks', 'Background Work'];
    case 'jules-awesome-list':
      return ['2700+ Stars', 'Curated Prompts', 'Best Practices'];
    default:
      return null;
  }
};

export function SubmoduleDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">Engineering Command Center</h1>
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">v0.7.1</Badge>
          <ContextHelp topic="submodules" className="h-6 w-6 text-muted-foreground hover:text-white" />
        </div>
        <p className="text-muted-foreground">
          System-wide overview of Jules orchestration, submodules, and specialized agents.
          Last Updated: {new Date(generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {submodules.map((submodule) => {
          const features = getSubmoduleFeatures(submodule.name);
          return (
            <Link key={submodule.path} href={`/system/submodules/${encodeURIComponent(submodule.name)}`}>
            <Card className="bg-zinc-950 border-white/10 flex flex-col group hover:border-purple-500/30 transition-all duration-300 cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2 group-hover:text-purple-400 transition-colors">
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
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 text-xs">
                {features && (
                  <div className="flex flex-wrap gap-1.5 py-2">
                    {features.map(f => (
                      <span key={f} className="px-1.5 py-0.5 rounded-sm bg-white/5 text-[10px] text-white/60 border border-white/5">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="space-y-2">
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
                      <Clock className="h-3 w-3" /> Last Activity
                    </span>
                    <span className="text-white/80">
                      {submodule.lastCommitDate ? formatDistanceToNow(new Date(submodule.lastCommitDate), { addSuffix: true }) : 'Unknown'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-t border-white/5">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <GitBranch className="h-3 w-3" /> Source
                    </span>
                    {submodule.url ? (
                      <a 
                        href={submodule.url.replace('.git', '')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline truncate max-w-[150px]"
                      >
                        GitHub Repo
                      </a>
                    ) : (
                      <span className="text-white/40">No remote</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          );
        })}
      </div>

      <Card className="bg-zinc-950 border-white/10 mt-8">
        <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              Directory Structure Explanation
            </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm prose-invert max-w-none">
            <p className="text-white/60 mb-4 text-sm">
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
