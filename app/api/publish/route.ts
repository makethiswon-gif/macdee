import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST: Publish a content (mark as published + create publication record)
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { content_id } = await request.json();
        if (!content_id) return NextResponse.json({ error: "content_id가 필요합니다." }, { status: 400 });

        console.log(`[Publish] Starting publish for content ${content_id}`);

        // Use admin client to bypass RLS for status updates
        const adminSupabase = await createAdminClient();

        // Get content
        const { data: content, error: contentError } = await adminSupabase
            .from("contents")
            .select("*")
            .eq("id", content_id)
            .single();

        if (!content || contentError) {
            console.error("[Publish] Content not found:", contentError);
            return NextResponse.json({ error: "콘텐츠를 찾을 수 없습니다." }, { status: 404 });
        }

        console.log(`[Publish] Content found: channel=${content.channel}, current status=${content.status}, lawyer_id=${content.lawyer_id}`);

        // Update status to published
        const { error: updateError } = await adminSupabase
            .from("contents")
            .update({ status: "published" })
            .eq("id", content_id);

        if (updateError) {
            console.error("[Publish] Status update failed:", updateError);
            return NextResponse.json({ error: "상태 업데이트 실패: " + updateError.message }, { status: 500 });
        }

        console.log(`[Publish] Status updated to published for content ${content_id}`);

        // Get lawyer slug for blog URL
        let publishedUrl: string | null = null;
        if (content.channel === "google" || content.channel === "macdee") {
            const { data: lawyer } = await adminSupabase
                .from("lawyers")
                .select("slug")
                .eq("id", content.lawyer_id)
                .single();
            if (lawyer?.slug) {
                publishedUrl = `/blog/${lawyer.slug}/${content.slug || content_id}`;
            }
        }

        // Create publication record
        const { data: publication, error } = await adminSupabase
            .from("publications")
            .insert({
                content_id,
                lawyer_id: content.lawyer_id,
                channel: content.channel,
                external_url: publishedUrl,
                status: "published",
            })
            .select()
            .single();

        if (error) {
            console.error("[Publish] Publication insert error:", error);
            return NextResponse.json({ error: "발행 기록 생성 실패" }, { status: 500 });
        }

        console.log(`[Publish] Publication created: ${publication.id}, url: ${publishedUrl}`);

        return NextResponse.json({ publication }, { status: 201 });
    } catch (err) {
        console.error("[Publish] Unexpected error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// GET: List publications for current user
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        const { data } = await supabase
            .from("publications")
            .select("*, contents(title, channel, body)")
            .eq("lawyer_id", lawyer.id)
            .order("published_at", { ascending: false });

        return NextResponse.json({ publications: data || [] });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
