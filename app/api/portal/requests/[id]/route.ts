import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { REQUEST_ADMIN_COLUMNS, isPortalUuid, isRequestSameOrigin, isRequestSetupMissing, presentRequest, validateRequestUpdate } from "@/lib/portal-requests";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "로그인이 필요합니다." }, 401);
    if (session.role !== "admin") return json({ error: "관리자만 요청사항의 상태를 변경할 수 있습니다." }, 403);
    if (!isRequestSameOrigin(request)) return json({ error: "같은 사이트에서 다시 요청해 주세요." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON 입력이 필요합니다." }, 415);
    const { id } = await context.params;
    if (!isPortalUuid(id)) return json({ error: "요청 정보가 올바르지 않습니다." }, 400);
    let update: ReturnType<typeof validateRequestUpdate>;
    try { update = validateRequestUpdate(await request.json()); }
    catch (error) { return json({ error: error instanceof SyntaxError ? "입력 형식이 올바르지 않습니다." : error instanceof Error ? error.message : "입력을 확인해 주세요." }, 400); }
    try {
        const { data, error } = await createServiceClient().from("portal_requests").update({ ...update, updated_at: new Date().toISOString() })
            .eq("id", id).select(REQUEST_ADMIN_COLUMNS).maybeSingle();
        if (error) {
            if (isRequestSetupMissing(error)) return json({ setupRequired: true, error: "요청사항 저장소가 아직 준비되지 않았습니다. 016_portal_requests.sql 마이그레이션을 적용해 주세요." }, 503);
            return json({ error: "요청사항을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
        }
        if (!data) return json({ error: "요청사항을 찾을 수 없습니다." }, 404);
        return json({ request: presentRequest(data as unknown as Record<string, unknown>, true) });
    } catch {
        return json({ error: "요청사항을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
    }
}
