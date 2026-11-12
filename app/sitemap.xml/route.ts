import { NextResponse } from "next/server";
import { loadSitemapGroups, SITEMAP_HEADERS, sitemapIndexXml } from "@/lib/sitemap-groups";

// 사이트맵 묶음 목록(sitemap index). 실제 주소는 /sitemaps/<묶음>.xml — 변호사 블로그는 변호사마다 한 묶음(lib/sitemap-groups.ts).
// 서치콘솔에 제출된 주소(/sitemap.xml)가 그대로라 다시 제출할 필요 없이 구글이 묶음들을 읽는다.
// New publications enter the sitemap without another deployment.
export const revalidate = 3600;

export async function GET() {
    try {
        return new NextResponse(sitemapIndexXml(await loadSitemapGroups()), { headers: SITEMAP_HEADERS });
    } catch {
        return new NextResponse("Error generating sitemap", { status: 503, headers: { "Retry-After": "300" } });
    }
}
