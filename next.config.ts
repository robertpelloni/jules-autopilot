import type { NextConfig } from "next";
import fs from 'fs';
import path from 'path';

const version = fs.readFileSync(path.join(process.cwd(), 'VERSION.md'), 'utf8').trim();

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
