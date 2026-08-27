import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

// 원고 저장소. blog_profiles(관리자가 등록한 변호사) 기준이다.
// contents 테이블은 SaaS 고객(lawyers, UUID) 쪽이라 여기서 쓰지 않는다.

export async function GET(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const profileId = url.searchParams.get("profile_id");
    const status = url.searchParams.get("status");

    try {
        const supabase = await createAdminClient();
        let query = supabase
            .from("blog_posts")
            .select("id, profile_id, title, field, topic, status, naver_url, error, card_images, published_at, created_at")
            .order("created_at", { ascending: false })
            .limit(100);

        if (profileId) query = query.eq("profile_id", profileId);
        if (status) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ posts: data || [] });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { profileId, title, body, draftBody, field, topic } = await request.json();

        if (!profileId) return NextResponse.json({ error: "변호사를 선택해주세요." }, { status: 400 });
        if (!title?.trim() || !body?.trim()) {
            return NextResponse.json({ error: "제목과 본문이 필요합니다." }, { status: 400 });
        }

        const supabase = await createAdminClient();
        const { data, error } = await supabase
            .from("blog_posts")
            .insert({
                profile_id: profileId,
                title: title.trim(),
                body,
                draft_body: draftBody ?? null,
                field: field ?? null,
                topic: topic ?? null,
                status: "draft",
            })
            .select("id")
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ id: data.id });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

// 원고 수정 (본문 편집, 이미지 첨부 후 ready 전환 등)
export async function PATCH(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, ...rest } = await request.json();
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        // 화이트리스트 — 발행기가 쓰는 필드까지 여기서 열어둔다
        const allowed = ["title", "body", "field", "topic", "card_images", "status", "naver_url", "error", "published_at"] as const;
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const key of allowed) {
            if (key in rest) patch[key] = rest[key];
        }

        const supabase = await createAdminClient();
        const { error } = await supabase.from("blog_posts").update(patch).eq("id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
