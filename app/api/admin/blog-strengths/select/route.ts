import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { isStrategySameOrigin } from "@/lib/portal-strategy";
import { createServiceClient } from "@/lib/supabase/server";
import { eligibleStrengths, reviewStrengths, selectStrengths, validProfileId } from "@/lib/blog-strengths";
import { loadStrengthLibrary, recordStrengthUse, signStrengthSelection, strengthBodyHash, StrengthStoreError } from "@/lib/blog-strengths-store";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    if (!isStrategySameOrigin(request)) return NextResponse.json({ error: "동일한 사이트에서 요청해주세요." }, { status: 403, headers });
    try {
        const input = await request.json();
        if (!validProfileId(input.profileId) || typeof input.topic !== "string" || input.topic.length > 2000
            || (input.ids !== undefined && (!Array.isArray(input.ids) || input.ids.length > 2 || !input.ids.every(validProfileId)))) throw new StrengthStoreError("주제·변호사·강점 선택을 확인해주세요.", 400);
        const db = createServiceClient(), library = await loadStrengthLibrary(input.profileId, db);
        if (input.revision !== undefined && input.revision !== library.revision) throw new StrengthStoreError("승인 버전이 바뀌었습니다. 새로 확인해주세요.", 409);
        const { data: recent, error } = await db.from("blog_posts").select("body").eq("profile_id", input.profileId).order("created_at", { ascending: false }).limit(20);
        if (error) throw new StrengthStoreError("최근 원고를 확인하지 못했습니다.");
        const selection = selectStrengths(library, input.topic, (recent || []).map((p) => p.body || ""), input.ids);
        let token: string | undefined;
        let review;
        if (input.body !== undefined) {
            if (typeof input.body !== "string" || input.body.length > 40_000 || typeof input.title !== "string" || input.title.length > 180) throw new StrengthStoreError("원고를 확인해주세요.", 400);
            review = reviewStrengths(input.body, selection);
            if (review.issues.length) throw new StrengthStoreError("선택한 승인 문구가 원고에 없거나 반복됩니다. 원고 또는 강점 선택을 수정해주세요.", 422);
            token = signStrengthSelection(selection, input.title, input.body);
            if (input.postId) {
                const { data: post, error: postError } = await db.from("blog_posts").select("profile_id,title,body").eq("id", input.postId).single();
                if (postError || !post || post.profile_id !== input.profileId || post.title !== input.title || post.body !== input.body) throw new StrengthStoreError("저장된 원고와 검수 대상이 다릅니다.", 409);
                await recordStrengthUse(input.profileId, input.postId, selection, db, { title: input.title, bodyHash: strengthBodyHash(input.body) });
            }
        }
        return NextResponse.json({ selection, eligible: eligibleStrengths(library), designFamily: library.designFamily, token, review }, { headers });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "강점 검수 실패" }, { status: e instanceof StrengthStoreError ? e.status : 400, headers });
    }
}
