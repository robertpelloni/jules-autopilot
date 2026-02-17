const fs = require('fs');
const path = require('path');

const versionMdPath = path.join(__dirname, '../VERSION.md');
const versionPath = path.join(__dirname, '../VERSION');
const packageJsonPath = path.join(__dirname, '../package.json');
const versionTsPath = path.join(__dirname, '../lib/version.ts');

const semverPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const normalizeVersionText = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();

const readTextAutoEncoding = (filePath) => {
  const buffer = fs.readFileSync(filePath);

  // UTF-16 LE BOM
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }

  // UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8');
  }

  return buffer.toString('utf8');
};

const readTrimmed = (filePath) => normalizeVersionText(readTextAutoEncoding(filePath));

const canonicalVersion = readTrimmed(versionMdPath);
const flatVersion = readTrimmed(versionPath);
const packageVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
const versionTs = fs.readFileSync(versionTsPath, 'utf8');

const appVersionMatch = versionTs.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
const appVersion = appVersionMatch?.[1];

const errors = [];

if (!semverPattern.test(canonicalVersion)) {
  errors.push(`VERSION.md is not a valid semantic version: "${canonicalVersion}"`);
}

if (flatVersion !== canonicalVersion) {
  errors.push(`VERSION (${flatVersion}) does not match VERSION.md (${canonicalVersion}).`);
}

if (packageVersion !== canonicalVersion) {
  errors.push(`package.json version (${packageVersion}) does not match VERSION.md (${canonicalVersion}).`);
}

if (!appVersion) {
  errors.push('Could not parse APP_VERSION from lib/version.ts');
} else if (appVersion !== canonicalVersion) {
  errors.push(`lib/version.ts APP_VERSION (${appVersion}) does not match VERSION.md (${canonicalVersion}).`);
}

if (errors.length > 0) {
  console.error('❌ Version synchronization check failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  console.error('\nRun "npm run update-version" after updating VERSION.md.');
  process.exit(1);
}

console.log(`✅ Version synchronization check passed (${canonicalVersion})`);