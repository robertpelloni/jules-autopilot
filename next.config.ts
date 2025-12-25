import type { NextConfig } from "next";
import fs from 'fs';
import path from 'path';

const version = fs.readFileSync(path.join(process.cwd(), 'VERSION.md'), 'utf8').trim();

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // Reduce workers to avoid spawn UNKNOWN errors in constrained environments
    cpus: 4,
  },
};

export default nextConfig;
