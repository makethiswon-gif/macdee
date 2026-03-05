import { NextResponse } from "next/server";

export function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://makethis1.com";

    const robots = `User-agent: *
Allow: /
Allow: /magazine
Allow: /blog
Allow: /about

Disallow: /admin
Disallow: /api
Disallow: /dashboard
Disallow: /upload
Disallow: /contents
Disallow: /publish
Disallow: /analytics
Disallow: /billing
Disallow: /profile
Disallow: /settings

Sitemap: ${baseUrl}/sitemap.xml
`;

    return new NextResponse(robots, {
        headers: { "Content-Type": "text/plain" },
    });
}
