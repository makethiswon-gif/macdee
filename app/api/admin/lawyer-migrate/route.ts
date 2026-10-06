import { NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { listNaverPosts, parseBlogId } from "@/lib/naver-blog";
import { migrateNaverPost, type MigrateMode } from "@/lib/naver-migrate";

// 관리자 "변호사 블로그 옮기기"(2026-10-06): 변호사를 골라 그 변호사로 로그인하지 않고 네이버 블로그 글을 옮긴다.
//   GET                      → 변호사 목록(가벼운 열만)
//   GET ?blogId=&lawyerId=   → 네이버 블로그 전체 글 목록 + 카테고리 이름 + 이 변호사에게 이미 옮긴 글
//   POST                     → 글 1~3편 옮기기(화면이 50편을 3편씩 나눠 부른다)
export const maxDuration = 800; // 편당 윤문 최대 약 150초 × 3편 + 읽기·저장
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const db = createServiceClient();
    const blogInput = url.searchParams.get("blogId");
    if (!blogInput) {
        const { data, error } = await db.from("lawyers").select("id, name, slug, office_name, region").order("created_at", { ascending: false }).limit(500);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ lawyers: data || [] }, { headers });
    }
    const blogId = parseBlogId(blogInput);
    if (!blogId) return NextResponse.json({ error: "네이버 블로그 주소나 아이디를 확인해 주세요." }, { status: 400 });
    try {
        const { posts, total, categories } = await listNaverPosts(blogId);
        let migrated: string[] = [];
        const lawyerId = url.searchParams.get("lawyerId");
        if (lawyerId) {
            const { data, error } = await db.from("uploads").select("file_url").eq("lawyer_id", lawyerId).eq("type", "url").like("file_url", `https://blog.naver.com/${blogId}/%`).limit(10000);
            if (error) return NextResponse.json({ error: `이미 옮긴 글을 확인하지 못했습니다: ${error.message}` }, { status: 500 });
            migrated = (data || []).map((row) => String(row.file_url).split("/").pop() || "").filter(Boolean);
        }
        return NextResponse.json({ blogId, total, categories, posts, migrated }, { headers });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "글 목록을 읽지 못했습니다." }, { status: 502 });
    }
}

export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let body: { lawyerId?: unknown; blogId?: unknown; items?: unknown; mode?: unknown; publish?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }
    const blogId = typeof body.blogId === "string" ? parseBlogId(body.blogId) : null;
    const mode: MigrateMode = body.mode === "raw" ? "raw" : "polish";
    const items = Array.isArray(body.items) ? body.items as { logNo?: unknown; date?: unknown }[] : [];
    if (typeof body.lawyerId !== "string" || !/^[0-9a-f-]{36}$/.test(body.lawyerId) || !blogId) return NextResponse.json({ error: "변호사와 블로그를 확인해 주세요." }, { status: 400 });
    if (items.length < 1 || items.length > 3 || items.some((i) => typeof i.logNo !== "string" || !/^\d{6,20}$/.test(i.logNo))) {
        return NextResponse.json({ error: "한 번에 1~3편씩 보내 주세요." }, { status: 400 });
    }
    const db = createServiceClient();
    const { data: lawyer, error } = await db.from("lawyers").select("id, name, slug, region, office_name").eq("id", body.lawyerId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!lawyer) return NextResponse.json({ error: "변호사를 찾지 못했습니다." }, { status: 404 });

    const results = [];
    for (const item of items) {
        const logNo = item.logNo as string;
        const date = typeof item.date === "string" && !Number.isNaN(Date.parse(item.date)) ? item.date : null;
        try {
            results.push(await migrateNaverPost({ db, lawyer, blogId, logNo, date, mode, publish: body.publish !== false }));
        } catch (err) {
            console.error("[LawyerMigrate]", { lawyerId: lawyer.id, blogId, logNo, error: err instanceof Error ? err.message : String(err) });
            results.push({ logNo, ok: false, error: err instanceof Error ? err.message : "옮기지 못했습니다." });
        }
    }
    return NextResponse.json({ results, lawyerSlug: lawyer.slug }, { headers });
}
