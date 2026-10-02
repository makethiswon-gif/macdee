import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { workerStatus } from "@/lib/ai/subscription-relay";

// 블로그 발행 화면의 '클로드 구독' 표시용 — 대표 PC 작업기의 마지막 생존 신호.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const status = await workerStatus();
        return NextResponse.json({ status }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
        return NextResponse.json({ error: "작업기 상태를 읽지 못했습니다." }, { status: 502 });
    }
}
