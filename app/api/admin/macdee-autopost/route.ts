import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { defaultDeps, runAutopost } from "@/lib/macdee-autopost/run";
import { AUTOPOST_LAWYERS } from "@/lib/macdee-autopost/roster";

// 관리자 "맥디 자동 발행"(2026-10-11): 사람이 검수하지 않는 대신, 무엇이 올라갔고 무엇이 왜 보류됐는지 여기서 본다.
//   GET              → 오늘 칸별 상태 + 최근 7일 기록
//   POST {lawyer}    → 그 변호사 한 단계 바로 진행(쓰기 또는 검수·발행). 크론과 같은 규칙(하루 2편)이다.
export const maxDuration = 800;
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

interface Row {
    id: string;
    lawyer_id: string;
    file_url: string;
    status: string;
    created_at: string;
    structured_data: { autopost?: { stage?: string; contentId?: string; url?: string; problems?: string[]; error?: string; imageError?: string; field?: string; usage?: { usd: number | null }[] } } | null;
}

export async function GET(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const deps = defaultDeps();
        const today = await runAutopost(deps, { dryRun: true });
        const db = createServiceClient();
        const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data, error } = await db.from("uploads").select("id, lawyer_id, file_url, status, created_at, structured_data")
            .like("file_url", "autopost:%").gte("created_at", since).order("created_at", { ascending: false }).limit(300);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as Row[];
        const ids = rows.map((r) => r.structured_data?.autopost?.contentId).filter((id): id is string => !!id);
        const titles = new Map<string, string>();
        if (ids.length) {
            const { data: contents } = await db.from("contents").select("id, title").in("id", ids);
            for (const c of (contents ?? []) as { id: string; title: string }[]) titles.set(c.id, c.title);
        }
        const labels = new Map(today.lawyers.map((l) => [l.key, l.label]));
        const recent = rows.map((r) => {
            const [, key, date, slot, attempt] = r.file_url.split(":");
            const m = r.structured_data?.autopost || {};
            return {
                id: r.id, date, slot: Number(slot), attempt: Number(attempt), key, lawyer: labels.get(key) || key, field: m.field || "",
                stage: m.stage || r.status, title: m.contentId ? titles.get(m.contentId) || "" : "", url: m.url || "",
                problems: m.problems || [], error: m.error || "", imageError: m.imageError || "",
                usd: (m.usage || []).reduce((sum, u) => sum + (u.usd || 0), 0),
            };
        });
        return NextResponse.json({ today, recent }, { headers });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "상태를 읽지 못했습니다." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { lawyer?: string };
    if (!body.lawyer || !AUTOPOST_LAWYERS.some((l) => l.key === body.lawyer)) return NextResponse.json({ error: "변호사를 고르세요." }, { status: 400 });
    try {
        const result = await runAutopost(defaultDeps(), { onlyKey: body.lawyer });
        return NextResponse.json(result, { headers });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "실행하지 못했습니다." }, { status: 500 });
    }
}
