"use client";

// 관리자 "맥디 자동 발행"(2026-10-11): 6곳 × 하루 2편이 검수 없이 올라간다. 무엇이 올라갔고 무엇이 왜 보류됐는지 본다.
// 발행은 크론(/api/cron/macdee-autopost)이 10분마다 한다. 여기 버튼은 그 변호사의 다음 한 단계를 바로 진행할 뿐이다.
import { useCallback, useEffect, useState } from "react";
import { Bot, ExternalLink, Loader2, RefreshCw } from "lucide-react";

type SlotState = "waiting" | "writing" | "reviewing" | "published" | "retrying" | "gave-up";
interface Slot { slot: number; opensAt: string; state: SlotState; attempts: number; title?: string; url?: string; problems?: string[]; error?: string }
interface Lawyer { key: string; label: string; found: boolean; paused: boolean; slots: Slot[] }
interface Recent { id: string; date: string; slot: number; attempt: number; key: string; lawyer: string; field: string; stage: string; title: string; url: string; problems: string[]; error: string; imageError: string; usd: number }

const STATE: Record<SlotState, { label: string; tone: string }> = {
    waiting: { label: "대기", tone: "bg-white/[0.06] text-white/50" },
    writing: { label: "원고 쓰는 중", tone: "bg-sky-500/15 text-sky-300" },
    reviewing: { label: "검수·발행 중", tone: "bg-violet-500/15 text-violet-300" },
    published: { label: "발행됨", tone: "bg-emerald-500/15 text-emerald-300" },
    retrying: { label: "다시 쓰기 대기", tone: "bg-amber-500/15 text-amber-300" },
    "gave-up": { label: "오늘 포기", tone: "bg-red-500/15 text-red-300" },
};
const STAGE: Record<string, string> = { writing: "쓰는 중", written: "검수 대기", reviewing: "검수 중", published: "발행", held: "보류", failed: "실패" };

export default function MacdeeAutopostPage() {
    const [today, setToday] = useState<{ date: string; time: string; lawyers: Lawyer[] } | null>(null);
    const [recent, setRecent] = useState<Recent[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState("");
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const r = await fetch("/api/admin/macdee-autopost", { cache: "no-store" });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "상태를 불러오지 못했습니다.");
            setToday(d.today); setRecent(d.recent || []);
        } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function step(key: string) {
        setRunning(key); setMessage(""); setError("");
        try {
            const r = await fetch("/api/admin/macdee-autopost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lawyer: key }) });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "실행하지 못했습니다.");
            const detail = d.detail || {};
            setMessage(d.did === "write" ? (detail.error ? `원고 실패: ${detail.error}` : `원고를 썼습니다: ${detail.title} — 한 번 더 누르면 검수·발행합니다.`)
                : d.did === "review-publish" ? (detail.published ? `발행했습니다: ${detail.published}` : `발행하지 않았습니다: ${detail.held || detail.failed || detail.retryReview}`)
                : d.did === "nothing-due" ? "오늘 이 변호사는 두 편을 모두 처리했습니다." : d.did);
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        finally { setRunning(""); }
    }

    const card = "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5";
    return (
        <div className="w-full min-w-0 max-w-[1100px] p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-[19px] font-semibold text-white"><Bot size={18} />맥디 자동 발행</h1>
                    <p className="mt-1 text-xs text-white/40">6곳 × 하루 2편 · 원고(Sonnet 5.5) → 자동 검수(광고 규정·사실 위험) → 생성 표지 → 공개 · 오전 09:00~12:20 / 오후 15:00~18:20 사이 변호사별로 40분 간격</p>
                </div>
                <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A2035] px-3 py-2 text-[13px] text-[#D1D5DE] disabled:opacity-40">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}새로고침
                </button>
            </div>

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            {message && <p className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80 break-all">{message}</p>}

            {today && (
                <section className={card}>
                    <p className="mb-3 text-sm font-semibold text-white">오늘 {today.date} · 지금 {today.time} KST</p>
                    <ul className="divide-y divide-white/[0.05]">
                        {today.lawyers.map((l) => (
                            <li key={l.key} className="flex flex-wrap items-start gap-3 py-3">
                                <div className="w-full min-w-0 sm:w-56">
                                    <p className="truncate text-sm text-white/85">{l.label}</p>
                                    {!l.found && <p className="text-xs text-red-300">맥디 블로그 변호사를 찾지 못함(roster slug 확인)</p>}
                                    {l.paused && <p className="text-xs text-amber-300">일시 정지</p>}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                    {l.slots.map((s) => (
                                        <div key={s.slot} className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                                            <span className="w-10 tabular-nums text-white/40">{s.opensAt}</span>
                                            <span className={`rounded-full px-2 py-0.5 ${STATE[s.state].tone}`}>{STATE[s.state].label}{s.attempts > 1 ? ` · ${s.attempts}차` : ""}</span>
                                            {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-sky-300 hover:underline">{s.title || "글 보기"}<ExternalLink size={11} /></a>
                                                : s.title && <span className="truncate text-white/60">{s.title}</span>}
                                            {s.error && s.state !== "published" && <span className="w-full truncate text-red-300/80" title={s.error}>{s.error}</span>}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => void step(l.key)} disabled={!!running || !l.found}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs text-white/70 disabled:opacity-40">
                                    {running === l.key ? <><Loader2 size={13} className="animate-spin" />진행 중(최대 10분)</> : "다음 단계 지금 진행"}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className={card}>
                <p className="mb-3 text-sm font-semibold text-white">최근 7일 · {recent.filter((r) => r.stage === "published").length}편 발행 · 추정 비용 ${recent.reduce((s, r) => s + r.usd, 0).toFixed(2)}(원고·검수, 이미지 제외)</p>
                <ul className="divide-y divide-white/[0.05]">
                    {recent.map((r) => (
                        <li key={r.id} className="py-2.5 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs tabular-nums text-white/40">{r.date} {r.slot === 0 ? "오전" : "오후"}{r.attempt > 1 ? ` ${r.attempt}차` : ""}</span>
                                <span className="text-xs text-white/50">{r.lawyer} · {r.field}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.stage === "published" ? "bg-emerald-500/15 text-emerald-300" : r.stage === "held" || r.stage === "failed" ? "bg-red-500/15 text-red-300" : "bg-white/[0.06] text-white/50"}`}>{STAGE[r.stage] || r.stage}</span>
                            </div>
                            {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-white/85 hover:underline">{r.title}<ExternalLink size={11} /></a>
                                : r.title && <p className="mt-1 text-white/60">{r.title}</p>}
                            {(r.error || r.imageError) && <p className="mt-1 text-xs text-red-300/80">{r.error || `표지 없이 발행: ${r.imageError}`}</p>}
                            {r.problems.length > 0 && <p className="mt-1 text-xs text-white/40">검수자 지적: {r.problems.join(" / ")}</p>}
                        </li>
                    ))}
                    {!recent.length && <li className="py-3 text-sm text-white/40">아직 기록이 없습니다.</li>}
                </ul>
            </section>
        </div>
    );
}
