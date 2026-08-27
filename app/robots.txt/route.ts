import { NextResponse } from "next/server";

export function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

    // 비공개 앱 페이지(/admin, /dashboard, /login 등)는 "크롤 허용 + noindex(X-Robots-Tag)"로 색인만 차단한다.
    // robots.txt로 막으면 봇이 noindex를 못 읽어 색인 제거가 안 되므로, 검색봇에는 /api(비-HTML)만 차단한다.
    const robots = `# robots.txt — macdee (변호사 마케팅 자동화 플랫폼)
# 비공개 앱 페이지는 noindex(X-Robots-Tag)로 처리. 여기서는 /api만 차단.
#
# /renewal — 리뉴얼 데모. 색인 봇(Googlebot·Yeti·Bingbot)만 Disallow 한다.
# noindex 헤더를 쓰지 않는 이유: OpenAI 계열 크롤러가 noindex를 존중해
# 본문 읽기를 거부하기 때문. AI 크롤러는 읽을 수 있어야 검토가 가능하다.
# 홈페이지 교체 시 이 세 줄의 Disallow: /renewal 을 제거한다.

# Google
User-agent: Googlebot
Disallow: /api
Disallow: /renewal
Allow: /
Crawl-delay: 0

# Naver
User-agent: Yeti
Disallow: /api
Disallow: /renewal
Allow: /
Crawl-delay: 0

# Bing
User-agent: Bingbot
Disallow: /api
Disallow: /renewal
Allow: /

# ChatGPT / OpenAI
User-agent: GPTBot
Disallow: /api
Allow: /

# ChatGPT Browser Plugin
User-agent: ChatGPT-User
Disallow: /api
Allow: /

# Claude / Anthropic
User-agent: Claude-Web
Disallow: /api
Allow: /

User-agent: ClaudeBot
Disallow: /api
Allow: /

# Google Gemini
User-agent: Google-Extended
Disallow: /api
Allow: /

# OpenAI 검색 인덱스
User-agent: OAI-SearchBot
Disallow: /api
Allow: /

# Perplexity
User-agent: PerplexityBot
Disallow: /api
Allow: /

# All other bots — 미확인 스크래퍼용 방어(색인 제어는 noindex가 담당)
User-agent: *
Disallow: /api
Disallow: /admin
Disallow: /dashboard
Disallow: /billing
Disallow: /profile
Disallow: /settings
Allow: /

# Sitemap
Host: ${baseUrl}
Sitemap: ${baseUrl}/sitemap.xml
`;

    return new NextResponse(robots, {
        headers: { "Content-Type": "text/plain" },
    });
}
