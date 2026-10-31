import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['three'],
  output: 'standalone',
  skipTrailingSlashRedirect: true,
  // Keep metadata in the initial <head>, including for plain-HTML LLM fetchers.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
