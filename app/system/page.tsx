import { execSync } from 'child_process';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubmoduleInfo {
  path: string;
  commit: string;
  branch: string;
  status: string;
  lastUpdate?: string;
  buildNumber?: string;
}

function getSubmodules(): SubmoduleInfo[] {
  try {
    const output = execSync('git submodule status', { encoding: 'utf-8' });
    return output.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(' ');
      const path = parts[1];
      let lastUpdate = 'Unknown';
      let buildNumber = '0';
      try {
          const dateStr = execSync(`git log -1 --format=%cd --date=short ${path}`, { encoding: 'utf-8' }).trim();
          lastUpdate = dateStr;

          // Estimate build number via commit count in submodule
          // This assumes the submodule is checked out and git is accessible
          // We use 'git -C path'
          // Note: This might fail in some environments if .git is not fully linked, but we try.
          // Since submodules are in the root, we can try accessing them directly.
          // Actually 'git submodule status' gives the commit of the superproject's pointer.
          // To get the submodule's commit count, we need to execute inside it.
          // But security constraints/paths might be tricky. Let's try.
          // Simple commit count for build number
          // buildNumber = execSync(`git -C ${path} rev-list --count HEAD`, { encoding: 'utf-8' }).trim();
      } catch (e) { /* ignore */ }

      return {
        status: line[0], // ' ' = clean, '+' = modified, '-' = uninitialized
        commit: parts[0].replace(/^[+\-]/, ''),
        path: path,
        branch: parts[2] || 'HEAD',
        lastUpdate,
        buildNumber
      };
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}

function getProjectBuildNumber(): string {
    try {
        return execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    } catch { return '0'; }
}

export default function SystemPage() {
  const submodules = getSubmodules();
  const projectBuild = getProjectBuildNumber();
  const projectStructure = [
    { path: 'app/', desc: 'Next.js App Router pages (e.g., /, /board, /system) and API routes.' },
    { path: 'components/', desc: 'React components. `ui/` contains shadcn primitives. `*` contains feature components.' },
    { path: 'lib/', desc: 'Core logic. `jules/` for API client, `orchestration/` for multi-agent logic.' },
    { path: 'external/', desc: 'Vendor/Submodule dependencies (e.g. MCP servers, tools).' },
    { path: 'jules-sdk-reference/', desc: 'Official Python SDK reference implementation.' },
    { path: 'deploy/', desc: 'Docker Compose and deployment configuration.' },
    { path: 'docs/', desc: 'Project documentation, ADRs, and Agent Instructions.' },
    { path: 'types/', desc: 'TypeScript type definitions.' },
  ];

  return (
    <div className="container mx-auto p-8 text-white h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-widest">System Status</h1>
          <div className="flex gap-4">
              <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Build</span>
                  <span className="font-mono text-sm font-bold text-purple-400">#{projectBuild}</span>
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Version</span>
                  <span className="font-mono text-sm font-bold text-white">v0.4.4</span>
              </div>
          </div>
      </div>

      <div className="grid gap-6">
        <Card className="bg-zinc-950 border-white/10">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-sm text-white/60">Submodule Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submodules.length === 0 ? (
                 <p className="text-sm text-white/40">No submodules found or git not available.</p>
              ) : submodules.map(sub => (
                <div key={sub.path} className="flex items-center justify-between p-3 border border-white/10 rounded bg-white/5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-purple-400">{sub.path}</span>
                        {sub.status === '+' && <Badge variant="secondary" className="text-[10px] h-4">Modified</Badge>}
                        {sub.status === '-' && <Badge variant="destructive" className="text-[10px] h-4">Uninitialized</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/50 font-mono">
                         <span title="Commit Hash">{sub.commit.substring(0, 8)}</span>
                         <span>•</span>
                         <span title="Last Update">{sub.lastUpdate}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs border-white/20 text-white/70">
                    {sub.branch.replace(/[()]/g, '')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/10">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-sm text-white/60">Project Directory Map</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {projectStructure.map(item => (
                <li key={item.path} className="flex flex-col sm:flex-row sm:gap-4 text-sm py-1 border-b border-white/5 last:border-0">
                  <span className="font-mono text-purple-400 w-48 shrink-0 font-bold">{item.path}</span>
                  <span className="text-white/60">{item.desc}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
