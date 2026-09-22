import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { PlanValidationError, validateVisualPlan, sourceHash, PLAN_VERSION } from "@/lib/blog-images/visual-planner";
import { EDITORIAL_SET_FORMAT } from "@/lib/blog-images/card-types";
import { asEditorialThree, planEditorialThree, planEditorialThreeFromBrief } from "@/lib/blog-images/three-card-plan";
import { coverBriefFromWire } from "@/lib/blog-cover-brief";
import { appendUsage } from "@/lib/blog-post-state";
import type { UsageEntry } from "@/lib/blog-usage";
import { selectImageProof } from "@/lib/blog-images/proof-selection";
import { prepareEditorialThree } from "@/lib/blog-images/three-card-renderer";
import { getMagazineIdentity } from "@/lib/blog-images/magazine-identity";
import { imageStrengthContext } from "@/lib/blog-images/strength-context";
import { StrengthStoreError } from "@/lib/blog-strengths-store";
import { cachedVisualPlan, saveVisualPlan, digest, recentVisualHistory, recordVisualPlan, ImageProductionError } from "@/lib/blog-images/production-store";
import { paidAttempt, paidId, PaidOperationError } from "@/lib/blog-images/paid-operation";
import { loadStudioLibrary } from "@/lib/lawyer-studio/store";
import { selectStudioPhotos, checkStudioBlogReady, editorialStudioPhoto } from "@/lib/lawyer-studio/blog";
import { STUDIO_FORMAT, StudioError } from "@/lib/lawyer-studio/types";

export const runtime = "nodejs";
export const maxDuration = 300;
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
        const context = p ? await imageStrengthContext(p, body.title || "", body.content, body.strengthToken, body.recoverLegacy !== true) : null;
        if (!context) throw new ImageProductionError("저장된 변호사를 먼저 선택해주세요.", 400);
        const identity = context ? getMagazineIdentity(context.profile) : undefined;
        const attempt = paidAttempt(body.attemptId, body.confirmPaid);
        if (body.recoverOnly === true && body.forceReplan === true) throw new ImageProductionError("저장 응답 복구와 새 유료 기획은 함께 요청할 수 없습니다.", 400);
        if (body.forceReplan && !attempt) throw new ImageProductionError("새 기획은 유료입니다. 비용 안내를 확인한 뒤 다시 기획해주세요.", 400);
        const legacyId = digest(JSON.stringify({ version: PLAN_VERSION, source: sourceHash(body.title || "", body.content), profile: context.profile, selection: context.selection }));
        const planIdentity = { source: sourceHash(body.title || "", body.content), profileId: context.profile.id, identity,
            claims: context.selection.claims, revision: context.selection.revision };
        const oldCacheId = paidId("plan-v12-schema2", { ...planIdentity, attempt });
        const cacheId = paidId(EDITORIAL_SET_FORMAT, { source: planIdentity.source, profileId: context.profile.id, attempt });
        const defaultId = paidId(EDITORIAL_SET_FORMAT, { source: planIdentity.source, profileId: context.profile.id, attempt: "" });
        const oldCached = await cachedVisualPlan(oldCacheId) || (!attempt ? await cachedVisualPlan(legacyId) : null);
        if (body.recoverLegacy === true) {
            if (!oldCached) throw new ImageProductionError("복구할 이전 구성안이 없습니다. 새 원고는 3장으로 제작합니다.", 404);
            const cached = oldCached;
            const plan = validateVisualPlan(cached, body.title || "", body.content);
            if (plan.setFormat === STUDIO_FORMAT) {
                const library = await loadStudioLibrary(context.profile.id);
                const stillApproved = library.blogEnabled && plan.studioPhotos?.every((p) => library.assets.some((a) => a.id === p.assetId && a.version === p.version && a.status === "approved"));
                if (!stillApproved) {
                    // Replace only the free photo bindings. Preserve the paid cover brief/art.
                    plan.studioPhotos = selectStudioPhotos(library, plan.sourceHash);
                    await checkStudioBlogReady(context.profile, plan.studioPhotos);
                    await saveVisualPlan(oldCacheId, { ...cached, ...plan });
                }
            }
            plan.strengthToken = context!.token; plan.strengthSelection = context!.selection;
            return NextResponse.json({ plan }, { headers: { "Cache-Control": "private, no-store" } });
        }
        // 2026-09-22: 신뢰 카드에 승인 경력을 싣는 기능을 뺐다. 항상 사진만(basic).
        const proof = selectImageProof(context.library, `${body.title || ""} ${body.content}`, planIdentity.source, true);
        await prepareEditorialThree(context.profile, proof, body.title || "", await editorialStudioPhoto(context.profile.id, `${EDITORIAL_SET_FORMAT}:${context.profile.id}`),
            await editorialStudioPhoto(context.profile.id, `${EDITORIAL_SET_FORMAT}:${context.profile.id}`, "contact"));
        const cached = await cachedVisualPlan(cacheId) || oldCached;
        if (cached) {
            const plan = asEditorialThree(validateVisualPlan(cached, body.title || "", body.content), context.profile, proof, body.title || "", body.content);
            plan.strengthToken = context.token; plan.strengthSelection = context.selection;
            plan.productionNotes = cached.setFormat === EDITORIAL_SET_FORMAT ? cached.productionNotes : ["이전 표지 기획·원본을 재사용해 3장으로 편집합니다. 기존 4장 파일은 보존됩니다."];
            await saveVisualPlan(cacheId, plan);
            return NextResponse.json({ plan }, { headers: { "Cache-Control": "private, no-store" } });
        }
        let recent: Awaited<ReturnType<typeof recentVisualHistory>> = [];
        const notes: string[] = [];
        if (context) try { recent = await recentVisualHistory(context.profile.id); }
        catch { notes.push("최근 구성 이력을 읽지 못해 이번 기획은 원고 근거로만 설계했습니다."); }
        // 2026-09-22 재설계 §3: 원고 응답에 딸려 온 표지 브리프가 있으면 모델 호출 없이 구성안을 조립한다.
        // 새 유료 기획을 명시적으로 요청했거나(forceReplan) 저장 응답 복구(recoverOnly)면 예전 경로.
        const usageSink: UsageEntry[] = [];
        const brief = body.forceReplan === true || body.recoverOnly === true ? null : coverBriefFromWire(body.coverBrief);
        // Keep the original paid-operation ID: a saved provider response is not billed again.
        const plan = brief
            ? planEditorialThreeFromBrief(body.title || "", body.content, context.profile, proof, brief, recent)
            : await planEditorialThree(body.title || "", body.content, context.profile, proof, oldCacheId, recent, body.recoverOnly === true, usageSink);
        if (context) { plan.strengthToken = context.token; plan.strengthSelection = context.selection; }
        if (context) try { await recordVisualPlan(context.profile.id, plan); }
        catch { notes.push("이번 기획의 구성 이력을 저장하지 못했습니다."); }
        plan.productionNotes = notes;
        if (cacheId) await saveVisualPlan(cacheId, plan);
        if (attempt) await saveVisualPlan(defaultId, plan);
        await appendUsage(body.postId, usageSink);
        return NextResponse.json({ plan, usage: usageSink }, { headers: { "Cache-Control": "private, no-store" } });
    }
    catch (e) {
        console.error("[VisualPlan] failed", e instanceof Error ? e.name : "UnknownError");
        return NextResponse.json({ error: e instanceof Error ? e.message : "이미지 기획에 실패했습니다.", ...(e instanceof PaidOperationError ? { operationId: e.operationId, code: e.code } : {}) }, { status: e instanceof StudioError || e instanceof StrengthStoreError || e instanceof ImageProductionError ? e.status : e instanceof PlanValidationError ? 422 : 502 });
    }
}
