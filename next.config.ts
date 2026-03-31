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
};

export default nextConfig;
