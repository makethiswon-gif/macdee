import { NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { loadPostState, updatePostState, validPostId, type FactCheck, type PostStage, type PostState } from "@/lib/blog-post-state";
import { coverBriefFromWire } from "@/lib/blog-cover-brief";
import { ImageProductionError } from "@/lib/blog-images/production-store";
import type { UsageEntry } from "@/lib/blog-usage";

// 원고별 작업 상태(단계·사실 확인·본문 이력·표지 브리프·AI 사용량). 본문 자체는 /api/admin/blog-posts 가 원본이다.
export const runtime = "nodejs";
const STAGES: PostStage[] = ["draft", "review", "confirmed", "images", "done"];
const FACT_STATUS = ["unverified", "verified", "corrected", "stale"];
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!validPostId(id)) return NextResponse.json({ error: "원고 ID를 확인해주세요." }, { status: 400 });
    try { return NextResponse.json({ state: await loadPostState(id) }, { headers: { "Cache-Control": "private, no-store" } }); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "작업 상태를 읽지 못했습니다." }, { status: e instanceof ImageProductionError ? e.status : 500 }); }
}

/** 부분 갱신. aiUsage 는 덧붙이고, 나머지는 준 값으로 바꾼다. */
export async function PATCH(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "요청 형식을 확인해주세요." }, { status: 400 }); }
    const id = body.id;
    if (!validPostId(id)) return NextResponse.json({ error: "원고 ID를 확인해주세요." }, { status: 400 });
    try {
        const state = await updatePostState(id, (s: PostState) => {
            if (typeof body.stage === "string" && STAGES.includes(body.stage as PostStage)) s.stage = body.stage as PostStage;
            if (Array.isArray(body.appendUsage)) s.aiUsage.push(...(body.appendUsage as UsageEntry[]).filter((u) => u && typeof u === "object" && typeof u.model === "string").slice(0, 20));
            if (Array.isArray(body.factChecks)) s.factChecks = (body.factChecks as unknown[]).slice(0, 60).flatMap((f) => {
                if (!f || typeof f !== "object") return [];
                const v = f as Record<string, unknown>;
                const claim = clip(v.claim, 400); if (!claim) return [];
                const status = FACT_STATUS.includes(String(v.status)) ? (v.status as FactCheck["status"]) : "unverified";
                return [{ claim, status, note: clip(v.note, 600) || undefined, sourceUrl: clip(v.sourceUrl, 500) || undefined,
                    checkedAt: clip(v.checkedAt, 40) || undefined, bodyHashAtCheck: clip(v.bodyHashAtCheck, 64) || undefined } satisfies FactCheck];
            });
            if (body.pushBodyVersion && typeof body.pushBodyVersion === "object") {
                const v = body.pushBodyVersion as Record<string, unknown>;
                const bodyText = typeof v.body === "string" ? v.body.slice(0, 60_000) : "";
                if (bodyText) s.bodyVersions.push({ at: new Date().toISOString(), title: clip(v.title, 180), body: bodyText, reason: clip(v.reason, 120) || "수정" });
            }
            if (body.popBodyVersion === true) s.bodyVersions.pop();
            if ("coverBrief" in body) { s.coverBrief = body.coverBrief === null ? null : coverBriefFromWire(body.coverBrief); if (typeof body.coverBriefBodyHash === "string") s.coverBriefBodyHash = clip(body.coverBriefBodyHash, 64); }
            if (body.source && typeof body.source === "object") { const v = body.source as Record<string, unknown>; if (v.kind === "topic" || v.kind === "rewrite") s.source = { kind: v.kind, label: clip(v.label, 160) }; }
            if (typeof body.question === "string") s.question = clip(body.question, 1000);
            if (typeof body.thesis === "string") s.thesis = clip(body.thesis, 4000);
        });
        return NextResponse.json({ state }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "작업 상태를 저장하지 못했습니다." }, { status: e instanceof ImageProductionError ? e.status : 500 }); }
}
