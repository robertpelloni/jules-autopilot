/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputPath = path.join(__dirname, '../app/submodules.json');

try {
  const output = execSync('git submodule status --recursive', { encoding: 'utf8' });
  const lines = output.split('\n').filter(line => line.trim() !== '');

  const submodules = lines.map(line => {
    const parts = line.trim().split(/\s+/);
    // Format: [prefix]commit hash path [describe]
    // prefix is - (uninitialized), + (modified), U (merge conflict)
    
    let commit = parts[0];
    let pathStr = parts[1];
    let describe = parts.slice(2).join(' ');

    let status = 'synced';
    // Handle prefix
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
    let name = path.basename(pathStr);
    let buildNumber = 0;

    try {
        // Try to get the actual commit date of the submodule
        const submodulePath = path.join(__dirname, '..', pathStr);
        if (fs.existsSync(submodulePath)) {
            const dateOutput = execSync(`git log -1 --format=%cd --date=iso`, { cwd: submodulePath, encoding: 'utf8' });
            lastUpdated = dateOutput.trim();
            
            // Try to get remote URL
            try {
                const urlOutput = execSync(`git config --get remote.origin.url`, { cwd: submodulePath, encoding: 'utf8' });
                url = urlOutput.trim();
            } catch (e) {
                // Fallback to reading .gitmodules if needed, but git config in submodule is better
            }

            // Try to get branch
            try {
               const branchOutput = execSync(`git rev-parse --abbrev-ref HEAD`, { cwd: submodulePath, encoding: 'utf8' });
               branch = branchOutput.trim();
            } catch (e) {}

            // Calculate Build Number (Commit Count)
            try {
               const countOutput = execSync(`git rev-list --count HEAD`, { cwd: submodulePath, encoding: 'utf8' });
               buildNumber = parseInt(countOutput.trim(), 10);
            } catch (e) {}
        }
    } catch (e) {
        console.warn(`Could not get details for submodule ${pathStr}:`, e.message);
    }

    return {
      name: name,
      path: pathStr,
      branch: branch,
      commit: commit,
      url: url,
      lastCommitDate: lastUpdated,
      buildNumber: buildNumber,
      describe: describe || 'N/A',
      status: status
    };
  });

  const data = {
    generatedAt: new Date().toISOString(),
    submodules: submodules
  };

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Submodule info written to ${outputPath}`);

} catch (error) {
  console.error('Failed to get submodule info:', error);
  // Write empty or error state
  fs.writeFileSync(outputPath, JSON.stringify({ error: error.message, submodules: [] }, null, 2));
}
