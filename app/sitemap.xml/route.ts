import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isPublicLawyerSlug } from "@/lib/public-content";
import { escapeXml, latestDate, readAllFeedRows, validDate } from "@/lib/seo-feeds";
import { DEMO_BASE, SITE_BASE, absUrl } from "@/data/renewal/site";

// New publications enter the sitemap without another deployment.
export const revalidate = 3600;

export async function GET() {
    try {
        const supabase = createServiceClient();
        const [blogPosts, magazines, lawyers] = await Promise.all([
            readAllFeedRows((from, to) => supabase.from("contents")
                .select("id, slug, updated_at, created_at, lawyer_id, lawyers!inner(slug)")
                .eq("status", "published").in("channel", ["google", "macdee"])
                .order("id").range(from, to)),
            readAllFeedRows((from, to) => supabase.from("magazines")
                .select("slug, published_at")
                .eq("status", "published").not("slug", "is", null)
                .order("id").range(from, to)),
            readAllFeedRows((from, to) => supabase.from("lawyers")
                .select("slug, updated_at").not("slug", "is", null)
                .order("id").range(from, to)),
        ]);

        const entries = new Map<string, string | undefined>();
        const add = (url: string, modified?: string | null) => {
            entries.set(url, latestDate([entries.get(url), modified]));
        };

        // Static pages have no maintained publication date. Omit lastmod rather than
        // claiming that a client blog update or sitemap request changed every service.
        add(SITE_BASE);
        add(`${SITE_BASE}/about`);
        // Magazine reads increment view_count, whose trigger also touches updated_at.
        // Only published_at is a trustworthy public content date in the current schema.
        add(`${SITE_BASE}/magazine`, latestDate(magazines.map(m => m.published_at)));

        if (DEMO_BASE === "") {
            for (const page of [
                "/lawfirm-marketing", "/naver-ads", "/lawfirm-seo", "/geo",
                "/lawfirm-blog", "/lawfirm-website", "/conversion", "/work",
                "/contact", "/consult", "/upgrade",
            ]) add(absUrl(page));
        } else {
            add(`${SITE_BASE}/makethisone`);
        }

        for (const lawyer of lawyers) {
            if (isPublicLawyerSlug(lawyer.slug)) {
                add(`${SITE_BASE}/blog/${encodeURIComponent(lawyer.slug)}`, lawyer.updated_at);
            }
        }

        for (const post of blogPosts) {
            const lawyer = post.lawyers as unknown as { slug: string } | null;
            if (!isPublicLawyerSlug(lawyer?.slug)) continue;
            const blogUrl = `${SITE_BASE}/blog/${encodeURIComponent(lawyer.slug)}`;
            const modified = latestDate([post.updated_at, post.created_at]);
            add(blogUrl, modified);
            add(`${blogUrl}/${encodeURIComponent(post.slug || post.id)}`, modified);
        }

        for (const article of magazines) {
            if (!article.slug) continue;
            add(`${SITE_BASE}/magazine/${encodeURIComponent(article.slug)}`, article.published_at);
        }

        // Fail visibly instead of returning an invalid/truncated discovery document.
        // Split into a sitemap index before this site's URL set reaches the protocol limit.
        if (entries.size > 50_000) throw new Error("Sitemap index required");
        const urls = [...entries].map(([url, modified]) => {
            const date = validDate(modified);
            return `  <url><loc>${escapeXml(url)}</loc>${date ? `<lastmod>${date}</lastmod>` : ""}</url>`;
        }).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        if (Buffer.byteLength(xml, "utf8") > 50 * 1024 * 1024) throw new Error("Sitemap index required");

        return new NextResponse(xml, {
            headers: {
                "Content-Type": "application/xml; charset=utf-8",
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
        });
    } catch {
        return new NextResponse("Error generating sitemap", { status: 503, headers: { "Retry-After": "300" } });
    }
}
