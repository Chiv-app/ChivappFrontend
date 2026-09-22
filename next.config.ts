import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: projectRoot,
  },
  reactCompiler: false,
  transpilePackages: ["@heroui/react", "@heroui/theme"],
  async redirects() {
    return [
      {
        source: "/auth/complete-role",
        destination: "/complete-role",
        permanent: false,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.chiv.app' }],
        destination: 'https://chiv.app/:path*',
        permanent: true,
      },
    ];
  },
  images: {
    // Next 16 blocks optimizer fetches to private IPs by default.
    // Prefer same-origin /uploads paths; allow local IP in development as fallback.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "chiv.app",
      },
      {
        protocol: "https",
        hostname: "api.chiv.app",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
};

export default nextConfig;
