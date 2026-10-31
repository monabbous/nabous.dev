import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['three'],
  output: 'standalone',
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
