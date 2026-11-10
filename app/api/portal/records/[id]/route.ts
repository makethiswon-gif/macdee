import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { digestRecord } from "@/lib/portal-ai";
import { clip, notifyPortalInput } from "@/lib/portal-notify";
import { fileSizeLabel, listRecordFiles } from "@/lib/portal-files";

export const maxDuration = 120;

// 단건 조회 / 상태 변경(대표 확인) / AI 재정리

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const supabase = createServiceClient();
    const { data, error } = await supabase.from("portal_records").select("*").eq("id", id).single();
    if (error || !data) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
    if (session.role === "firm" && data.firm_id !== session.firmId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ record: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { action } = await request.json();

    const supabase = createServiceClient();
    const { data: record } = await supabase.from("portal_records").select("*").eq("id", id).single();
    if (!record) return NextResponse.json({ error: "자료를 찾을 수 없습니다." }, { status: 404 });
    if (session.role === "firm" && record.firm_id !== session.firmId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "confirm") {
        // 대표 확인 — 전략 수립에 반영됨 표시
        if (session.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        await supabase
            .from("portal_records")
            .update({ status: "확인됨", updated_at: new Date().toISOString() })
            .eq("id", id);
        return NextResponse.json({ ok: true, status: "확인됨" });
    }

    if (action === "uploaded") {
        // 브라우저가 원문 파일을 다 올린 뒤 부른다 — 실제로 올라간 파일을 확인하고 대표에게 알린다.
        const files = await listRecordFiles(record.firm_id, id);
        if (!files.length) return NextResponse.json({ error: "파일이 올라가지 않았습니다. 다시 시도해 주세요." }, { status: 400 });
        notifyPortalInput(session.role, { firmId: record.firm_id, kind: "원문 파일", title: `${record.type} · ${record.title}`, lines: [
            `유형: ${record.type}`, `제목: ${record.title}`, "", `파일 ${files.length}개:`, ...files.map((f) => `- ${f.name} (${fileSizeLabel(f.size)})`),
            ...(String(record.content).startsWith("[원문 파일]") ? [] : ["", clip(String(record.content))])] });
        return NextResponse.json({ ok: true, count: files.length });
    }

    if (action === "redigest") {
        if (String(record.content).startsWith("[원문 파일]")) {
            return NextResponse.json({ error: "원문 파일만 올린 자료라 AI가 정리할 메모가 없습니다. 파일은 그대로 보관돼 있습니다." }, { status: 400 });
        }
        try {
            const structured = await digestRecord({
                type: record.type,
                title: record.title,
                content: record.content,
            });
            await supabase
                .from("portal_records")
                .update({ structured, status: "정리됨", updated_at: new Date().toISOString() })
                .eq("id", id);
            return NextResponse.json({ ok: true, structured, status: "정리됨" });
        } catch {
            return NextResponse.json({ error: "AI 정리에 실패했습니다. 다시 시도해 주세요." }, { status: 500 });
        }
    }

    return NextResponse.json({ error: "알 수 없는 동작입니다." }, { status: 400 });
}
