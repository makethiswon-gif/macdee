import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/blog/[slug]/[postSlug] → 개별 포스트
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string; postSlug: string }> }
) {
    try {
        const { slug, postSlug } = await params;
        const supabase = await createAdminClient();

        // Get lawyer
        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id, name, slug, specialty, region, bio, brand_color, office_name, experience_years, phone")
            .eq("slug", slug)
            .single();

        if (!lawyer) {
            return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });
        }

        // Try finding post by slug first, then by ID
        let post = null;
        const { data: bySlug } = await supabase
            .from("contents")
            .select("*")
            .eq("lawyer_id", lawyer.id)
            .eq("slug", postSlug)
            .eq("status", "published")
            .single();

        if (bySlug) {
            post = bySlug;
        } else {
            const { data: byId } = await supabase
                .from("contents")
                .select("*")
                .eq("lawyer_id", lawyer.id)
                .eq("id", postSlug)
                .eq("status", "published")
                .single();
            post = byId;
        }

        if (!post) {
            return NextResponse.json({ error: "포스트를 찾을 수 없습니다." }, { status: 404 });
        }

        // Look up related instagram card news (same upload_id)
        let cardNewsSlides: { slide: number; text: string }[] = [];
        let cardNewsCoverImage: string | null = null;
        if (post.upload_id) {
            const { data: instagramContent } = await supabase
                .from("contents")
                .select("body, card_news_data")
                .eq("upload_id", post.upload_id)
                .eq("channel", "instagram")
                .single();

            if (instagramContent?.body) {
                try {
                    const parsed = JSON.parse(instagramContent.body);
                    cardNewsSlides = Array.isArray(parsed) ? parsed : [];
                } catch { /* ignore parse errors */ }
            }
            if (instagramContent?.card_news_data?.coverImageUrl) {
                cardNewsCoverImage = instagramContent.card_news_data.coverImageUrl;
            }
        }

        return NextResponse.json({
            lawyer: {
                name: lawyer.name,
                slug: lawyer.slug,
                specialty: lawyer.specialty,
                region: lawyer.region,
                bio: lawyer.bio,
                brand_color: lawyer.brand_color || "#3563AE",
                office_name: lawyer.office_name,
                experience_years: lawyer.experience_years,
                phone: lawyer.phone || null,
                website_url: (lawyer as Record<string, unknown>).website_url as string || null,
            },
            post: {
                id: post.id,
                title: post.title,
                slug: post.slug || post.id,
                body: post.body,
                meta_description: post.meta_description,
                tags: post.tags || [],
                schema_markup: post.schema_markup,
                channel: post.channel,
                created_at: post.created_at,
                card_news_slides: cardNewsSlides,
                card_news_cover_image: cardNewsCoverImage,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
