import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPreviousKstMonth } from "@/lib/portal-strategy";
import { runMonthlyStrategies, strategyPublicError } from "@/lib/portal-strategy-service";

// First day 09:00 KST: persist the previous full calendar month's report.
// No outgoing mail or client-visible advice mutation. Cookie GET cannot trigger AI costs.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization") || "";
    const expected = secret ? `Bearer ${secret}` : "";
    const providedBytes = Buffer.from(authorization);
    const expectedBytes = Buffer.from(expected);
    if (!expected || providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const result = await runMonthlyStrategies(getPreviousKstMonth());
        return NextResponse.json(result, { status: result.complete ? 200 : 503, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        const safe = strategyPublicError(error);
        return NextResponse.json({ error: safe.message, ...(safe.setupRequired ? { setupRequired: true } : {}) }, { status: safe.status });
    }
}
