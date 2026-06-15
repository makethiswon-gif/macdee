import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { postToThreads } from "@/lib/threads/post";
import { generateThreadsCaption } from "@/lib/threads/caption";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

// 발행된 매거진 글을 스레드에 자동 게시 (best-effort — 실패해도 발행엔 영향 없음)
async function autoPostToThreads(slug: string, title: string, excerpt: string, body: string) {
    try {
        const code = (slug.split("-").pop() || "").trim();
        const shortUrl = code ? `${BASE_URL}/m/${code}` : `${BASE_URL}/magazine/${slug}`;
        const caption = (await generateThreadsCaption({ title, excerpt, body })) || excerpt || title;
        const result = await postToThreads({ text: caption, linkUrl: shortUrl });
        if (result.error) console.error("[Magazine→Threads]", result.error);
        return result;
    } catch (e) {
        console.error("[Magazine→Threads] error:", e);
        return null;
    }
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^가-힣a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
        .substring(0, 80) + "-" + Date.now().toString(36);
}

// GET: List magazines
export async function GET(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createAdminClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const status = url.searchParams.get("status") || "";
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
        .from("magazines")
        .select("id, title, slug, excerpt, category, status, view_count, seo_score, created_at, published_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, count } = await query;
    return NextResponse.json({ magazines: data || [], total: count || 0, page, limit });
}

// POST: Create magazine
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const supabase = await createAdminClient();
        const body = await request.json();
        const { title, excerpt, body: content, category, tags, meta_title, meta_description, status, cover_image_url } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "제목과 본문은 필수입니다." }, { status: 400 });
        }

        const slug = slugify(title);
        const seoScore = calculateSeoScore({ title, body: content, meta_title, meta_description, excerpt });

        const { data, error } = await supabase.from("magazines").insert({
            title,
            slug,
            excerpt: excerpt || content.substring(0, 160),
            body: content,
            category: category || "법률정보",
            tags: tags || [],
            meta_title: meta_title || title,
            meta_description: meta_description || (excerpt || content.substring(0, 155)),
            cover_image_url,
            seo_score: seoScore,
            status: status || "draft",
            published_at: status === "published" ? new Date().toISOString() : null,
        }).select("id, slug").single();

        if (error) {
            console.error("[Magazine] Create error:", error);
            return NextResponse.json({ error: "매거진 생성 실패" }, { status: 500 });
        }

        // 발행 상태로 생성되면 스레드에도 자동 게시
        let threads = null;
        if (status === "published") {
            threads = await autoPostToThreads(data.slug, title, excerpt || content.substring(0, 160), content);
        }

        return NextResponse.json({ magazine: data, threads }, { status: 201 });
    } catch (err) {
        console.error("[Magazine] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// PATCH: Update magazine
export async function PATCH(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const supabase = await createAdminClient();
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

        // 발행 전환 감지를 위해 기존 상태 조회
        const { data: prior } = await supabase
            .from("magazines")
            .select("status, slug, title, body, excerpt")
            .eq("id", id)
            .single();

        if (updates.body || updates.title) {
            updates.seo_score = calculateSeoScore({
                title: updates.title || "",
                body: updates.body || "",
                meta_title: updates.meta_title,
                meta_description: updates.meta_description,
                excerpt: updates.excerpt,
            });
        }

        if (updates.status === "published" && !updates.published_at) {
            updates.published_at = new Date().toISOString();
        }

        const { error } = await supabase.from("magazines").update(updates).eq("id", id);
        if (error) return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });

        // draft → published 로 처음 전환될 때만 스레드 자동 게시 (수정/재발행 중복 방지)
        let threads = null;
        if (updates.status === "published" && prior && prior.status !== "published") {
            threads = await autoPostToThreads(
                prior.slug,
                updates.title || prior.title,
                updates.excerpt || prior.excerpt || "",
                updates.body || prior.body || "",
            );
        }

        return NextResponse.json({ success: true, threads });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// DELETE: Delete magazine
export async function DELETE(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createAdminClient();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

    await supabase.from("magazines").delete().eq("id", id);
    return NextResponse.json({ success: true });
}

// SEO Score Calculator
function calculateSeoScore(data: {
    title?: string;
    body?: string;
    meta_title?: string;
    meta_description?: string;
    excerpt?: string;
}): number {
    let score = 0;
    const { title, body, meta_title, meta_description, excerpt } = data;

    // Title (max 25)
    if (title && title.length > 5) score += 10;
    if (title && title.length >= 20 && title.length <= 60) score += 15;

    // Body (max 25)
    if (body && body.length > 300) score += 10;
    if (body && body.length > 1000) score += 10;
    if (body && (body.match(/##/g) || []).length >= 2) score += 5; // headers

    // Meta (max 25)
    if (meta_title && meta_title.length >= 20 && meta_title.length <= 60) score += 10;
    if (meta_description && meta_description.length >= 80 && meta_description.length <= 160) score += 15;

    // Excerpt (max 25)
    if (excerpt && excerpt.length >= 50 && excerpt.length <= 200) score += 15;
    if (body && body.includes("![")) score += 10; // has images

    return Math.min(100, score);
}
