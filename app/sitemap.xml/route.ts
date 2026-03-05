import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Dynamic sitemap for SEO
export async function GET() {
    try {
        const supabase = await createAdminClient();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://makethis1.com";

        // Get published blog posts
        const { data: blogPosts } = await supabase
            .from("contents")
            .select("slug, updated_at, published_at")
            .eq("status", "published")
            .in("channel", ["blog", "google"])
            .not("slug", "is", null)
            .order("published_at", { ascending: false });

        // Get published magazine articles
        const { data: magazines } = await supabase
            .from("magazines")
            .select("slug, updated_at, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false });

        // Get lawyer profiles
        const { data: lawyers } = await supabase
            .from("lawyers")
            .select("slug, updated_at")
            .not("slug", "is", null);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
    <url>
        <loc>${baseUrl}</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/magazine</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/about</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;

        // Blog posts
        for (const post of blogPosts || []) {
            if (!post.slug) continue;
            xml += `
    <url>
        <loc>${baseUrl}/blog/${post.slug}</loc>
        <lastmod>${new Date(post.updated_at || post.published_at).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`;
        }

        // Magazine articles
        for (const mag of magazines || []) {
            xml += `
    <url>
        <loc>${baseUrl}/magazine/${mag.slug}</loc>
        <lastmod>${new Date(mag.updated_at || mag.published_at).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        }

        // Lawyer profiles
        for (const lawyer of lawyers || []) {
            if (!lawyer.slug) continue;
            xml += `
    <url>
        <loc>${baseUrl}/lawyer/${lawyer.slug}</loc>
        <lastmod>${new Date(lawyer.updated_at).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
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
