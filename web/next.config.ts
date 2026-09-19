import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8080";

// 단지 전역화(docs/dev/DOMAIN_MODEL.md 3.3) 마이그레이션으로 병합/삭제된 옛 complex_id ->
// 대표 id 매핑. 이미 색인된 옛 단지 URL(SEO 가치)이 404 나지 않도록 301 리다이렉트.
function loadComplexRedirectMap(): Record<string, number> {
  try {
    const mapPath = path.join(process.cwd(), "..", "db-pipeline", "migrations", "complex_redirect_map.json");
    return JSON.parse(fs.readFileSync(mapPath, "utf-8"));
  } catch {
    return {};
  }
}

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
  async redirects() {
    const map = loadComplexRedirectMap();
    return Object.entries(map).map(([oldId, canonicalId]) => ({
      source: `/complexes/${oldId}`,
      destination: `/complexes/${canonicalId}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
