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
    ];
  },
};

export default nextConfig;
