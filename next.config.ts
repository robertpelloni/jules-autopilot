import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Reduce workers to avoid spawn UNKNOWN errors in constrained environments
    cpus: 4
  }
};

export default nextConfig;
