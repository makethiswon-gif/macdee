import { NextResponse } from "next/server";

export function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

    // 비공개 앱 페이지(/admin, /dashboard, /login 등)는 "크롤 허용 + noindex(X-Robots-Tag)"로 색인만 차단한다.
    // robots.txt로 막으면 봇이 noindex를 못 읽어 색인 제거가 안 되므로, 검색봇에는 /api(비-HTML)만 차단한다.
    //
    // ⚠️ 리뉴얼 데모 경로(/renewal)에 Disallow 나 noindex 를 걸지 말 것.
    //    두 번 막았다가 두 번 다 외부 AI 리더가 본문을 못 읽었다.
    //      1차: X-Robots-Tag: noindex → OpenAI 계열이 noindex 를 존중해 읽기 거부
    //      2차: 색인 봇에만 Disallow  → robots 파서가 보수적으로 동작해 역시 차단.
    //           같은 리더에서 / 는 읽히고 데모 경로만 실패했다.
    //
    //    이 설명을 아래 템플릿 문자열(= 실제로 서빙되는 robots.txt) 안에 쓰지 말 것.
    //    주석 줄이라도 경로 문자열이 파일에 남으면 단순한 파서가 오탐할 수 있다.
    //
    //    색인 노출은 robots.txt가 아니라 이렇게 관리한다.
    //      - sitemap.xml 에 넣지 않는다
    //      - 어디에서도 데모 경로로 링크하지 않는다
    //      - 홈페이지 교체 시 데모 경로 → / 301 을 반드시 건다
    const robots = `# robots.txt — macdee (변호사 마케팅 자동화 플랫폼)
# 비공개 앱 페이지는 noindex(X-Robots-Tag)로 처리. 여기서는 /api만 차단.

# Google
User-agent: Googlebot
Disallow: /api
Allow: /
Crawl-delay: 0

# Naver
User-agent: Yeti
Disallow: /api
Allow: /
Crawl-delay: 0

# Bing
User-agent: Bingbot
Disallow: /api
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
