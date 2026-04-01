import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // <--- ADD THIS LINE
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;