import { createServiceClient } from "@/lib/supabase/server";
import { isPublicLawyerSlug, PUBLIC_BLOG_CHANNELS } from "@/lib/public-content";
import { escapeXml, latestDate, readAllFeedRows, validDate } from "@/lib/seo-feeds";
import { DEMO_BASE, SITE_BASE, absUrl } from "@/data/renewal/site";

/**
 * 사이트맵을 묶음별로 나눈다(2026-11-12). /sitemap.xml 은 묶음 목록(sitemap index)이고 각 묶음은 /sitemaps/<이름>.xml.
 * 변호사 블로그는 변호사마다 한 묶음(blog-<slug>) — 서치콘솔 '페이지' 보고서에서 사이트맵별로 걸러
 * 누구 글이 색인되고 누구 글이 막혔는지 바로 본다.
 */
export type SitemapGroup = Map<string, string | undefined>; // 주소 → 마지막 수정일

const NAME_RE = /^(pages|magazine|blog-[a-z0-9-]+)$/;
export const isSitemapGroupName = (name: string) => NAME_RE.test(name);

export async function loadSitemapGroups(): Promise<Map<string, SitemapGroup>> {
    const supabase = createServiceClient();
    const [blogPosts, magazines] = await Promise.all([
        readAllFeedRows((from, to) => supabase.from("contents")
            .select("id, slug, updated_at, created_at, lawyer_id, lawyers!inner(slug)")
            .eq("status", "published").in("channel", [...PUBLIC_BLOG_CHANNELS])
            .order("id").range(from, to)),
        readAllFeedRows((from, to) => supabase.from("magazines")
            .select("slug, published_at")
            .eq("status", "published").not("slug", "is", null)
            .order("id").range(from, to)),
    ]);

    const groups = new Map<string, SitemapGroup>();
    const add = (group: string, url: string, modified?: string | null) => {
        let entries = groups.get(group);
        if (!entries) groups.set(group, entries = new Map());
        entries.set(url, latestDate([entries.get(url), modified]));
    };

    // Static pages have no maintained publication date. Omit lastmod rather than
    // claiming that a client blog update or sitemap request changed every service.
    add("pages", SITE_BASE);
    add("pages", `${SITE_BASE}/about`);
    if (DEMO_BASE === "") {
        for (const page of [
            "/lawfirm-marketing", "/naver-ads", "/lawfirm-seo", "/geo",
            "/lawfirm-blog", "/lawfirm-website", "/conversion", "/work",
            "/contact", "/consult", "/upgrade",
        ]) add("pages", absUrl(page));
    } else {
        add("pages", `${SITE_BASE}/makethisone`);
    }

    const publicBlogPosts = blogPosts.filter((post) => isPublicLawyerSlug((post.lawyers as unknown as { slug: string } | null)?.slug));
    // 변호사 블로그 목록(/blog, 2026-10-08) — 공개 블로그 글이 있을 때만. 날짜는 가장 최근 블로그 글.
    if (publicBlogPosts.length) add("pages", `${SITE_BASE}/blog`, latestDate(publicBlogPosts.flatMap((post) => [post.updated_at, post.created_at])));
    for (const post of publicBlogPosts) {
        const lawyerSlug = (post.lawyers as unknown as { slug: string }).slug;
        const group = `blog-${lawyerSlug.toLowerCase()}`;
        if (!isSitemapGroupName(group)) continue; // 묶음 이름으로 못 쓰는 slug 는 없지만, 생기면 주소를 만들 수 없다
        const blogUrl = `${SITE_BASE}/blog/${encodeURIComponent(lawyerSlug)}`;
        const modified = latestDate([post.updated_at, post.created_at]);
        add(group, blogUrl, modified);
        add(group, `${blogUrl}/${encodeURIComponent(post.slug || post.id)}`, modified);
    }

    // Magazine reads increment view_count, whose trigger also touches updated_at.
    // Only published_at is a trustworthy public content date in the current schema.
    add("magazine", `${SITE_BASE}/magazine`, latestDate(magazines.map(m => m.published_at)));
    for (const article of magazines) {
        if (!article.slug) continue;
        add("magazine", `${SITE_BASE}/magazine/${encodeURIComponent(article.slug)}`, article.published_at);
    }
    return groups;
}

export const sitemapGroupUrl = (name: string) => `${SITE_BASE}/sitemaps/${name}.xml`;

/** 묶음 목록(sitemap index). 각 묶음의 날짜는 그 안의 가장 최근 수정일. */
export function sitemapIndexXml(groups: Map<string, SitemapGroup>): string {
    const names = [...groups.keys()].sort((a, b) => (a === "pages" ? -1 : b === "pages" ? 1 : a.localeCompare(b)));
    const items = names.map((name) => {
        const date = validDate(latestDate([...groups.get(name)!.values()]));
        return `  <sitemap><loc>${escapeXml(sitemapGroupUrl(name))}</loc>${date ? `<lastmod>${date}</lastmod>` : ""}</sitemap>`;
    }).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export function urlsetXml(entries: SitemapGroup): string {
    // Fail visibly instead of returning an invalid/truncated discovery document.
    if (entries.size > 50_000) throw new Error("Sitemap group too large");
    const urls = [...entries].map(([url, modified]) => {
        const date = validDate(modified);
        return `  <url><loc>${escapeXml(url)}</loc>${date ? `<lastmod>${date}</lastmod>` : ""}</url>`;
    }).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    if (Buffer.byteLength(xml, "utf8") > 50 * 1024 * 1024) throw new Error("Sitemap group too large");
    return xml;
}

export const SITEMAP_HEADERS = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};
