import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { planArticle, PlanValidationError } from "@/lib/blog-images/visual-planner";

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
    try { return NextResponse.json({ plan: await planArticle(body.title || "", body.content) }); }
    catch (e) {
        console.error("[VisualPlan] failed", e instanceof Error ? e.name : "UnknownError");
        return NextResponse.json({ error: e instanceof Error ? e.message : "이미지 기획에 실패했습니다." }, { status: e instanceof PlanValidationError ? 422 : 502 });
    }
}
