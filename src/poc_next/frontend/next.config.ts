import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable ESLint during production builds (only run type checking)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
