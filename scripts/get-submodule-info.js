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

    return {
      path: pathStr,
      commit: commit,
      describe: describe || 'N/A',
      lastUpdated: new Date().toISOString()
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
