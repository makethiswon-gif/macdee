import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { loadSitemapGroups } from "@/lib/sitemap-groups";

// 배포 뒤 캐시 데우기(2026-11-12). 배포하면 변호사 블로그 글의 캐시(ISR)가 비어, 처음 여는 사람 — 대개 구글 봇 — 이
// 글마다 몇 초를 기다렸다. 서치콘솔 '발견됨 - 현재 색인이 생성되지 않음' 1,560건의 원인 후보.
// 15분마다 돌며, 지금 배포에서 사이트맵의 모든 주소를 한 번씩 열어 두었으면 바로 끝낸다(저장소 파일 하나 읽기).
// 아직이면 이어서 연다 — 한 번에 4분까지, 동시에 6개씩. 어디까지 열었는지는 Storage 비공개 버킷의 JSON 한 파일에 둔다.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUCKET = "site-ops";
const FILE = `${process.env.NODE_ENV === "production" ? "" : "dev/"}warm-blog.json`;
const BUDGET_MS = 240_000;
const CONCURRENCY = 6;

type State = {
    deploymentId: string;
    next: number;
    total: number;
    startedAt: string;
    finishedAt?: string;
    counts: Record<string, number>; // x-vercel-cache 값(MISS·HIT·STALE…)과 오류 수
};

function authorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function readState(): Promise<State | null> {
    const db = createServiceClient();
    const { data: bucket } = await db.storage.getBucket(BUCKET);
    if (!bucket) {
        const { error } = await db.storage.createBucket(BUCKET, { public: false });
        if (error && !/already exists/i.test(error.message)) throw new Error(`버킷을 만들지 못했습니다: ${error.message}`);
        return null;
    }
    const { data, error } = await db.storage.from(BUCKET).download(`${FILE}?t=${Date.now()}`);
    if (error || !data) return null; // 처음이거나 못 읽으면 처음부터 — 다시 여는 것뿐이라 손해가 없다
    try {
        return JSON.parse(await data.text()) as State;
    } catch {
        return null;
    }
}

async function writeState(state: State) {
    const { error } = await createServiceClient().storage.from(BUCKET)
        .upload(FILE, JSON.stringify(state), { contentType: "application/json", upsert: true, cacheControl: "0" });
    if (error) console.error("[warm-blog] 진행 상황을 저장하지 못했습니다:", error.message);
}

export async function GET(request: Request) {
    if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL;
    if (!deploymentId) return NextResponse.json({ skipped: "배포 ID 를 모름(로컬)" });

    const started = Date.now();
    // 손으로 돌릴 때 ?budget=초 로 짧게(최대 240초).
    const budgetParam = Number(new URL(request.url).searchParams.get("budget"));
    const budgetMs = budgetParam > 0 ? Math.min(budgetParam * 1000, BUDGET_MS) : BUDGET_MS;
    const saved = await readState();
    if (saved?.deploymentId === deploymentId && saved.finishedAt) {
        return NextResponse.json({ skipped: "이번 배포는 이미 데웠음", state: saved });
    }

    // 사이트맵과 같은 주소 목록. 순서를 고정해 다음 실행이 이어서 연다(그사이 새 글이 생기면 조금 겹치거나 빠질 뿐).
    const groups = await loadSitemapGroups();
    const urls = [...groups.keys()].sort().flatMap((name) => [...groups.get(name)!.keys()]);
    const state: State = saved?.deploymentId === deploymentId
        ? { ...saved, total: urls.length }
        : { deploymentId, next: 0, total: urls.length, startedAt: new Date().toISOString(), counts: {} };

    const bump = (key: string) => { state.counts[key] = (state.counts[key] || 0) + 1; };
    const worker = async () => {
        while (state.next < urls.length && Date.now() - started < budgetMs) {
            const url = urls[state.next++];
            try {
                const res = await fetch(url, {
                    headers: { "User-Agent": "macdee-cache-warmer/1.0" },
                    cache: "no-store",
                    signal: AbortSignal.timeout(25_000),
                });
                await res.arrayBuffer();
                bump(res.ok ? (res.headers.get("x-vercel-cache") || "NONE") : `HTTP ${res.status}`);
            } catch {
                bump("오류");
            }
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (state.next >= urls.length) state.finishedAt = new Date().toISOString();
    await writeState(state);
    return NextResponse.json({ state, seconds: Math.round((Date.now() - started) / 1000) });
}
