import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cleanBody } from "@/lib/ai-content";
import { isPublicLawyerSlug } from "@/lib/public-content";
import { cdata, escapeXml, latestDate, validDate } from "@/lib/seo-feeds";
import { SITE_BASE } from "@/data/renewal/site";

export const revalidate = 3600;

// RSS retains both the magazine and publicly hosted lawyer articles at their original URLs.
export async function GET() {
    try {
        const supabase = createServiceClient();
        const [postsResult, magazinesResult] = await Promise.all([
            supabase.from("contents")
                .select("id, slug, title, body, created_at, updated_at, lawyers!inner(slug)")
                .eq("status", "published").in("channel", ["google", "macdee"])
                .order("created_at", { ascending: false }).limit(50),
            supabase.from("magazines")
                .select("slug, title, excerpt, body, cover_image_url, author, published_at")
                .eq("status", "published").not("slug", "is", null)
                .order("published_at", { ascending: false }).limit(50),
        ]);
        if (postsResult.error || magazinesResult.error) throw new Error("RSS query failed");

        const items: { date?: string; modified?: string; xml: string }[] = [];
        for (const post of postsResult.data || []) {
            const lawyer = post.lawyers as unknown as { slug: string } | null;
            if (!isPublicLawyerSlug(lawyer?.slug)) continue;
            const body = cleanBody(post.body || "");
            const description = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
            const date = validDate(post.created_at);
            const url = escapeXml(`${SITE_BASE}/blog/${encodeURIComponent(lawyer.slug)}/${encodeURIComponent(post.slug || post.id)}`);
            items.push({
                date,
                modified: latestDate([post.updated_at, date]),
                xml: `    <item>
      <title>${cdata(post.title || "")}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${cdata(description)}</description>
      <content:encoded>${cdata(body)}</content:encoded>
      ${date ? `<pubDate>${new Date(date).toUTCString()}</pubDate>` : ""}
    </item>`,
            });
        }

        for (const article of magazinesResult.data || []) {
            if (!article.slug) continue;
            // updated_at changes on view-count increments; do not advertise those as revisions.
            const date = validDate(article.published_at);
            const url = escapeXml(`${SITE_BASE}/magazine/${encodeURIComponent(article.slug)}`);
            const body = (article.body || "")
                .replace(/^## (.+)$/gm, "<h2>$1</h2>")
                .replace(/^### (.+)$/gm, "<h3>$1</h3>")
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/^- (.+)$/gm, "<li>$1</li>")
                .replace(/\n\n/g, "</p><p>");
            const cover = article.cover_image_url
                ? `<img src="${escapeXml(article.cover_image_url)}" alt="${escapeXml(article.title || "")}" />`
                : "";
            items.push({
                date, modified: date,
                xml: `    <item>
      <title>${cdata(article.title || "")}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${cdata(article.excerpt || "")}</description>
      <content:encoded>${cdata(`${cover}<p>${body}</p>`)}</content:encoded>
      <dc:creator>${cdata(article.author || "메이크디스원")}</dc:creator>
      ${date ? `<pubDate>${new Date(date).toUTCString()}</pubDate>` : ""}
    </item>`,
            });
        }

        items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const modified = latestDate(items.map(item => item.modified));
        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>메이크디스원 매거진 — 법무법인·변호사 마케팅</title>
    <link>${SITE_BASE}</link>
    <description>법무법인 마케팅, 변호사 광고, 로펌 블로그, 검색 최적화와 AI 검색에 관한 메이크디스원의 실무 인사이트 및 고객 법률 칼럼.</description>
    <language>ko</language>
    ${modified ? `<lastBuildDate>${new Date(modified).toUTCString()}</lastBuildDate>` : ""}
    <atom:link href="${SITE_BASE}/rss.xml" rel="self" type="application/rss+xml" />
${items.map(item => item.xml).join("\n")}
  </channel>
</rss>`;

        return new NextResponse(rss, {
            headers: {
                "Content-Type": "application/rss+xml; charset=utf-8",
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
        });
    } catch {
        return new NextResponse("Error generating RSS", { status: 503, headers: { "Retry-After": "300" } });
    }
}
