import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// RSS 2.0 feed for Naver Search Advisor + general RSS readers
export async function GET(request: NextRequest) {
    try {
        const supabase = await createAdminClient();
        // Use request host so RSS link matches the registered site (www or non-www)
        const host = request.headers.get("host") || "www.makethis1.com";
        const proto = request.headers.get("x-forwarded-proto") || "https";
        const baseUrl = `${proto}://${host}`;

        // Get published blog posts with lawyer info for correct URLs
        const { data: blogPosts } = await supabase
            .from("contents")
            .select("id, slug, title, body, updated_at, published_at, lawyers!inner(slug)")
            .eq("status", "published")
            .in("channel", ["google", "macdee"])
            .order("published_at", { ascending: false })
            .limit(50);

        // Get published magazine articles
        const { data: magazines } = await supabase
            .from("magazines")
            .select("slug, title, excerpt, updated_at, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(50);

        const now = new Date().toUTCString();

        let items = "";

        for (const post of blogPosts || []) {
            const lawyerData = post.lawyers as unknown as { slug: string } | null;
            const lawyerSlug = lawyerData?.slug;
            if (!lawyerSlug) continue;
            const desc = (post.body || "").replace(/<[^>]*>/g, "").slice(0, 300);
            const pubDate = new Date(post.published_at || post.updated_at).toUTCString();
            const postUrl = encodeURI(`${baseUrl}/blog/${lawyerSlug}/${post.id}`);
            items += `
    <item>
      <title><![CDATA[${post.title || ""}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${desc}]]></description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
        }

        for (const mag of magazines || []) {
            const pubDate = new Date(mag.published_at || mag.updated_at).toUTCString();
            items += `
    <item>
      <title><![CDATA[${mag.title || ""}]]></title>
      <link>${encodeURI(`${baseUrl}/magazine/${mag.slug}`)}</link>
      <guid isPermaLink="true">${encodeURI(`${baseUrl}/magazine/${mag.slug}`)}</guid>
      <description><![CDATA[${mag.excerpt || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
        }

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>macdee - 변호사 마케팅 자동화 플랫폼</title>
    <link>${baseUrl}</link>
    <description>변호사 광고, 로펌 마케팅, 법무법인 광고를 위한 AI 콘텐츠 자동화. 법률 마케팅 인사이트와 블로그 콘텐츠.</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

        return new NextResponse(rss, {
            headers: {
                "Content-Type": "application/rss+xml; charset=utf-8",
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
            },
        });
    } catch {
        return new NextResponse("Error generating RSS", { status: 500 });
    }
}
