import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API proxy — forward /api calls to the Fastify backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;