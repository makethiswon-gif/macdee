import { NextResponse } from "next/server";

export function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

    const robots = `# robots.txt — macdee (변호사 마케팅 자동화 플랫폼)

# Google
User-agent: Googlebot
Allow: /
Crawl-delay: 0

# Naver
User-agent: Yeti
Allow: /
Crawl-delay: 0

# Bing
User-agent: Bingbot
Allow: /

# ChatGPT / OpenAI
User-agent: GPTBot
Allow: /
Allow: /about
Allow: /magazine
Allow: /llms.txt

# ChatGPT Browser Plugin
User-agent: ChatGPT-User
Allow: /

# Claude / Anthropic
User-agent: Claude-Web
Allow: /
Allow: /about
Allow: /magazine
Allow: /llms.txt

User-agent: ClaudeBot
Allow: /

# Google Gemini
User-agent: Google-Extended
Allow: /

# Perplexity
User-agent: PerplexityBot
Allow: /

# All other bots
User-agent: *
Allow: /
Allow: /about
Allow: /magazine
Allow: /blog
Allow: /signup
Allow: /terms
Allow: /refund
Allow: /llms.txt

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
Disallow: /migrate
Disallow: /consulting
Disallow: /tone
Disallow: /blog-write
Disallow: /site-builder
Disallow: /guide

# Sitemap
Host: ${baseUrl}
Sitemap: ${baseUrl}/sitemap.xml
`;

    return new NextResponse(robots, {
        headers: { "Content-Type": "text/plain" },
    });
}
