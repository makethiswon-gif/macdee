import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { listRecordFiles, withSignedUrls } from "@/lib/portal-files";

export const dynamic = "force-dynamic";

// 자료에 붙은 원문 파일 목록 + 10분짜리 보기·내려받기 주소. 로펌은 자기 자료만, 관리자는 모두.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { data: record } = await createServiceClient().from("portal_records").select("id, firm_id").eq("id", id).maybeSingle();
    if (!record) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
    if (session.role === "firm" && record.firm_id !== session.firmId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const files = await withSignedUrls(await listRecordFiles(record.firm_id, id));
        return NextResponse.json({ files }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (e) {
        console.error("[portal] files list failed:", e);
        return NextResponse.json({ error: "파일 목록을 불러오지 못했습니다." }, { status: 500 });
    }
}
