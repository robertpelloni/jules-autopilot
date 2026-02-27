import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { handleInternalError } from '@/lib/api/error';

const execAsync = promisify(exec);

export async function GET(req: Request) {
  try {
    const projectRoot = process.cwd();

    // Get raw submodule status
    const { stdout } = await execAsync('git submodule status --recursive', {
      cwd: projectRoot,
      encoding: 'utf8'
    });

    const lines = stdout.split('\n').filter(line => line.trim() !== '');

    const submodulesPromises = lines.map(async (line) => {
      const parts = line.trim().split(/\s+/);

      let commit = parts[0];
      const pathStr = parts[1];
      const describe = parts.slice(2).join(' ') || 'N/A';

      let status = 'synced';
      if (commit.startsWith('-')) {
        status = 'uninitialized';
        commit = commit.substring(1);
      } else if (commit.startsWith('+')) {
        status = 'modified';
        commit = commit.substring(1);
      } else if (commit.startsWith('U')) {
        status = 'conflict';
        commit = commit.substring(1);
      }

      let lastUpdated = new Date().toISOString();
      let url = '';
      let branch = 'HEAD';
      const name = path.basename(pathStr);
      let buildNumber = 0;

      try {
        const submodulePath = path.join(projectRoot, pathStr);
        if (fs.existsSync(submodulePath)) {
          // Parallel execution for faster gathering
          const [dateOut, configOut, branchOut, revOut] = await Promise.allSettled([
            execAsync(`git log -1 --format=%cd --date=iso`, { cwd: submodulePath, encoding: 'utf8' }),
            execAsync(`git config --get remote.origin.url`, { cwd: submodulePath, encoding: 'utf8' }),
            execAsync(`git rev-parse --abbrev-ref HEAD`, { cwd: submodulePath, encoding: 'utf8' }),
            execAsync(`git rev-list --count HEAD`, { cwd: submodulePath, encoding: 'utf8' })
          ]);

          if (dateOut.status === 'fulfilled') lastUpdated = dateOut.value.stdout.trim();
          if (configOut.status === 'fulfilled') url = configOut.value.stdout.trim();
          if (branchOut.status === 'fulfilled') branch = branchOut.value.stdout.trim();
          if (revOut.status === 'fulfilled') buildNumber = parseInt(revOut.value.stdout.trim(), 10);
        }
      } catch (e) {
        console.warn(`Could not get deep details for submodule ${pathStr}`);
      }

      return {
        name,
        path: pathStr,
        branch,
        commit,
        url,
        lastCommitDate: lastUpdated,
        buildNumber,
        describe,
        status
      };
    });

    const submodules = await Promise.all(submodulesPromises);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      submodules
    });

  } catch (error: any) {
    console.error('Failed to parse git submodules:', error);
    return handleInternalError(req, error);
  }
}
