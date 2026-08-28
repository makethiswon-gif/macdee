import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";

// 로펌 ↔ 대표 메시지 스레드 (로펌당 하나의 타임라인).

export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const firmId = session.role === "firm" ? session.firmId : url.searchParams.get("firm");
    if (!firmId) return NextResponse.json({ error: "firm 파라미터가 필요합니다." }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("portal_messages")
        .select("id, author, body, created_at")
        .eq("firm_id", firmId)
        .order("created_at", { ascending: true })
        .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const firmId = session.role === "firm" ? session.firmId : body.firmId;
    if (!firmId) return NextResponse.json({ error: "로펌이 지정되지 않았습니다." }, { status: 400 });
    if (!body.body?.trim()) return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("portal_messages")
        .insert({ firm_id: firmId, author: session.role, body: body.body.trim() })
        .select("id, author, body, created_at")
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
}
