import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { planArticle, PlanValidationError } from "@/lib/blog-images/visual-planner";
import { getMagazineIdentity } from "@/lib/blog-images/magazine-identity";

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
    const identity = p ? getMagazineIdentity({
        id: typeof p.id === "string" ? p.id : "",
        lawyerName: typeof p.lawyerName === "string" ? p.lawyerName : "",
        brandColor: typeof p.brandColor === "string" ? p.brandColor : "",
        dnaSalt: typeof p.dnaSalt === "string" ? p.dnaSalt : "",
    }) : undefined;
    try { return NextResponse.json({ plan: await planArticle(body.title || "", body.content, identity) }); }
    catch (e) {
        console.error("[VisualPlan] failed", e instanceof Error ? e.name : "UnknownError");
        return NextResponse.json({ error: e instanceof Error ? e.message : "이미지 기획에 실패했습니다." }, { status: e instanceof PlanValidationError ? 422 : 502 });
    }
}
