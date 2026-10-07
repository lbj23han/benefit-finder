import type { NextConfig } from "next";
import aitDevtools from "@apps-in-toss/devtools/unplugin";

const isTossBuild = process.env.TOSS_BUILD === 'true';

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  ...(isTossBuild && {
    output: 'export',
    distDir: 'dist/web',
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
  }),
  images: {
    unoptimized: isTossBuild,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.plugins.unshift(aitDevtools.webpack());
    }

    return config;
  },
  ...(!isTossBuild && {
    headers: async () => [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ],
  }),
};

export default nextConfig;
