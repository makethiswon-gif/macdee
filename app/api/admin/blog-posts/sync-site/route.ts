import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

// 발행된 원고를 맥디 변호사 블로그(contents, /blog/[slug])에 반영한다.
// 블로그 공장 4단계 자동화 — 수동 붙여넣기를 대체한다.
//
// 전제: 마이그레이션 014 (blog_profiles.lawyer_id, contents.source_post_id).
// 멱등: source_post_id 로 찾은 기존 행이 있으면 update, 없으면 insert.
// 본문: blog_posts.body 는 네이버 강조 문법이 섞인 마크다운 —
//   /blog 상세(PostPageClient)는 마크다운을 직접 파싱하므로 마크다운 그대로 싣되
//   네이버 전용 문법(==형광펜== __밑줄__)만 표준 강조(**)로 바꾼다.
//   카드 이미지는 공개 블로그 파서가 이미지 문법을 지원하지 않아 싣지 않는다.

function toSiteMarkdown(body: string): string {
    return body
        .replace(/==(.+?)==/g, "**$1**")
        .replace(/__(.+?)__/g, "**$1**");
}

function plainExcerpt(body: string, max = 155): string {
    const plain = body
        .replace(/[#*_=`>-]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return plain.length > max ? plain.slice(0, max - 1) + "…" : plain;
}

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { postId } = await request.json();
        if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

        const supabase = await createAdminClient();

        const { data: post, error: postErr } = await supabase
            .from("blog_posts")
            .select("id, profile_id, title, body, field, topic, status, published_at")
            .eq("id", postId)
            .single();
        if (postErr || !post) {
            return NextResponse.json({ error: postErr?.message || "원고를 찾을 수 없습니다." }, { status: 404 });
        }

        const { data: profile, error: profErr } = await supabase
            .from("blog_profiles")
            .select("id, lawyer_name, lawyer_id")
            .eq("id", post.profile_id)
            .single();
        if (profErr) {
            const msg = /lawyer_id/.test(profErr.message)
                ? "마이그레이션 014(블로그 공장)를 먼저 실행해주세요."
                : profErr.message;
            return NextResponse.json({ error: msg }, { status: 500 });
        }
        if (!profile?.lawyer_id) {
            return NextResponse.json(
                { error: "이 프로필에 연결된 맥디 변호사가 없습니다. 블로그 공장 설정에서 먼저 연결해주세요.", code: "NO_LAWYER" },
                { status: 400 }
            );
        }

        const row = {
            lawyer_id: profile.lawyer_id,
            channel: "blog" as const,
            title: post.title,
            slug: `bp-${String(post.id).replace(/-/g, "").slice(0, 12)}`,
            body: toSiteMarkdown(post.body),
            meta_description: plainExcerpt(post.body),
            tags: post.field ? [post.field] : [],
            status: "published" as const,
            source_post_id: post.id,
            updated_at: new Date().toISOString(),
        };

        // 멱등 — 이미 반영된 원고면 갱신
        const { data: existing } = await supabase
            .from("contents")
            .select("id")
            .eq("source_post_id", post.id)
            .maybeSingle();

        let contentId: string;
        if (existing) {
            const { error } = await supabase.from("contents").update(row).eq("id", existing.id);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            contentId = existing.id;
        } else {
            const { data, error } = await supabase.from("contents").insert(row).select("id").single();
            if (error) {
                const msg = /source_post_id/.test(error.message)
                    ? "마이그레이션 014(블로그 공장)를 먼저 실행해주세요."
                    : error.message;
                return NextResponse.json({ error: msg }, { status: 500 });
            }
            contentId = data.id;
        }

        const syncedAt = new Date().toISOString();
        await supabase.from("blog_posts").update({ site_synced_at: syncedAt, updated_at: syncedAt }).eq("id", post.id);

        return NextResponse.json({ ok: true, contentId, syncedAt, updated: !!existing });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
