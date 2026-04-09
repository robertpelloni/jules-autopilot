import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionPath = path.join(__dirname, '../VERSION.md');
const packageJsonPath = path.join(__dirname, '../package.json');
const versionTsPath = path.join(__dirname, '../lib/version.ts');

const version = fs.readFileSync(versionPath, 'utf8').trim();

console.log(`Updating version to ${version}...`);

// Update package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update lib/version.ts
const versionTs = `export const APP_VERSION = '${version}';\n`;
fs.writeFileSync(versionTsPath, versionTs);

console.log('Version updated successfully!');
