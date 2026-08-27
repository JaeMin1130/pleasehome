import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["pleasehome.com", "www.pleasehome.com"],
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
