import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    // Redirect non-www to www (SEO canonical) — except RSS/sitemap for Naver compatibility
    const host = request.headers.get("host") || "";
    const path = request.nextUrl.pathname;
    if (host === "makethis1.com" && !path.startsWith("/rss") && !path.startsWith("/sitemap")) {
        const url = request.nextUrl.clone();
        url.host = "www.makethis1.com";
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
