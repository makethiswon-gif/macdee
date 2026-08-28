import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { organizeWorklog } from "@/lib/portal-ai";

// 대표 업무일지 — admin 이 쓰고(published 시) 로펌이 본다.
// AI 정돈: 거친 메모 → 정리된 항목(organize=1).

export const maxDuration = 120;

export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const firmId = session.role === "firm" ? session.firmId : url.searchParams.get("firm");
    if (!firmId) return NextResponse.json({ error: "firm 파라미터가 필요합니다." }, { status: 400 });

    const supabase = createServiceClient();
    let query = supabase
        .from("portal_worklogs")
        .select("id, log_date, items, published, updated_at")
        .eq("firm_id", firmId)
        .order("log_date", { ascending: false })
        .limit(30);
    // 로펌에게는 공개된 일지만
    if (session.role === "firm") query = query.eq("published", true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ worklogs: data ?? [] });
}

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { firmId, logDate, rough, items, published } = body;
    if (!firmId || !logDate) return NextResponse.json({ error: "로펌과 날짜가 필요합니다." }, { status: 400 });

    // 1) AI 정돈만 요청 (저장 없이 미리보기)
    if (body.organize) {
        if (!rough?.trim()) return NextResponse.json({ error: "정리할 메모를 입력해 주세요." }, { status: 400 });
        try {
            const organized = await organizeWorklog(rough);
            return NextResponse.json({ items: organized });
        } catch {
            return NextResponse.json({ error: "AI 정리에 실패했습니다." }, { status: 500 });
        }
    }

    // 2) 저장(업서트)
    if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "업무 항목이 비어 있습니다." }, { status: 400 });
    }
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("portal_worklogs")
        .upsert(
            {
                firm_id: firmId,
                log_date: logDate,
                items,
                published: !!published,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "firm_id,log_date" }
        )
        .select("id, log_date, items, published, updated_at")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ worklog: data });
}
