import type { NextConfig } from "next";

const securityHeaders = [
  // 클릭재킹 방지
  { key: "X-Frame-Options", value: "DENY" },
  // MIME 스니핑 방지
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 레퍼러 정보 최소화
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 불필요한 브라우저 기능 비활성화
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // XSS 필터 (구형 브라우저 대비)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // HTTPS 강제
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
