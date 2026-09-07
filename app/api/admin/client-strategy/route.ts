import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { getPreviousKstMonth, isCompleteStrategyMonth, isReportMonth, isStrategyFirmId, isStrategySameOrigin } from "@/lib/portal-strategy";
import { generateMonthlyStrategy, listStrategyFirms, listStrategyReports, strategyPublicError } from "@/lib/portal-strategy-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
    const url = new URL(request.url);
    const month = url.searchParams.get("month") || getPreviousKstMonth();
    const firmId = url.searchParams.get("firm") || undefined;
    if (!isReportMonth(month) || (firmId && !isStrategyFirmId(firmId))) return NextResponse.json({ error: "월 또는 로펌 ID 형식이 올바르지 않습니다." }, { status: 400, headers: noStore });
    let firms: Awaited<ReturnType<typeof listStrategyFirms>> = [];
    try {
        firms = await listStrategyFirms();
        const reports = await listStrategyReports(month, firmId);
        return NextResponse.json({ month, firms, reports }, { headers: noStore });
    } catch (error) {
        const safe = strategyPublicError(error);
        return NextResponse.json({ month, firms, reports: [], error: safe.message, ...(safe.setupRequired ? { setupRequired: true } : {}) }, { status: safe.status, headers: noStore });
    }
}

export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
    if (!isStrategySameOrigin(request)) return NextResponse.json({ error: "동일한 사이트에서만 생성할 수 있습니다." }, { status: 403, headers: noStore });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON 요청이 필요합니다." }, { status: 400, headers: noStore }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: noStore });
    const { month, firmId } = body as Record<string, unknown>;
    if (!isReportMonth(month) || !isStrategyFirmId(firmId)) return NextResponse.json({ error: "월과 로펌 ID를 확인해 주세요." }, { status: 400, headers: noStore });
    if (!isCompleteStrategyMonth(month)) return NextResponse.json({ error: "월간 전략은 자료 누락을 막기 위해 종료된 달에만 생성합니다. 지난달을 선택해 주세요." }, { status: 400, headers: noStore });
    try {
        const result = await generateMonthlyStrategy(firmId, month);
        return NextResponse.json(result, { status: result.report.status === "generating" ? 202 : 200, headers: noStore });
    } catch (error) {
        const safe = strategyPublicError(error);
        return NextResponse.json({ error: safe.message, ...(safe.setupRequired ? { setupRequired: true } : {}) }, { status: safe.status, headers: noStore });
    }
}
