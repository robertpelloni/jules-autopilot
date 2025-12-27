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

    // Handle prefix
    if (commit.startsWith('-') || commit.startsWith('+') || commit.startsWith('U')) {
      commit = commit.substring(1);
    }

    let lastUpdated = new Date().toISOString();
    try {
        // Try to get the actual commit date of the submodule
        // We need to resolve the absolute path
        const submodulePath = path.join(__dirname, '..', pathStr);
        if (fs.existsSync(submodulePath)) {
            const dateOutput = execSync(`git log -1 --format=%cd --date=iso`, { cwd: submodulePath, encoding: 'utf8' });
            lastUpdated = dateOutput.trim();
        }
    } catch (e) {
        console.warn(`Could not get date for submodule ${pathStr}:`, e.message);
    }

    return {
      path: pathStr,
      commit: commit,
      describe: describe || 'N/A',
      lastUpdated: lastUpdated
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
