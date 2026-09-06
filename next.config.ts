import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/admin/blog-images/generate-design": ["./public/fonts/noto-*-kr-korean-*-normal.woff2"],
  },
  async headers() {
    return [
      {
        // 모든 경로에 기본 보안 헤더
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // API는 검색엔진 색인에서 제외
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/makethisone",
        destination: "/makethisone/index.html",
      },
    ];
  },
  async redirects() {
    return [
      // 1. Legacy Column Redirects (With ID)
      {
        source: "/COLUMN",
        has: [
          {
            type: "query",
            key: "idx",
            value: "(?<idx>.*)",
          },
        ],
        destination: "/magazine/:idx", // Redirect to new magazine route
        permanent: true, // 301 Permanent Redirect
      },
      {
        source: "/COLUMN/",
        has: [
          {
            type: "query",
            key: "idx",
            value: "(?<idx>.*)",
          },
        ],
        destination: "/magazine/:idx",
        permanent: true,
      },
      {
        source: "/column",
        has: [
          {
            type: "query",
            key: "idx",
            value: "(?<idx>.*)",
          },
        ],
        destination: "/magazine/:idx",
        permanent: true,
      },
      {
        source: "/32",
        has: [
          {
            type: "query",
            key: "idx",
            value: "(?<idx>.*)",
          },
        ],
        destination: "/magazine/:idx",
        permanent: true,
      },
      {
        source: "/32/",
        has: [
          {
            type: "query",
            key: "idx",
            value: "(?<idx>.*)",
          },
        ],
        destination: "/magazine/:idx",
        permanent: true,
      },

      // 2. Legacy Column Fallbacks (Without ID)
      {
        source: "/COLUMN",
        destination: "/magazine",
        permanent: true,
      },
      {
        source: "/column",
        destination: "/magazine",
        permanent: true,
      },

      // 3. Common IMWEB Auth / Legacy Paths
      {
        source: "/member/login",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/member/join",
        destination: "/signup",
        permanent: true,
      },
      {
        source: "/",
        has: [
          {
            type: "query",
            key: "mode",
            value: "login",
          },
        ],
        destination: "/login",
        permanent: true,
      },
      {
        source: "/",
        has: [
          {
            type: "query",
            key: "mode",
            value: "join",
          },
        ],
        destination: "/signup",
        permanent: true,
      },
      {
        source: "/cart",
        destination: "/",
        permanent: true,
      },
      {
        source: "/61",
        destination: "/",
        permanent: true,
      },
      {
        source: "/mypage",
        destination: "/dashboard",
        permanent: true,
      },
      {
        // 옛 변호사 URL 구조 /lawyer/{slug} → 현재 /blog/{slug}
        source: "/lawyer/:slug",
        destination: "/blog/:slug",
        permanent: true,
      }
    ];
  },
};

export default nextConfig;
