import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Encode URL for sitemap (handle Korean characters)
function sitemapUrl(url: string): string {
    // encodeURI handles Korean chars but preserves /:?#[]@!$&'()*+,;=
    return encodeURI(url).replace(/&/g, "&amp;").replace(/'/g, "&apos;");
}

// Dynamic sitemap for SEO — Google + Naver
export async function GET() {
    try {
        const supabase = createServiceClient();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
        const now = new Date().toISOString();

        // 발행된 모든 포스트 (slug 없으면 UUID URL 사용 — 정상 동작)
        const { data: blogPosts } = await supabase
            .from("contents")
            .select("id, slug, updated_at, lawyer_id, lawyers!inner(slug)")
            .eq("status", "published")
            .in("channel", ["google", "macdee"])
            .order("created_at", { ascending: false });

        // Get published magazine articles
        const { data: magazines } = await supabase
            .from("magazines")
            .select("slug, updated_at, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false });

        // Get lawyer profiles (also used for blog listing pages)
        const { data: lawyers } = await supabase
            .from("lawyers")
            .select("slug, updated_at")
            .not("slug", "is", null);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
    <url>
        <loc>${baseUrl}</loc>
        <lastmod>${now}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/about</loc>
        <lastmod>${now}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.95</priority>
    </url>
    <url>
        <loc>${baseUrl}/magazine</loc>
        <lastmod>${now}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    `;

        // Lawyer blog listing pages (/blog/[lawyer-slug]) — high priority entry points
        for (const lawyer of lawyers || []) {
            if (!lawyer.slug) continue;
            xml += `
    <url>
        <loc>${sitemapUrl(`${baseUrl}/blog/${lawyer.slug}`)}</loc>
        <lastmod>${new Date(lawyer.updated_at).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        }

        // Individual blog posts — URL pattern: /blog/[lawyer-slug]/[post-id]
        for (const post of blogPosts || []) {
            const lawyerData = post.lawyers as unknown as { slug: string } | null;
            const lawyerSlug = lawyerData?.slug;
            if (!lawyerSlug) continue;
            xml += `
    <url>
        <loc>${sitemapUrl(`${baseUrl}/blog/${lawyerSlug}/${post.slug || post.id}`)}</loc>
        <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`;
        }

        // Magazine articles
        for (const mag of magazines || []) {
            xml += `
    <url>
        <loc>${sitemapUrl(`${baseUrl}/magazine/${mag.slug}`)}</loc>
        <lastmod>${new Date(mag.updated_at || mag.published_at).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        }

        xml += "\n</urlset>";

        return new NextResponse(xml, {
            headers: {
                "Content-Type": "application/xml",
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
            },
        });
    } catch {
        return new NextResponse("Error generating sitemap", { status: 500 });
    }
}
