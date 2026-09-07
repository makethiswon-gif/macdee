import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import {
    REQUEST_ADMIN_COLUMNS, REQUEST_PUBLIC_COLUMNS, REQUEST_STATUSES, emptyRequestCounts,
    isPortalUuid, isRequestSameOrigin, isRequestSetupMissing, presentRequest,
    requestSearchFilter, validateNewRequest,
} from "@/lib/portal-requests";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
function dbError(error: { code?: string; message?: string }, admin: boolean) {
    if (isRequestSetupMissing(error)) return json({ setupRequired: true, error: admin ? "요청사항 저장소가 아직 준비되지 않았습니다. 016_portal_requests.sql 마이그레이션을 적용해 주세요." : "요청사항 메뉴를 준비 중입니다. 담당자에게 문의해 주세요." }, 503);
    return json({ error: "요청사항을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
}

export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "로그인이 필요합니다." }, 401);
    const admin = session.role === "admin";
    const url = new URL(request.url);
    const firmId = admin ? url.searchParams.get("firm") || null : session.firmId;
    if ((!admin && !firmId) || (firmId && !isPortalUuid(firmId))) return json({ error: "로펌 정보가 올바르지 않습니다." }, 400);
    const status = url.searchParams.get("status") || "";
    if (status && !(REQUEST_STATUSES as readonly string[]).includes(status)) return json({ error: "처리 상태가 올바르지 않습니다." }, 400);
    const q = (url.searchParams.get("q") || "").trim();
    if (q.length > 100) return json({ error: "검색어는 100자 이내로 입력해 주세요." }, 400);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");
    if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) return json({ error: "페이지 정보가 올바르지 않습니다." }, 400);

    try {
        const db = createServiceClient();
        let query = db.from("portal_requests").select(admin ? REQUEST_ADMIN_COLUMNS : REQUEST_PUBLIC_COLUMNS, { count: "exact" });
        if (firmId) query = query.eq("firm_id", firmId);
        if (status) query = query.eq("status", status);
        if (q) query = query.or(requestSearchFilter(q));
        const countQueries = REQUEST_STATUSES.map((value) => {
            let countQuery = db.from("portal_requests").select("id", { count: "exact", head: true }).eq("status", value);
            if (firmId) countQuery = countQuery.eq("firm_id", firmId);
            return countQuery;
        });
        const [list, ...statusCounts] = await Promise.all([
            query.order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1),
            ...countQueries,
        ]);
        const error = list.error ?? statusCounts.find((result) => result.error)?.error;
        if (error) return dbError(error, admin);
        const counts = emptyRequestCounts();
        REQUEST_STATUSES.forEach((value, index) => { counts[value] = statusCounts[index].count ?? 0; });
        return json({ requests: (list.data ?? []).map((row) => presentRequest(row as unknown as Record<string, unknown>, admin)), total: list.count ?? 0, page, pageSize, counts });
    } catch {
        return json({ error: "요청사항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
    }
}

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "로그인이 필요합니다." }, 401);
    if (!isRequestSameOrigin(request)) return json({ error: "같은 사이트에서 다시 요청해 주세요." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON 입력이 필요합니다." }, 415);
    const admin = session.role === "admin";
    let input: unknown;
    try { input = await request.json(); } catch { return json({ error: "입력 형식이 올바르지 않습니다." }, 400); }
    let fields: ReturnType<typeof validateNewRequest>;
    try { fields = validateNewRequest(input); } catch (error) { return json({ error: error instanceof Error ? error.message : "입력을 확인해 주세요." }, 400); }
    const firmId = admin ? (input as Record<string, unknown>).firmId : session.firmId;
    if (!isPortalUuid(firmId)) return json({ error: "요청할 로펌을 선택해 주세요." }, 400);
    try {
        const db = createServiceClient();
        const { data, error } = await db.from("portal_requests").insert({ ...fields, firm_id: firmId, created_by: session.role })
            .select(admin ? REQUEST_ADMIN_COLUMNS : REQUEST_PUBLIC_COLUMNS).single();
        if (error) {
            if (error.code === "23503") return json({ error: "로펌을 찾을 수 없습니다. 로그인 상태를 확인해 주세요." }, 400);
            return dbError(error, admin);
        }
        if (!data) return json({ error: "요청사항을 저장하지 못했습니다." }, 500);
        return json({ request: presentRequest(data as unknown as Record<string, unknown>, admin) }, 201);
    } catch {
        return json({ error: "요청사항을 저장하지 못했습니다. 작성 내용은 유지됩니다." }, 500);
    }
}
