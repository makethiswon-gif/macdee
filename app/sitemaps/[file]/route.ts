import { NextResponse } from "next/server";
import { isSitemapGroupName, loadSitemapGroups, SITEMAP_HEADERS, urlsetXml } from "@/lib/sitemap-groups";

// 사이트맵 한 묶음: /sitemaps/pages.xml, /sitemaps/magazine.xml, /sitemaps/blog-<변호사 slug>.xml (목록은 /sitemap.xml).
// 방문된 묶음만 그때 만들어 1시간 캐시한다.
export const revalidate = 3600;

export function generateStaticParams(): { file: string }[] {
    return [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
    const { file } = await params;
    const name = file.endsWith(".xml") ? file.slice(0, -4) : "";
    if (!isSitemapGroupName(name)) return new NextResponse("Not found", { status: 404 });
    try {
        const group = (await loadSitemapGroups()).get(name);
        if (!group) return new NextResponse("Not found", { status: 404 });
        return new NextResponse(urlsetXml(group), { headers: SITEMAP_HEADERS });
    } catch {
        return new NextResponse("Error generating sitemap", { status: 503, headers: { "Retry-After": "300" } });
    }
}
