import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { dailyAdvice, type RecordStructured } from "@/lib/portal-ai";

// 오늘의 AI 조언 — 자료·업무일지를 근거로 생성, 날짜당 1건 캐시(재생성 가능).

export const maxDuration = 180;

function kstToday(): string {
    // 서버 타임존과 무관하게 KST 기준 날짜
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

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
        .from("portal_advice")
        .select("id, advice_date, summary, recommendations, todos, created_at")
        .eq("firm_id", firmId)
        .order("advice_date", { ascending: false })
        .limit(14);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ advice: data ?? [], today: kstToday() });
}

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const firmId = session.role === "firm" ? session.firmId : body.firmId || url.searchParams.get("firm");
    if (!firmId) return NextResponse.json({ error: "로펌이 지정되지 않았습니다." }, { status: 400 });

    const supabase = createServiceClient();
    const { data: firm } = await supabase.from("portal_firms").select("name").eq("id", firmId).single();
    if (!firm) return NextResponse.json({ error: "로펌을 찾을 수 없습니다." }, { status: 404 });

    // 근거 수집 — 최근 자료 15건의 구조화 요약 + 최근 업무일지 7일
    const [{ data: records }, { data: worklogs }] = await Promise.all([
        supabase
            .from("portal_records")
            .select("type, title, structured, created_at")
            .eq("firm_id", firmId)
            .order("created_at", { ascending: false })
            .limit(15),
        supabase
            .from("portal_worklogs")
            .select("log_date, items")
            .eq("firm_id", firmId)
            .eq("published", true)
            .order("log_date", { ascending: false })
            .limit(7),
    ]);

    const recordLines = (records ?? [])
        .filter((r) => r.structured)
        .map((r) => {
            const s = r.structured as RecordStructured;
            return `[${r.type}] ${r.title} — ${s.요약} (분야: ${s.분야}, 시사점: ${(s.마케팅_시사점 ?? []).join("; ")})`;
        });
    const worklogLines = (worklogs ?? []).map(
        (w) =>
            `${w.log_date}: ${(w.items as { title: string }[]).map((i) => i.title).join(", ")}`
    );

    try {
        const today = kstToday();
        const result = await dailyAdvice({
            firmName: firm.name,
            date: today,
            records: recordLines,
            worklogs: worklogLines,
        });

        const { data: saved, error } = await supabase
            .from("portal_advice")
            .upsert(
                {
                    firm_id: firmId,
                    advice_date: today,
                    summary: result.summary,
                    recommendations: result.recommendations,
                    todos: result.todos.map((t) => ({ ...t, done: false })),
                },
                { onConflict: "firm_id,advice_date" }
            )
            .select("id, advice_date, summary, recommendations, todos, created_at")
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ advice: saved });
    } catch (e) {
        console.error("[portal] advice failed:", e);
        return NextResponse.json({ error: "조언 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
    }
}
