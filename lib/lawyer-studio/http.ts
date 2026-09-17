import { verifyAdminToken } from "@/lib/admin-auth";
import { ImageProductionError } from "@/lib/blog-images/production-store";
import { StudioError } from "./types";

export async function authorizeStudio(req: Request) {
    if (!await verifyAdminToken(req)) throw new StudioError("관리자 로그인이 필요합니다.", 401);
    const origin = req.headers.get("origin");
    if (req.method !== "GET" && origin && origin !== new URL(req.url).origin) throw new StudioError("요청 출처를 확인해주세요.", 403);
}
export function studioFailure(error: unknown) {
    const known = error instanceof StudioError || error instanceof ImageProductionError;
    if (!known) console.error("[LawyerStudio]", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: known ? error.message : "사진 작업을 완료하지 못했습니다. 기존 작업 복구를 먼저 확인해주세요." }, { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
export async function studioJson(req: Request) {
    const text = await req.text();
    if (text.length > 30_000) throw new StudioError("요청 크기가 너무 큽니다.", 413);
    try { const value = JSON.parse(text); if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>; } catch { /* Return a safe validation error. */ }
    throw new StudioError("요청 형식을 확인해주세요.");
}
