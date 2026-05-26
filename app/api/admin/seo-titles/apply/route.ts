import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

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
            .select("id, title")
            .in("id", ids);

        const backup = new Map((existing || []).map(e => [e.id as string, e.title as string]));

        let updated = 0;
        const errors: { id: string; error: string }[] = [];

        for (const u of updates) {
            if (!u.id || !u.newTitle?.trim()) continue;
            const cleanTitle = u.newTitle.trim();
            // 동일하면 스킵
            if (backup.get(u.id) === cleanTitle) continue;

            const { data: updatedRow, error } = await supabase
                .from("contents")
                .update({ title: cleanTitle })
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
                console.log(`[SEO Titles Apply] OK ${u.id}: "${backup.get(u.id)}" → "${cleanTitle}"`);
            }
        }

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
