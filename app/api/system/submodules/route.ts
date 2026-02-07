import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const rootDir = process.cwd();
    const gitmodulesPath = path.join(rootDir, '.gitmodules');

    const submodules: Record<string, string>[] = [];

    if (fs.existsSync(gitmodulesPath)) {
       const gitmodulesContent = fs.readFileSync(gitmodulesPath, 'utf-8');
       const lines = gitmodulesContent.split('\n');

       let currentSubmodule: Record<string, string> = {};

       for (const line of lines) {
           if (line.trim().startsWith('[submodule')) {
               if (currentSubmodule.path) {
                   submodules.push(currentSubmodule);
               }
               currentSubmodule = {};
           } else if (line.trim().startsWith('path = ')) {
               currentSubmodule.path = line.split('=')[1].trim();
           } else if (line.trim().startsWith('url = ')) {
               currentSubmodule.url = line.split('=')[1].trim();
           }
       }
       if (currentSubmodule.path) {
           submodules.push(currentSubmodule);
       }
    }

    // Get status for each submodule
    const submodulesWithStatus = submodules.map(sub => {
        try {
            const status = execSync(`git submodule status ${sub.path}`, { cwd: rootDir }).toString().trim();
            // Format: -f893489348934893489 path (describe)
            const parts = status.split(' ');
            const hash = parts[0].replace(/^[+-]/, '');

            // Get last commit date
            const date = execSync(`cd ${sub.path} && git show -s --format=%ci ${hash}`).toString().trim();

            return {
                ...sub,
                hash,
                status: status.startsWith('-') ? 'Uninitialized' : (status.startsWith('+') ? 'Modified' : 'Clean'),
                lastUpdate: date
            };
        } catch (e) {
            return { ...sub, error: 'Failed to get git status' };
        }
    });

    return NextResponse.json({ submodules: submodulesWithStatus });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch submodules' }, { status: 500 });
  }
}
