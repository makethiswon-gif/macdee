import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { digestRecord } from "@/lib/portal-ai";

// 로펌 자료(상담기록·수임내역·판결문) — 업로드 즉시 AI 가 구조화(DB화)한다.
// firm 은 자기 로펌 것만, admin 은 ?firm= 으로 모든 로펌.

export const maxDuration = 120; // AI 구조화 대기

function resolveFirmId(session: { role: string; firmId: string | null }, url: URL): string | null {
    if (session.role === "firm") return session.firmId;
    return url.searchParams.get("firm");
}

export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const firmId = resolveFirmId(session, new URL(request.url));
    if (!firmId) return NextResponse.json({ error: "firm 파라미터가 필요합니다." }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("portal_records")
        .select("id, type, title, structured, status, created_by, created_at")
        .eq("firm_id", firmId)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ records: data ?? [] });
}

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const url = new URL(request.url);
        const firmId = session.role === "firm" ? session.firmId : body.firmId || url.searchParams.get("firm");
        const { type, title, content } = body;

        if (!firmId) return NextResponse.json({ error: "로펌이 지정되지 않았습니다." }, { status: 400 });
        if (!["상담기록", "수임내역", "판결문", "기타"].includes(type)) {
            return NextResponse.json({ error: "자료 유형이 올바르지 않습니다." }, { status: 400 });
        }
        if (!title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
        }

        const supabase = createServiceClient();
        const { data: record, error } = await supabase
            .from("portal_records")
            .insert({
                firm_id: firmId,
                type,
                title: title.trim(),
                content: content.trim(),
                created_by: session.role,
            })
            .select("id")
            .single();
        if (error || !record) {
            return NextResponse.json({ error: error?.message ?? "저장 실패" }, { status: 500 });
        }

        // AI 구조화 — 실패해도 자료는 '대기' 로 남는다(재시도 가능)
        let structured = null;
        try {
            structured = await digestRecord({ type, title, content });
            await supabase
                .from("portal_records")
                .update({ structured, status: "정리됨", updated_at: new Date().toISOString() })
                .eq("id", record.id);
        } catch (e) {
            console.error("[portal] digest failed:", e);
        }

        return NextResponse.json({ id: record.id, structured, status: structured ? "정리됨" : "대기" });
    } catch {
        return NextResponse.json({ error: "업로드 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
