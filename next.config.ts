import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['three'],
  output: 'export',
  distDir: 'out/static',
};

export default nextConfig;
