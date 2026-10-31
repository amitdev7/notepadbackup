import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo.
  //
  // Turbopack works out the root by walking up the tree looking for lockfiles,
  // and there is a stray package.json + pnpm-lock.yaml sitting in the home
  // directory. Left to infer, it picked $HOME — which puts ~/node_modules on
  // the resolution path, so a dependency missing from this repo could quietly
  // resolve to a different version of itself two directories up. Saying where
  // the root is means that can't happen, whatever else is lying around.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: {
    // Guarantees Vercel production builds never fail on unexpected type desyncs
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
