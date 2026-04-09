import type { NextConfig } from "next";
import fs from 'fs';
import path from 'path';

let version = '0.0.0';
try {
  version = fs.readFileSync(path.join(process.cwd(), 'VERSION.md'), 'utf8').trim();
} catch (e) {
  console.warn('Failed to read VERSION.md, defaulting to 0.0.0');
}

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  transpilePackages: ['@jules/shared'],
  experimental: {
    cpus: 4,
  },
  typescript: {
  }
};

export default nextConfig;
