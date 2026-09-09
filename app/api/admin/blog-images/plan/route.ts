import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { planArticle, PlanValidationError, validateVisualPlan, sourceHash, PLAN_VERSION } from "@/lib/blog-images/visual-planner";
import { getMagazineIdentity } from "@/lib/blog-images/magazine-identity";
import { imageStrengthContext } from "@/lib/blog-images/strength-context";
import { StrengthStoreError } from "@/lib/blog-strengths-store";
import { cachedVisualPlan, saveVisualPlan, digest, recentVisualHistory, recordVisualPlan, ImageProductionError } from "@/lib/blog-images/production-store";

export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }
    if (typeof body?.content !== "string" || !body.content.trim() || body.content.length > 40_000
        || (body.title != null && (typeof body.title !== "string" || body.title.length > 180))) {
        return NextResponse.json({ error: "제목(180자 이내)과 본문(4만 자 이내)을 확인해 주세요." }, { status: 400 });
    }
    // profile 은 선택 입력 — 있으면 변호사별 시리즈 축(팔레트·서체)이 기획에 반영된다
    const p = body.profile && typeof body.profile === "object" ? body.profile as Record<string, unknown> : null;
    try {
        const context = p ? await imageStrengthContext(p, body.title || "", body.content, body.strengthToken) : null;
        const identity = context ? getMagazineIdentity(context.profile) : undefined;
        const cacheId = context ? digest(JSON.stringify({ version: PLAN_VERSION, source: sourceHash(body.title || "", body.content), profile: context.profile, selection: context.selection })) : null;
        const cached = cacheId ? await cachedVisualPlan(cacheId) : null;
        if (cached && !body.forceReplan) {
            const plan = validateVisualPlan(cached, body.title || "", body.content);
            plan.strengthToken = context!.token; plan.strengthSelection = context!.selection;
            return NextResponse.json({ plan }, { headers: { "Cache-Control": "private, no-store" } });
        }
        let recent: Awaited<ReturnType<typeof recentVisualHistory>> = [];
        const notes: string[] = [];
        if (context) try { recent = await recentVisualHistory(context.profile.id); }
        catch { notes.push("최근 구성 이력을 읽지 못해 이번 기획은 원고 근거로만 설계했습니다."); }
        const plan = await planArticle(body.title || "", body.content, identity, context?.selection, recent);
        if (context) { plan.strengthToken = context.token; plan.strengthSelection = context.selection; }
        if (context) try { await recordVisualPlan(context.profile.id, plan); }
        catch { notes.push("이번 기획의 구성 이력을 저장하지 못했습니다."); }
        plan.productionNotes = notes;
        if (cacheId) await saveVisualPlan(cacheId, plan);
        return NextResponse.json({ plan }, { headers: { "Cache-Control": "private, no-store" } });
    }
    catch (e) {
        console.error("[VisualPlan] failed", e instanceof Error ? e.name : "UnknownError");
        return NextResponse.json({ error: e instanceof Error ? e.message : "이미지 기획에 실패했습니다." }, { status: e instanceof StrengthStoreError || e instanceof ImageProductionError ? e.status : e instanceof PlanValidationError ? 422 : 502 });
    }
}
