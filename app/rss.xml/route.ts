import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// RSS 2.0 feed for Naver Search Advisor + general RSS readers
export async function GET() {
    try {
        const supabase = await createAdminClient();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

        // Get published blog posts
        const { data: blogPosts } = await supabase
            .from("contents")
            .select("slug, title, body, updated_at, published_at")
            .eq("status", "published")
            .in("channel", ["blog", "google"])
            .not("slug", "is", null)
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
            if (!post.slug) continue;
            const desc = (post.body || "").replace(/<[^>]*>/g, "").slice(0, 300);
            const pubDate = new Date(post.published_at || post.updated_at).toUTCString();
            items += `
    <item>
      <title><![CDATA[${post.title || ""}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${desc}]]></description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
        }

        for (const mag of magazines || []) {
            const pubDate = new Date(mag.published_at || mag.updated_at).toUTCString();
            items += `
    <item>
      <title><![CDATA[${mag.title || ""}]]></title>
      <link>${baseUrl}/magazine/${mag.slug}</link>
      <guid isPermaLink="true">${baseUrl}/magazine/${mag.slug}</guid>
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
