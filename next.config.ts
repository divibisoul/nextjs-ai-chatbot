import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // PPR was canary-only; keep the historical switch explicit while using stable Next.js.
    ppr: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

export default nextConfig;
