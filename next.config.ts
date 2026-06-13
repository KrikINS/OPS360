import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone', // <--- ADD THIS LINE

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },

};

export default withSentryConfig(nextConfig, {
  org: "appterra",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: true,
  },
  disableLogger: true,
  automaticVercelMonitors: false,
  telemetry: false,
});