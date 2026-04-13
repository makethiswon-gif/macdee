import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
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
        source: "/mypage",
        destination: "/dashboard",
        permanent: true,
      }
    ];
  },
};

export default nextConfig;
