"use client";

import { useEffect, useRef, useState } from "react";

// 로펌 마케팅 구조 진단 요청 폼.
//
// 맥디의 "블로그 URL 넣으면 AI가 1분 만에 무료 진단" 과는 전혀 다른 경험이다.
// 여기서 받는 것은 즉석 자동 리포트가 아니라 사람이 보고 답하는 진단 요청이다.
// 문구도 그렇게 쓴다 — 자동·즉시·무료를 앞세우지 않는다.

const CHANNELS = [
    "네이버 파워링크",
    "네이버 블로그",
    "Google Ads",
    "홈페이지",
    "유튜브",
    "인스타그램",
    "지도 · 플레이스",
    "아직 없음",
];

const BUDGETS = [
    "집행 안 함",
    "월 300만원 미만",
    "월 300–700만원",
    "월 700–1,500만원",
    "월 1,500만원 이상",
    "밝히기 어려움",
];

const AGENCIES = ["없음 (직접 운영)", "1곳", "2곳", "3곳 이상", "정리 중"];

const TRACKING = [
    "어느 채널에서 상담이 왔는지 안다",
    "일부만 안다",
    "추적하지 않는다",
    "잘 모르겠다",
];

// 홈 #plans 카드에서 넘어온 ?plan= 값 → 폼 표기. 모르는 값은 무시한다.
const PLAN_LABELS: Record<string, string> = {
    standard: "STANDARD · 기본 운영",
    growth: "GROWTH · 분야 확장",
    "market-leader": "MARKET LEADER · 시장 선점",
};

type State = "idle" | "sending" | "done" | "error";

export default function DiagnoseForm() {
    const [state, setState] = useState<State>("idle");
    const [error, setError] = useState("");
    const [channels, setChannels] = useState<string[]>([]);
    const [ready, setReady] = useState(false);
    const received = useRef<HTMLDivElement>(null);
    useEffect(() => { if (state === "done") received.current?.focus(); }, [state]);

    // #plans 의 세 CTA 가 ?plan=standard|growth|market-leader 를 전달한다.
    // 첫 렌더는 서버와 동일(빈 값) — 마운트 후 쿼리를 읽어 반영한다.
    const [plan, setPlan] = useState("");
    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get("plan") ?? "";
        if (PLAN_LABELS[q]) setPlan(q);
        setReady(true);
    }, []);

    // Native disclosure has identical SSR/hydrated geometry and works without JS.

    const toggleChannel = (c: string) =>
        setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setState("sending");
        setError("");

        const fd = new FormData(e.currentTarget);
        const payload = Object.fromEntries(fd.entries());

        try {
            const res = await fetch("/api/renewal/diagnose", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, channels }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "요청을 보내지 못했습니다.");
            setState("done");
        } catch (err) {
            setError(err instanceof Error ? err.message : "요청을 보내지 못했습니다.");
            setState("error");
        }
    }

    if (state === "done") {
        return (
            <div ref={received} tabIndex={-1} role="status" className="py-16" style={{ borderTop: "1px solid var(--mt-line)" }}>
                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                    Received
                </p>
                <h2 className="mt-h2 mt-6">상담이 접수되었습니다.</h2>
                <div className="mt-10 max-w-[560px] flex flex-col gap-5">
                    <p className="mt-body">
                        담당자가 현재 마케팅 상태를 확인한 뒤 연락드리겠습니다.
                    </p>
                    <p className="mt-body">
                        광고·검색 데이터가 있으면 함께 확인합니다. 없어도 공개 정보로 진행할 수 있습니다.
                    </p>
                    <p className="text-[13px]" style={{ color: "var(--mt-gray-light)" }}>
                        회신 시간은 요청량에 따라 달라집니다. 급하시면 010-8935-3010으로 연락 주세요.
                    </p>
                </div>
            </div>
        );
    }

    const field =
        "w-full h-[52px] px-4 text-[15px] rounded-[2px] bg-[var(--mt-surface)] border border-[var(--mt-line-strong)] focus:border-[var(--mt-accent)] outline-none transition-colors";
    const area =
        "w-full px-4 py-3.5 text-[15px] leading-relaxed rounded-[2px] bg-[var(--mt-surface)] border border-[var(--mt-line-strong)] focus:border-[var(--mt-accent)] outline-none transition-colors";
    const label = "block text-[14px] font-medium mb-2.5";
    const legend = "mt-en mt-label mb-4 block";

    return (
        <form onSubmit={onSubmit} className="mt-k-form max-w-[760px]">
            {/* 허니팟 — 사람에게는 보이지 않는다 */}
            <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute w-px h-px -left-[9999px] opacity-0"
            />

            {/* 기본 정보 */}
            <fieldset className="pt-10" style={{ borderTop: "1px solid var(--mt-line)" }}>
                <legend className={legend} style={{ color: "var(--mt-gray)" }}>
                    01 — 기본 정보
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={label} htmlFor="firmName">
                            로펌 · 법률사무소명 <span style={{ color: "var(--mt-accent)" }}>*</span>
                        </label>
                        <input id="firmName" name="firmName" required className={field} />
                    </div>
                    <div>
                        <label className={label} htmlFor="contactName">
                            담당자 <span style={{ color: "var(--mt-accent)" }}>*</span>
                        </label>
                        <input id="contactName" name="contactName" required className={field} />
                    </div>
                    <div>
                        <label className={label} htmlFor="phone">
                            연락처 <span style={{ color: "var(--mt-accent)" }}>*</span>
                        </label>
                        <input id="phone" name="phone" required inputMode="tel" className={field} />
                    </div>
                    <div>
                        <label className={label} htmlFor="email">
                            이메일
                        </label>
                        <input id="email" name="email" type="email" className={field} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={label} htmlFor="plan">
                            관심 운영안 <span style={{ color: "var(--mt-gray)" }}>(선택)</span>
                        </label>
                        <select
                            id="plan"
                            name="plan"
                            className={field}
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                        >
                            <option value="">아직 정하지 않음</option>
                            {Object.entries(PLAN_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </fieldset>

            {/* 추가 정보(선택) — 모바일에서 접어 초기 길이를 줄인다.
                hidden 속성은 DOM 에서 제거하지 않으므로, 펼쳐 입력한 뒤 다시 접어도
                제출 시 FormData 에 그대로 담긴다. 미작성 시에도 기존처럼 제출된다. */}
            <details>
            <summary
                className="mt-12 w-full flex items-center justify-between gap-4 h-[56px] px-5 text-[14px] font-medium rounded-[2px] transition-colors"
                style={{ border: "1px solid var(--mt-line-strong)", color: "var(--mt-ink)" }}
            >
                <span>
                    추가 정보 <span style={{ color: "var(--mt-gray)" }}>(선택 · 아는 만큼만)</span>
                </span>
                <span
                    aria-hidden
                    className="text-[12px] transition-transform duration-200"
                    style={{ color: "var(--mt-gray)" }}
                >
                    ▾
                </span>
            </summary>

            <div id="optional-fields">
            {/* 사무소 성격 */}
            <fieldset className="mt-14 pt-10" style={{ borderTop: "1px solid var(--mt-line)" }}>
                <legend className={legend} style={{ color: "var(--mt-gray)" }}>
                    02 — 어떤 사건을 어디에서
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={label} htmlFor="practiceAreas">
                            핵심 사건 분야
                        </label>
                        <input
                            id="practiceAreas"
                            name="practiceAreas"
                            placeholder="예: 형사, 이혼, 교통사고"
                            className={field}
                        />
                    </div>
                    <div>
                        <label className={label} htmlFor="region">
                            주요 지역
                        </label>
                        <input id="region" name="region" placeholder="예: 서울 서초, 수원" className={field} />
                    </div>
                </div>
            </fieldset>

            {/* 현재 운영 */}
            <fieldset className="mt-14 pt-10" style={{ borderTop: "1px solid var(--mt-line)" }}>
                <legend className={legend} style={{ color: "var(--mt-gray)" }}>
                    03 — 지금 어떻게 하고 계신지
                </legend>

                <p className={label}>현재 운영 채널 (복수 선택)</p>
                <div className="flex flex-wrap gap-2 mb-8">
                    {CHANNELS.map((c) => {
                        const on = channels.includes(c);
                        return (
                            <button
                                type="button"
                                key={c}
                                onClick={() => toggleChannel(c)}
                                aria-pressed={on}
                                className="px-4 h-[40px] text-[13px] rounded-[2px] transition-colors"
                                style={{
                                    border: `1px solid ${on ? "var(--mt-accent)" : "var(--mt-line-strong)"}`,
                                    background: on ? "var(--mt-accent)" : "transparent",
                                    color: on ? "#fff" : "var(--mt-ink)",
                                }}
                            >
                                {c}
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={label} htmlFor="adBudget">
                            월 광고비 구간
                        </label>
                        <select id="adBudget" name="adBudget" className={field} defaultValue="">
                            <option value="">선택</option>
                            {BUDGETS.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={label} htmlFor="agencyCount">
                            사용 중인 대행사 수
                        </label>
                        <select id="agencyCount" name="agencyCount" className={field} defaultValue="">
                            <option value="">선택</option>
                            {AGENCIES.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={label} htmlFor="siteUrl">
                            홈페이지 주소
                        </label>
                        <input id="siteUrl" name="siteUrl" placeholder="https://" className={field} />
                    </div>
                    <div>
                        <label className={label} htmlFor="blogUrl">
                            블로그 주소
                        </label>
                        <input id="blogUrl" name="blogUrl" placeholder="https://" className={field} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={label} htmlFor="tracking">
                            상담이 어디에서 오는지 파악하고 계신가요
                        </label>
                        <select id="tracking" name="tracking" className={field} defaultValue="">
                            <option value="">선택</option>
                            {TRACKING.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </fieldset>

            {/* 문제 */}
            <fieldset className="mt-14 pt-10" style={{ borderTop: "1px solid var(--mt-line)" }}>
                <legend className={legend} style={{ color: "var(--mt-gray)" }}>
                    04 — 가장 걸리는 것
                </legend>
                <div className="flex flex-col gap-5">
                    <div>
                        <label className={label} htmlFor="biggestProblem">
                            지금 마케팅에서 가장 큰 문제는 무엇입니까
                        </label>
                        <textarea
                            id="biggestProblem"
                            name="biggestProblem"
                            rows={3}
                            placeholder="예: 광고비는 쓰는데 상담이 어디서 오는지 모르겠다"
                            className={area}
                        />
                    </div>
                    <div>
                        <label className={label} htmlFor="note">
                            그 밖에 알려주실 내용
                        </label>
                        <textarea id="note" name="note" rows={3} className={area} />
                    </div>
                </div>
            </fieldset>
            </div>
            </details>

            {error && (
                <p className="mt-8 text-[13.5px]" style={{ color: "#B4232A" }} role="alert">
                    {error}
                </p>
            )}

            <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-5">
                <button
                    type="submit"
                    disabled={!ready || state === "sending"}
                    className="inline-flex items-center justify-center gap-2 h-[54px] px-8 text-[14px] font-medium rounded-[2px] transition-opacity hover:opacity-85 disabled:opacity-50"
                    style={{ background: "var(--mt-ink)", color: "var(--mt-bg)" }}
                >
                    {state === "sending" ? "보내는 중…" : "상담 요청 보내기"}
                    {state !== "sending" && <span aria-hidden>→</span>}
                </button>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--mt-gray-light)" }}>
                    보내주신 정보는 진단과 회신 목적으로만 사용합니다.
                    <br className="hidden sm:block" />
                    광고 계정 접근 권한은 요청 단계에서 받지 않습니다.
                </p>
            </div>
        </form>
    );
}
