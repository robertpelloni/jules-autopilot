import type { NextConfig } from "next";
import fs from 'fs';
import path from 'path';

const version = fs.readFileSync(path.join(process.cwd(), 'VERSION.md'), 'utf8').trim();

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  experimental: {
    // Reduce workers to avoid spawn UNKNOWN errors in constrained environments
    cpus: 4,
    // turbopack: {
    //   root: process.cwd(),
    // }
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // ignoreBuildErrors: true,
  }
};

export default nextConfig;
