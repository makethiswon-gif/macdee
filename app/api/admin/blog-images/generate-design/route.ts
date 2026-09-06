import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { BLOG_CARD_TYPES, type BlogCardType, type EditorialProfile } from "@/lib/blog-images/card-types";
import { planArticle, validateVisualPlan, PlanValidationError, ART_REVIEW_MODEL } from "@/lib/blog-images/visual-planner";
import { BLOG_PHOTO_MODEL, generateReviewedArt, normalizeEditorialArt } from "@/lib/blog-images/photo-generator";
import { readBrandAsset } from "@/lib/blog-images/editorial-renderer";
import { renderBriefCard } from "@/lib/blog-images/brief-renderer";
import { ContactProfileError } from "@/lib/blog-images/contact-renderer";
import { contactReadiness } from "@/lib/blog-images/contact-details";
import { reviewMagazineCard } from "@/lib/blog-images/design-review";

export const runtime = "nodejs";
export const maxDuration = 300;
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const assets = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 1) : [];
function profileFrom(value: unknown): EditorialProfile | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const p = value as Record<string, unknown>, lawyerName = clean(p.lawyerName, 80);
    if (!lawyerName) return null;
    return { id: clean(p.id, 100), lawyerName, officeName: clean(p.officeName, 100), jobTitle: clean(p.jobTitle, 40),
        phone: clean(p.phone, 120), website: clean(p.website, 180), brandColor: clean(p.brandColor, 20),
        profileImages: assets(p.profileImages), officeImages: assets(p.officeImages), logoImage: typeof p.logoImage === "string" ? p.logoImage : "" };
}

export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 }); }
    const profile = profileFrom(body?.profile), type = body?.cardType as BlogCardType;
    if (!profile || !BLOG_CARD_TYPES.includes(type) || typeof body.content !== "string" || !body.content.trim() || body.content.length > 40_000
        || (body.title != null && (typeof body.title !== "string" || body.title.length > 180))) {
        return NextResponse.json({ error: "변호사 프로필, 제목(180자), 본문(4만 자), 이미지 종류를 확인해 주세요." }, { status: 400 });
    }
    if ((body.quality && !["medium", "high"].includes(body.quality)) || (body.photoSource && !["ai", "office"].includes(body.photoSource))
        || (body.style && !["paper", "contrast"].includes(body.style)) || (body.headingOverride != null && (typeof body.headingOverride !== "string" || body.headingOverride.length > 70))) {
        return NextResponse.json({ error: "이미지 설정이나 수정 제목을 확인해 주세요." }, { status: 400 });
    }
    try {
        if (type === "contact" && contactReadiness(profile).length) throw new ContactProfileError(`상담 안내에 필요한 ${contactReadiness(profile).join("과 ")}을 사진·로고 관리에서 등록해 주세요.`);
        if (body.renderOnly && !body.plan) throw new PlanValidationError("레이아웃 변경에는 기존 구성안이 필요합니다.");
        // Legacy callers remain compatible; updated batch callers share one plan per article.
        const plan = body.plan ? validateVisualPlan(body.plan, body.title || "", body.content) : await planArticle(body.title || "", body.content);
        const planned = plan.cards.find((c) => c.type === type)!;
        if (planned.skipReason) return NextResponse.json({ skipped: true, error: planned.skipReason }, { status: 422 });
        let art: Buffer | undefined, review: string | undefined, model: string | undefined;
        let artHold: { reason: string; issues: string[] } | undefined;
        const useOffice = body.photoSource === "office";
        if (type === "thumbnail" || type === "illustration") {
            if (body.reuseArt) {
                const reused = body.reuseArt;
                if (!body.renderOnly || reused.sourceHash !== plan.sourceHash || typeof reused.dataUrl !== "string"
                    || reused.dataUrl.length > 1_050_000 || !reused.dataUrl.startsWith("data:image/jpeg;base64,")) {
                    throw new PlanValidationError("현재 원고에서 생성한 시각물만 재사용할 수 있습니다.");
                }
                art = await normalizeEditorialArt(await readBrandAsset(reused.dataUrl));
                review = "이전 시각물 재사용 · 새로운 이미지 모델 호출 없음";
            } else if (useOffice) {
                if (!profile.officeImages[0]) throw new PlanValidationError("프로필에 실제 사무실 사진을 먼저 등록해 주세요.");
                art = await normalizeEditorialArt(await readBrandAsset(profile.officeImages[0]));
                review = "등록된 사무실 사진 · 원고 주제와의 적합성은 직접 확인해 주세요";
            } else {
                if (body.renderOnly) throw new PlanValidationError("재사용할 시각물이 없습니다. 이미지를 먼저 생성해 주세요.");
                const result = await generateReviewedArt(planned.art!, body.quality || "high");
                art = result.bytes; review = result.review; model = BLOG_PHOTO_MODEL;
                if (!result.approved) artHold = { reason: result.review, issues: result.issues };
            }
        }
        const card = await renderBriefCard({ plan, card: planned, profile, style: body.style || "contrast", art,
            artLabel: useOffice ? "등록된 사무실 사진" : "AI 설명용 시각물 · 실제 사건 자료 아님", model, headingOverride: body.headingOverride });
        if (art) {
            card.artDataUrl = "data:image/jpeg;base64," + art.toString("base64");
            card.artSourceHash = plan.sourceHash;
            card.artReview = review;
        }
        // All normal generations receive independent finished-pixel QA; local edits remain zero-AI.
        if (artHold) {
            card.designReview = { status: "revise", model: ART_REVIEW_MODEL, summary: artHold.reason, issues: artHold.issues };
            card.warnings.push("시각물 검수에서 보류했습니다. 이미지와 원본 아트는 보존했습니다. 사용 전 주제·사실관계를 직접 확인하거나 다시 생성해 주세요. 완성 지면 AI 검수는 진행하지 않았습니다.");
        } else if (!body.renderOnly) {
            card.designReview = await reviewMagazineCard(card, planned, plan);
            if (card.designReview.status !== "pass") card.warnings.push(card.designReview.status === "revise" ? "완성본 검수에서 수정 권고가 있습니다. 검수 메모를 확인한 뒤 사용해 주세요." : card.designReview.summary);
        } else card.warnings.push("편집 후 완성본 AI 검수는 실행하지 않았습니다. 글자·배치·원문 조건을 직접 확인해 주세요.");
        return NextResponse.json({ card });
    } catch (e) {
        console.error("[BlogVisualV7] failed", e instanceof Error ? e.name : "UnknownError");
        const timedOut = e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name);
        return NextResponse.json({ error: timedOut ? "기획·검수 응답이 지연됐습니다. 자동으로 중복 요청하지 않았습니다. 해당 작업만 다시 시도해 주세요."
            : e instanceof Error ? e.message : "이미지 생성에 실패했습니다." }, { status: e instanceof PlanValidationError || e instanceof ContactProfileError ? 400 : 502 });
    }
}
