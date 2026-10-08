import { NextResponse } from "next/server";
import { refreshLawyerBlog } from "@/lib/lawyer-blog-cache";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { makeSlug } from "@/lib/slug";

export const maxDuration = 60;

interface UpdateItem {
    id: string;
    newTitle: string;
}

export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const updates: UpdateItem[] = Array.isArray(body.updates) ? body.updates : [];

        if (updates.length === 0) {
            return NextResponse.json({ error: "no updates provided" }, { status: 400 });
        }

        const supabase = createServiceClient();

        // 변경 전 제목 백업 (감사 로그) — 추후 롤백용
        const ids = updates.map(u => u.id);
        const { data: existing } = await supabase
            .from("contents")
            .select("id, title, lawyer_id")
            .in("id", ids);

        const backup = new Map((existing || []).map(e => [e.id as string, e.title as string]));
        const lawyerOf = new Map((existing || []).map(e => [e.id as string, e.lawyer_id as string]));
        const changed = new Map<string, string[]>();

        let updated = 0;
        const errors: { id: string; error: string }[] = [];

        for (const u of updates) {
            if (!u.id || !u.newTitle?.trim()) continue;
            const cleanTitle = u.newTitle.trim();
            // 동일하면 스킵
            if (backup.get(u.id) === cleanTitle) continue;

            // 제목 변경 시 slug도 함께 재생성 (URL도 새 키워드로 갱신)
            const newSlug = makeSlug(cleanTitle, u.id);
            const { data: updatedRow, error } = await supabase
                .from("contents")
                .update({ title: cleanTitle, slug: newSlug })
                .eq("id", u.id)
                .select("id, title")
                .single();

            if (error) {
                console.error(`[SEO Titles Apply] DB error for ${u.id}:`, error.message, error.code);
                errors.push({ id: u.id, error: `${error.code}: ${error.message}` });
            } else if (!updatedRow || updatedRow.title !== cleanTitle) {
                console.error(`[SEO Titles Apply] Update not reflected for ${u.id}: got "${updatedRow?.title}"`);
                errors.push({ id: u.id, error: "DB에 반영되지 않음" });
            } else {
                updated++;
                const lawyerId = lawyerOf.get(u.id);
                if (lawyerId) changed.set(lawyerId, [...(changed.get(lawyerId) || []), u.id]);
                console.log(`[SEO Titles Apply] OK ${u.id}: "${backup.get(u.id)}" → "${cleanTitle}"`);
            }
        }

        // 제목·주소가 바뀐 글: 새 주소가 바로 보이게 캐시된 블로그 페이지를 비운다.
        // 옛 주소는 글 페이지가 주소 끝 6자(글 ID 앞 6자)로 이 글을 찾아 새 주소로 영구 이동시킨다(getMovedBlogPost).
        for (const [lawyerId, postIds] of changed) refreshLawyerBlog({ lawyerId, postIds });

        return NextResponse.json({
            updated,
            skipped: updates.length - updated - errors.length,
            errors,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[SEO Titles Apply] error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
