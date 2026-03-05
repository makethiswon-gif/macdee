import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Lawyer creates a blog post directly
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id, name")
            .eq("user_id", user.id)
            .single();
        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        const body = await request.json();
        const { title, content, channel, status } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "제목과 본문은 필수입니다." }, { status: 400 });
        }

        // Generate slug
        const slug = title.toLowerCase()
            .replace(/[^가-힣a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .substring(0, 60) + "-" + Date.now().toString(36);

        const { data, error } = await supabase.from("contents").insert({
            lawyer_id: lawyer.id,
            channel: channel || "blog",
            title,
            body: content,
            slug,
            status: status || "draft",
            source: "manual",
            published_at: status === "published" ? new Date().toISOString() : null,
        }).select("id, slug").single();

        if (error) {
            console.error("[Blog Write] Error:", error);
            return NextResponse.json({ error: "저장 실패" }, { status: 500 });
        }

        return NextResponse.json({ content: data }, { status: 201 });
    } catch (err) {
        console.error("[Blog Write] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// GET: List lawyer's own blog posts
export async function GET(request: Request) {
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

        const url = new URL(request.url);
        const source = url.searchParams.get("source") || "manual";

        const { data } = await supabase
            .from("contents")
            .select("id, title, slug, channel, status, created_at, published_at")
            .eq("lawyer_id", lawyer.id)
            .eq("source", source)
            .order("created_at", { ascending: false });

        return NextResponse.json({ posts: data || [] });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
