/** @type {import('next').NextConfig} */
const nextConfig = {
  // API proxy — forward /api calls to the Fastify backend
  // Server-side API proxy — uses internal Docker network
  // NEXT_PUBLIC_API_URL= is for client-side browser (relative /api via Caddy)
  // INTERNAL_API_URL= is for Next.js server-side proxy (direct to backend)
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || "http://backend:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
  // Required for Docker standalone output
  output: "standalone",
};

export default nextConfig;