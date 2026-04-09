import { notFound } from "next/navigation";
import submoduleInfo from "@/app/submodules.json";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, GitBranch, Hash, Clock, ExternalLink, Activity, Settings, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContextHelp } from "@/components/context-help";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDocContent } from "@/lib/docs";
import { TaskQueueDashboard } from "@/components/submodules/task-queue-dashboard";
import { McpServerDashboard } from "@/components/submodules/mcp-server-dashboard";
import { TerminalStream } from "@/components/submodules/terminal-stream";

// Define the shape of submodule data matching submodules.json
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

// Helper to get features (reuse from dashboard or move to utils)
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
      return [];
  }
};

export async function generateStaticParams() {
  const submodules = (submoduleInfo as { submodules: Submodule[] }).submodules;
  return submodules.map((s) => ({
    name: s.name,
  }));
}

export default async function SubmoduleDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const submodules = (submoduleInfo as { submodules: Submodule[] }).submodules;
  const submodule = submodules.find((s) => s.name === name);

  if (!submodule) {
    notFound();
  }

  // Attempt to load docs for this submodule if available
  // We'll map submodule names to doc slugs if they exist
  const docSlugMap: Record<string, string> = {
    'jules-mcp-server': 'submodules', // Generic fallback or specific
    'antigravity-jules-orchestration': 'submodules',
  };

  const docSlug = docSlugMap[name];
  const doc = docSlug ? getDocContent(docSlug) : null;

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/system">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-white/60">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {submodule.name}
              </h1>
              <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400">
                {submodule.branch}
              </Badge>
              <ContextHelp topic="submodules" />
            </div>
            <p className="text-white/40 text-sm pl-11">
              {submodule.path}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {submodule.url && (
              <a href={submodule.url.replace('.git', '')} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2 border-white/10 hover:bg-white/5">
                  <ExternalLink className="h-4 w-4" />
                  View Source
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Stats / Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-950 border-white/10">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Hash className="h-3 w-3" /> Commit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-sm font-bold font-mono">{submodule.commit.substring(0, 8)}</div>
              <div className="text-[10px] text-white/30 mt-1 truncate" title={submodule.commit}>Full: {submodule.commit}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-white/10">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Last Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-sm font-bold">
                {submodule.lastCommitDate ? formatDistanceToNow(new Date(submodule.lastCommitDate), { addSuffix: true }) : 'Unknown'}
              </div>
              <div className="text-[10px] text-white/30 mt-1">{submodule.lastCommitDate ? new Date(submodule.lastCommitDate).toLocaleDateString() : '-'}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-white/10">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Activity className="h-3 w-3" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-sm font-bold uppercase">{submodule.status || 'Unknown'}</div>
              <div className="text-[10px] text-white/30 mt-1">Local Git Status</div>
            </CardContent>
          </Card>

           <Card className="bg-zinc-950 border-white/10">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                <GitBranch className="h-3 w-3" /> Version
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-sm font-bold font-mono">{submodule.describe || 'v0.0.0'}</div>
              <div className="text-[10px] text-white/30 mt-1">Git Describe</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-zinc-900 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">Overview</TabsTrigger>
            <TabsTrigger value="configuration" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">Configuration</TabsTrigger>
            <TabsTrigger value="docs" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">Documentation</TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
             {submodule.name === 'jules-task-queue' && (
               <div className="mb-6">
                  <TaskQueueDashboard />
               </div>
             )}

             {submodule.name === 'jules-mcp-server' && (
               <div className="mb-6">
                  <McpServerDashboard />
               </div>
             )}

             <Card className="bg-zinc-950 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-white">Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {getSubmoduleFeatures(submodule.name).map((feature) => (
                      <Badge key={feature} variant="secondary" className="bg-white/5 border-white/10 text-white/80">
                        {feature}
                      </Badge>
                    ))}
                    {getSubmoduleFeatures(submodule.name).length === 0 && (
                      <span className="text-white/40 italic text-sm">No specific features listed.</span>
                    )}
                  </div>
                </CardContent>
             </Card>

             <Card className="bg-zinc-950 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-white/60">
                    Common actions for this submodule. (Note: These are placeholders for future integrations).
                  </p>
                  <div className="flex gap-4">
                     <Button variant="outline" className="border-white/10 hover:bg-white/5">Check for Updates</Button>
                     <Button variant="outline" className="border-white/10 hover:bg-white/5">View Changelog</Button>
                     <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10">Reset to Head</Button>
                  </div>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="configuration" className="mt-6">
            <Card className="bg-zinc-950 border-white/10">
               <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                  <Settings className="h-12 w-12 text-white/10 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Configuration Unavailable</h3>
                  <p className="text-white/40 text-sm max-w-md">
                    Configuration options for this submodule are not exposed in the UI yet. Please check the <code>.env</code> file or submodule configuration files directly.
                  </p>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-6">
             {doc ? (
                <Card className="bg-zinc-950 border-white/10">
                  <CardContent className="p-6 prose prose-invert max-w-none">
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
                  </CardContent>
                </Card>
             ) : (
                <Card className="bg-zinc-950 border-white/10">
                   <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                      <BookOpen className="h-12 w-12 text-white/10 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Documentation Found</h3>
                      <p className="text-white/40 text-sm max-w-md">
                        We couldn&apos;t find specific documentation linked to this submodule in the registry.
                      </p>
                   </CardContent>
                </Card>
             )}
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            {submodule.name === 'gemini-cli-jules' ? (
                <TerminalStream agentName={submodule.name} />
            ) : (
                <Card className="bg-zinc-950 border-white/10">
                   <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                      <Activity className="h-12 w-12 text-white/10 mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No Live Logs</h3>
                      <p className="text-white/40 text-sm max-w-md">
                        This submodule is not currently emitting live logs to the dashboard.
                      </p>
                   </CardContent>
                </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
