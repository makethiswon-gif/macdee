import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as cheerio from "cheerio";

// GET: Fetch blog post list from Naver RSS
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const blogId = searchParams.get("blogId");

        if (!blogId) {
            return NextResponse.json({ error: "블로그 ID를 입력해주세요." }, { status: 400 });
        }

        // Clean blog ID from URL if full URL provided
        let cleanBlogId = blogId.trim();
        const urlMatch = cleanBlogId.match(/blog\.naver\.com\/([^/?#]+)/);
        if (urlMatch) {
            cleanBlogId = urlMatch[1];
        }

        // Fetch RSS feed
        const rssUrl = `https://rss.blog.naver.com/${cleanBlogId}.xml`;
        const res = await fetch(rssUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/rss+xml, application/xml, text/xml",
            },
        });

        if (!res.ok) {
            return NextResponse.json({ error: "블로그를 찾을 수 없습니다. 블로그 ID를 확인해주세요." }, { status: 404 });
        }

        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        // Check if RSS has items
        const items = $("item");
        if (items.length === 0) {
            return NextResponse.json({
                error: "RSS에서 글을 찾을 수 없습니다. 블로그가 비공개이거나 글이 없습니다.",
                suggestion: "URL 붙여넣기 또는 파일 업로드를 사용해주세요.",
            }, { status: 404 });
        }

        const posts: { title: string; url: string; date: string }[] = [];

        items.each((_, el) => {
            const title = $(el).find("title").text().trim();
            const link = $(el).find("link").text().trim();
            const pubDate = $(el).find("pubDate").text().trim();

            if (title && link) {
                posts.push({
                    title,
                    url: link,
                    date: pubDate ? new Date(pubDate).toISOString().split("T")[0] : "",
                });
            }
        });

        return NextResponse.json({
            blogId: cleanBlogId,
            total: posts.length,
            posts,
            notice: posts.length >= 40
                ? "RSS는 최근 글만 제공합니다. 더 많은 글을 옮기려면 URL 붙여넣기를 사용하세요."
                : undefined,
        });
    } catch (err) {
        console.error("[Migrate List] Error:", err);
        return NextResponse.json({ error: "글 목록을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
    }
}
