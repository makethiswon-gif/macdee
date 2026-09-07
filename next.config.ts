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
    return [];
  },
  async redirects() {
    return [
      // 공개 마케팅 URL만 승격한다. /makethisone/subscribe와 팀 이미지 등
      // 실제 제품·정적 자산을 삼키는 /makethisone/* 와일드카드는 금지한다.
      { source: "/makethisone", destination: "/", statusCode: 301 },
      { source: "/makethisone/index.html", destination: "/", statusCode: 301 },
      { source: "/insights", destination: "/magazine", statusCode: 301 },
      { source: "/insights/:slug", destination: "/magazine/:slug", statusCode: 301 },
      { source: "/services", destination: "/lawfirm-marketing", statusCode: 301 },
      { source: "/portfolio", destination: "/work", statusCode: 301 },
      { source: "/renewal", destination: "/", statusCode: 301 },
      { source: "/renewal/diagnose", destination: "/consult", statusCode: 301 },
      { source: "/renewal/concepts/:path*", destination: "/", statusCode: 301 },
      // 실제 페이지만 이동한다. public/renewal의 글꼴·이미지는 이 접두어를
      // 계속 쓰므로 전체 wildcard를 걸면 디자인 자산까지 404가 된다.
      ...["about", "contact", "conversion", "geo", "lawfirm-blog", "lawfirm-marketing",
        "lawfirm-seo", "lawfirm-website", "naver-ads", "upgrade", "work", "magazine", "og.png"]
        .map(slug => ({ source: `/renewal/${slug}`, destination: `/${slug}`, statusCode: 301 as const })),
      { source: "/renewal/magazine/:slug", destination: "/magazine/:slug", statusCode: 301 },
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
