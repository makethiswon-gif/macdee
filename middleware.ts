import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 비공개 앱 경로 — noindex, nofollow (X-Robots-Tag). 크롤은 허용해 봇이 noindex를 읽고 색인에서 제외.
// /makethisone(공개 대행사 페이지)는 제외하고 /makethisone/subscribe만 매칭되도록 정확 prefix 검사.
const PRIVATE_PREFIXES = [
    "/admin", "/dashboard", "/login",
    "/upload", "/contents", "/publish", "/analytics",
    "/billing", "/profile", "/settings", "/migrate",
    "/consulting", "/tone", "/blog-write", "/site-builder", "/guide",
    "/makethisone/subscribe",
    // ⚠️ /renewal 을 여기 넣지 말 것.
    // X-Robots-Tag: noindex 를 달면 OpenAI 계열 크롤러(GPTBot·ChatGPT-User·
    // OAI-SearchBot)가 noindex 를 존중해 본문을 읽지 않고 "fetch 실패"로 처리한다.
    // 데모의 색인 차단은 robots.txt 에서 색인 봇만 Disallow 하는 방식으로 한다
    // (app/robots.txt/route.ts 참고).
];

export async function middleware(request: NextRequest) {
    // Redirect non-canonical domains to www.makethis1.com (SEO) — except RSS/sitemap for Naver
    const host = request.headers.get("host") || "";
    const path = request.nextUrl.pathname;
    const nonCanonical = ["makethis1.com", "aimacdee.com", "www.aimacdee.com"];
    if (nonCanonical.includes(host) && !path.startsWith("/rss") && !path.startsWith("/sitemap")) {
        const url = request.nextUrl.clone();
        url.host = "www.makethis1.com";
        url.protocol = "https";
        return NextResponse.redirect(url, 301);
    }

    const res = await updateSession(request);

    // 비공개 페이지는 색인 금지 헤더 부여 (홈페이지 canonical 중복·로그인 화면 색인 방지)
    const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
    if (isPrivate) {
        res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return res;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon)
         * - public files (images, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
