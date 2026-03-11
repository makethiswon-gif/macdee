import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
