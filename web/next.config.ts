import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["pleasehome.com", "www.pleasehome.com"],
    },
  },
};

export default nextConfig;
