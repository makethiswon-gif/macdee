import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

// 대표 전용 심층 브리핑 — 내용은 비공개 Storage(owner-briefings)에만 있다.
// 공개 리포에 브리핑 본문을 커밋하지 않기 위한 구조: 코드에는 읽기 경로만 둔다.
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
    const db = createServiceClient();
    const { data, error } = await db.storage.from("owner-briefings").download("strategy/latest.json");
    if (error || !data) {
        return NextResponse.json({ briefing: null, error: "등록된 브리핑이 없습니다." }, { status: 404, headers: noStore });
    }
    try {
        const briefing = JSON.parse(await data.text());
        return NextResponse.json({ briefing }, { headers: noStore });
    } catch {
        return NextResponse.json({ briefing: null, error: "브리핑 파일을 읽지 못했습니다." }, { status: 500, headers: noStore });
    }
}
