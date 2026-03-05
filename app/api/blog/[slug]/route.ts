import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/blog/[slug] → 변호사 프로필 + 발행된 포스트 목록
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createAdminClient();

        // Get lawyer by slug
        const { data: lawyer, error: lawyerErr } = await supabase
            .from("lawyers")
            .select("id, name, slug, email, specialty, region, bio, profile_image_url, office_name, experience_years, brand_color, schema_data")
            .eq("slug", slug)
            .single();

        if (lawyerErr || !lawyer) {
            return NextResponse.json({ error: "블로그를 찾을 수 없습니다." }, { status: 404 });
        }

        // Get published posts (google + macdee channels)
        const { data: posts } = await supabase
            .from("contents")
            .select("id, title, slug, body, meta_description, tags, schema_markup, channel, created_at")
            .eq("lawyer_id", lawyer.id)
            .in("channel", ["google", "macdee"])
            .eq("status", "published")
            .order("created_at", { ascending: false });

        return NextResponse.json({
            lawyer: {
                name: lawyer.name,
                slug: lawyer.slug,
                specialty: lawyer.specialty,
                region: lawyer.region,
                bio: lawyer.bio,
                profile_image_url: lawyer.profile_image_url,
                office_name: lawyer.office_name,
                experience_years: lawyer.experience_years,
                brand_color: lawyer.brand_color || "#3563AE",
            },
            posts: (posts || []).map((p) => ({
                id: p.id,
                title: p.title,
                slug: p.slug || p.id,
                excerpt: p.meta_description || p.body?.substring(0, 150) + "...",
                tags: p.tags || [],
                channel: p.channel,
                created_at: p.created_at,
            })),
        });
    } catch {
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
