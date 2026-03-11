import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

    return await updateSession(request);
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
