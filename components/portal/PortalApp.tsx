"use client";

// MAKETHIS1 Client Portal — 로펌과 대표의 업무 공간 (단일 클라이언트 앱).
//
//   로펌: 자료 업로드(→ AI 즉시 구조화) · 오늘의 조언 열람 · 업무일지 열람 · 메시지
//   대표: 모든 로펌 열람/확인 · 업무일지 작성(AI 정돈) · 로펌·접속코드 관리
//
// 디자인은 The Contract 언어 그대로: 잉크·세리프 헤드·모노 라벨·파란 실.
// 화려한 효과 없이 상태(핀·언더라인·점 스피너)로만 말한다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Logo from "../renewal/Logo";

/* ═══════════════ 타입 ═══════════════ */

export interface InitialSession {
    role: "admin" | "firm" | null;
    firm: { id: string; name: string } | null;
}

interface Firm {
    id: string;
    name: string;
    access_code?: string;
    memo?: string | null;
    created_at?: string;
}

interface Structured {
    요약?: string;
    분야?: string;
    사건유형?: string;
    유입경로?: string;
    키워드?: string[];
    마케팅_시사점?: string[];
    콘텐츠_소재?: string[];
}

interface PortalRecord {
    id: string;
    type: string;
    title: string;
    structured: Structured | null;
    status: "대기" | "정리됨" | "확인됨";
    created_by: string;
    created_at: string;
}

interface Advice {
    id: string;
    advice_date: string;
    summary: string;
    recommendations: { title: string; why: string; area: string }[];
    todos: { task: string; owner: string; priority: string; done?: boolean }[];
}

interface WorklogItem {
    area: string;
    title: string;
    detail: string;
}

interface Worklog {
    id: string;
    log_date: string;
    items: WorklogItem[];
    published: boolean;
    updated_at: string;
}

interface Message {
    id: string;
    author: "firm" | "admin";
    body: string;
    created_at: string;
}

type Tab = "today" | "records" | "advice" | "worklog" | "messages" | "firms";

/* ═══════════════ 공용 소품 ═══════════════ */

function Dots() {
    return (
        <span className="pt-dots" aria-label="처리 중">
            <span />
            <span />
            <span />
        </span>
    );
}

function StatusPill({ status }: { status: PortalRecord["status"] }) {
    const cls = status === "확인됨" ? "pt-pill-ink" : status === "정리됨" ? "pt-pill-blue" : "";
    return <span className={`pt-pill ${cls}`}>{status}</span>;
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1}.${d.getDate()}`;
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
    return data as T;
}

/* ═══════════════ 로그인 ═══════════════ */

function Login({ onLogin }: { onLogin: (firm: { id: string; name: string }) => void }) {
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const submit = async () => {
        if (!code.trim() || busy) return;
        setBusy(true);
        setError("");
        try {
            const data = await api<{ firm: { id: string; name: string } }>("/api/portal/auth", {
                method: "POST",
                body: JSON.stringify({ code }),
            });
            onLogin(data.firm);
        } catch (e) {
            setError(e instanceof Error ? e.message : "로그인에 실패했습니다.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-grid-bg flex-1 flex items-center justify-center px-6">
            <div className="w-full max-w-[400px]">
                <Logo size={18} />
                <p className="mt-en mt-label mt-3" style={{ color: "var(--mt-gray)" }}>
                    Client Portal
                </p>
                <h1 className="mt-serif text-[26px] font-semibold mt-8 leading-[1.4]">
                    로펌 전용 업무 공간입니다.
                </h1>
                <p className="mt-body mt-3 text-[13.5px]">
                    전달받은 접속 코드를 입력해 주세요.
                </p>

                <div className="mt-8 flex flex-col gap-3">
                    <input
                        className="pt-input mt-en"
                        style={{ letterSpacing: "0.08em" }}
                        placeholder="MT1-XXXX-XXXX"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        autoFocus
                    />
                    <button className="pt-btn" onClick={submit} disabled={busy}>
                        {busy ? <Dots /> : "입장하기 →"}
                    </button>
                    {error && (
                        <p className="text-[12.5px]" style={{ color: "var(--mt-stamp)" }} role="alert">
                            {error}
                        </p>
                    )}
                </div>

                <p className="mt-10 text-[11.5px]" style={{ color: "var(--mt-gray-light)" }}>
                    접속 코드가 없다면 담당자에게 문의해 주세요 · MAKETHIS1
                </p>
            </div>
        </div>
    );
}

/* ═══════════════ 자료 구조화 카드 ═══════════════ */

function StructuredView({ s }: { s: Structured }) {
    return (
        <div className="flex flex-col gap-4 text-[13px]">
            {s.요약 && <p style={{ color: "var(--mt-charcoal)" }}>{s.요약}</p>}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                {s.분야 && (
                    <span>
                        <span style={{ color: "var(--mt-gray)" }}>분야 </span>
                        <b className="font-medium" style={{ color: "var(--mt-ink)" }}>{s.분야}</b>
                    </span>
                )}
                {s.사건유형 && (
                    <span>
                        <span style={{ color: "var(--mt-gray)" }}>유형 </span>
                        <b className="font-medium" style={{ color: "var(--mt-ink)" }}>{s.사건유형}</b>
                    </span>
                )}
                {s.유입경로 && (
                    <span>
                        <span style={{ color: "var(--mt-gray)" }}>유입 </span>
                        <b className="font-medium" style={{ color: "var(--mt-ink)" }}>{s.유입경로}</b>
                    </span>
                )}
            </div>
            {!!s.키워드?.length && (
                <div className="flex flex-wrap gap-1.5">
                    {s.키워드.map((k) => (
                        <span key={k} className="pt-pill">{k}</span>
                    ))}
                </div>
            )}
            {!!s.마케팅_시사점?.length && (
                <div>
                    <p className="mt-en text-[9px] font-medium mb-1.5" style={{ color: "var(--mt-accent)" }}>
                        Marketing Signals
                    </p>
                    <ul className="flex flex-col gap-1">
                        {s.마케팅_시사점.map((m) => (
                            <li key={m} className="flex gap-2">
                                <span aria-hidden style={{ color: "var(--mt-accent)" }}>―</span>
                                <span>{m}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!!s.콘텐츠_소재?.length && (
                <div>
                    <p className="mt-en text-[9px] font-medium mb-1.5" style={{ color: "var(--mt-gray)" }}>
                        Content Ideas
                    </p>
                    <ul className="flex flex-col gap-1">
                        {s.콘텐츠_소재.map((m) => (
                            <li key={m} className="flex gap-2" style={{ color: "var(--mt-gray)" }}>
                                <span aria-hidden>·</span>
                                <span>{m}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ═══════════════ 메인 앱 ═══════════════ */

export default function PortalApp({ initial }: { initial: InitialSession }) {
    const [role, setRole] = useState(initial.role);
    const [firm, setFirm] = useState(initial.firm);

    // admin 의 현재 작업 대상 로펌
    const [firms, setFirms] = useState<Firm[]>([]);
    const [setupSql, setSetupSql] = useState<string | null>(null);
    const [activeFirmId, setActiveFirmId] = useState<string | null>(initial.firm?.id ?? null);

    const [tab, setTab] = useState<Tab>("today");
    const [toast, setToast] = useState("");

    const firmQuery = role === "admin" && activeFirmId ? `?firm=${activeFirmId}` : "";
    const activeFirmName =
        role === "firm" ? firm?.name : firms.find((f) => f.id === activeFirmId)?.name;

    const notify = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(""), 2600);
    }, []);

    /* ── admin: 로펌 목록 ── */
    const loadFirms = useCallback(async () => {
        try {
            const data = await api<{ firms?: Firm[]; setupRequired?: boolean; sql?: string }>(
                "/api/portal/firms"
            );
            if (data.setupRequired) {
                setSetupSql(data.sql ?? "");
                setTab("firms");
                return;
            }
            setFirms(data.firms ?? []);
            setSetupSql(null);
            if (!activeFirmId && data.firms?.length) setActiveFirmId(data.firms[0].id);
        } catch (e) {
            notify(e instanceof Error ? e.message : "로펌 목록을 불러오지 못했습니다.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFirmId]);

    useEffect(() => {
        if (role === "admin") loadFirms();
    }, [role, loadFirms]);

    const logout = async () => {
        await fetch("/api/portal/auth", { method: "DELETE" });
        setRole(null);
        setFirm(null);
    };

    if (!role) {
        return (
            <Login
                onLogin={(f) => {
                    setRole("firm");
                    setFirm(f);
                    setActiveFirmId(f.id);
                }}
            />
        );
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: "today", label: "오늘" },
        { key: "records", label: "자료" },
        { key: "advice", label: "AI 조언" },
        { key: "worklog", label: "업무일지" },
        { key: "messages", label: "메시지" },
        ...(role === "admin" ? [{ key: "firms" as Tab, label: "로펌 관리" }] : []),
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* ── 헤더 ── */}
            <header style={{ borderBottom: "1px solid var(--mt-line)", background: "var(--mt-bg)" }}>
                <div className="max-w-[1080px] mx-auto px-6">
                    <div className="flex items-center justify-between h-[64px]">
                        <div className="flex items-baseline gap-3">
                            <Logo size={15} />
                            <span className="mt-en text-[9.5px] font-medium" style={{ color: "var(--mt-gray)", letterSpacing: "0.16em" }}>
                                Client Portal
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {role === "admin" && firms.length > 0 && (
                                <select
                                    className="pt-select"
                                    style={{ width: "auto", padding: "7px 10px", fontSize: 13 }}
                                    value={activeFirmId ?? ""}
                                    onChange={(e) => setActiveFirmId(e.target.value)}
                                    aria-label="작업할 로펌 선택"
                                >
                                    {firms.map((f) => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            )}
                            <span className="pt-pill pt-pill-blue">{role === "admin" ? "MAKETHIS1" : firm?.name}</span>
                            {role === "firm" && (
                                <button className="text-[12px] hover:opacity-60" style={{ color: "var(--mt-gray)" }} onClick={logout}>
                                    나가기
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 탭 */}
                    <nav className="flex gap-7" role="tablist" style={{ borderTop: "1px solid var(--mt-line)" }}>
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                role="tab"
                                aria-selected={tab === t.key}
                                className="pt-tab"
                                onClick={() => setTab(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {/* ── 본문 ── */}
            <main className="flex-1 w-full max-w-[1080px] mx-auto px-6 py-10">
                {role === "admin" && !activeFirmId && tab !== "firms" ? (
                    <p className="mt-body">먼저 [로펌 관리]에서 로펌을 등록해 주세요.</p>
                ) : (
                    <>
                        {tab === "today" && (
                            <TodayTab key={activeFirmId} role={role} firmQuery={firmQuery} firmName={activeFirmName} activeFirmId={activeFirmId} notify={notify} goTab={setTab} />
                        )}
                        {tab === "records" && (
                            <RecordsTab key={activeFirmId} role={role} firmQuery={firmQuery} activeFirmId={activeFirmId} notify={notify} />
                        )}
                        {tab === "advice" && (
                            <AdviceTab key={activeFirmId} role={role} firmQuery={firmQuery} activeFirmId={activeFirmId} notify={notify} />
                        )}
                        {tab === "worklog" && (
                            <WorklogTab key={activeFirmId} role={role} firmQuery={firmQuery} activeFirmId={activeFirmId} notify={notify} />
                        )}
                        {tab === "messages" && (
                            <MessagesTab key={activeFirmId} role={role} firmQuery={firmQuery} activeFirmId={activeFirmId} />
                        )}
                        {tab === "firms" && role === "admin" && (
                            <FirmsTab firms={firms} setupSql={setupSql} reload={loadFirms} notify={notify} />
                        )}
                    </>
                )}
            </main>

            {toast && (
                <div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 text-[13px] rounded-[2px] z-50"
                    style={{ background: "var(--mt-ink)", color: "var(--mt-bg)" }}
                    role="status"
                >
                    {toast}
                </div>
            )}
        </div>
    );
}

/* ═══════════════ 오늘 ═══════════════ */

function TodayTab({
    role,
    firmQuery,
    firmName,
    activeFirmId,
    notify,
    goTab,
}: {
    role: "admin" | "firm";
    firmQuery: string;
    firmName?: string;
    activeFirmId: string | null;
    notify: (m: string) => void;
    goTab: (t: Tab) => void;
}) {
    const [advice, setAdvice] = useState<Advice | null>(null);
    const [records, setRecords] = useState<PortalRecord[]>([]);
    const [worklog, setWorklog] = useState<Worklog | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [a, r, w] = await Promise.all([
                api<{ advice: Advice[]; today: string }>(`/api/portal/advice${firmQuery}`),
                api<{ records: PortalRecord[] }>(`/api/portal/records${firmQuery}`),
                api<{ worklogs: Worklog[] }>(`/api/portal/worklog${firmQuery}`),
            ]);
            setAdvice(a.advice.find((x) => x.advice_date === a.today) ?? a.advice[0] ?? null);
            setRecords(r.records.slice(0, 5));
            setWorklog(w.worklogs[0] ?? null);
        } catch {
            // 개별 카드에서 비어있음 표시
        } finally {
            setLoading(false);
        }
    }, [firmQuery]);

    useEffect(() => {
        load();
    }, [load]);

    const generate = async () => {
        setGenerating(true);
        try {
            const data = await api<{ advice: Advice }>(`/api/portal/advice${firmQuery}`, {
                method: "POST",
                body: JSON.stringify({ firmId: activeFirmId }),
            });
            setAdvice(data.advice);
            notify("오늘의 조언이 준비됐습니다.");
        } catch (e) {
            notify(e instanceof Error ? e.message : "조언 생성 실패");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div>
            <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>
                {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
            </p>
            <h1 className="mt-serif text-[26px] md:text-[30px] font-semibold mt-3 leading-[1.35]">
                {firmName ?? "포털"} 마케팅 현황.
            </h1>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
                {/* 오늘의 조언 */}
                <section className="pt-card p-7">
                    <div className="flex items-center justify-between gap-4">
                        <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>
                            Today&apos;s Advice
                        </p>
                        <button className="pt-btn pt-btn-ghost" style={{ height: 36, fontSize: 12.5 }} onClick={generate} disabled={generating}>
                            {generating ? <Dots /> : advice?.advice_date === todayStr() ? "다시 생성" : "오늘 조언 생성"}
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-10 text-center"><Dots /></div>
                    ) : advice ? (
                        <div className="mt-5">
                            <p className="mt-num text-[11px] mb-3" style={{ color: "var(--mt-gray-light)" }}>
                                {advice.advice_date}
                            </p>
                            <p className="text-[15px] leading-[1.8] font-medium" style={{ color: "var(--mt-ink)" }}>
                                {advice.summary}
                            </p>

                            {!!advice.recommendations?.length && (
                                <ul className="mt-6 flex flex-col">
                                    {advice.recommendations.map((r) => (
                                        <li key={r.title} className="py-3.5" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                            <div className="flex items-center gap-2.5">
                                                <span className="pt-pill pt-pill-blue">{r.area}</span>
                                                <span className="text-[14px] font-medium" style={{ color: "var(--mt-ink)" }}>{r.title}</span>
                                            </div>
                                            <p className="mt-1.5 text-[13px]" style={{ color: "var(--mt-gray)" }}>{r.why}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {!!advice.todos?.length && (
                                <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--mt-line-strong)" }}>
                                    <p className="mt-en text-[9px] font-medium mb-3" style={{ color: "var(--mt-gray)" }}>
                                        To-do
                                    </p>
                                    <ul className="flex flex-col gap-2">
                                        {advice.todos.map((t) => (
                                            <li key={t.task} className="flex items-center gap-2.5 text-[13.5px]">
                                                <span className={`pt-pill ${t.owner === "로펌" ? "pt-pill-ink" : ""}`}>{t.owner}</span>
                                                <span style={{ color: "var(--mt-charcoal)" }}>{t.task}</span>
                                                {t.priority === "높음" && (
                                                    <span className="mt-en text-[9px]" style={{ color: "var(--mt-stamp)" }}>HIGH</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="mt-body mt-6 text-[13.5px]">
                            아직 조언이 없습니다. 자료가 쌓일수록 조언이 정확해집니다 — 먼저 자료를
                            올려두고 [오늘 조언 생성]을 눌러 보세요.
                        </p>
                    )}
                </section>

                <div className="flex flex-col gap-6">
                    {/* 최근 자료 */}
                    <section className="pt-card p-7">
                        <div className="flex items-center justify-between">
                            <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>Recent Records</p>
                            <button className="text-[12px] hover:opacity-60" style={{ color: "var(--mt-accent)" }} onClick={() => goTab("records")}>
                                전체 →
                            </button>
                        </div>
                        {records.length ? (
                            <ul className="mt-4">
                                {records.map((r) => (
                                    <li key={r.id} className="py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                        <div className="min-w-0">
                                            <p className="text-[13.5px] font-medium truncate" style={{ color: "var(--mt-ink)" }}>{r.title}</p>
                                            <p className="text-[11px] mt-0.5" style={{ color: "var(--mt-gray-light)" }}>{r.type} · {fmtDate(r.created_at)}</p>
                                        </div>
                                        <StatusPill status={r.status} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-body mt-4 text-[13px]">
                                상담기록·수임내역·판결문을 올리면 AI가 바로 정리해 둡니다.
                            </p>
                        )}
                        <button className="pt-btn w-full mt-5" onClick={() => goTab("records")}>
                            자료 올리기 →
                        </button>
                    </section>

                    {/* 최근 업무일지 */}
                    <section className="pt-card p-7">
                        <div className="flex items-center justify-between">
                            <p className="mt-en mt-label" style={{ color: "var(--mt-gray)" }}>Latest Worklog</p>
                            <button className="text-[12px] hover:opacity-60" style={{ color: "var(--mt-accent)" }} onClick={() => goTab("worklog")}>
                                전체 →
                            </button>
                        </div>
                        {worklog ? (
                            <div className="mt-4">
                                <p className="mt-num text-[11px]" style={{ color: "var(--mt-gray-light)" }}>{worklog.log_date}</p>
                                <ul className="mt-2 flex flex-col gap-1.5">
                                    {worklog.items.slice(0, 4).map((it) => (
                                        <li key={it.title} className="flex items-center gap-2 text-[13px]">
                                            <span className="pt-pill">{it.area}</span>
                                            <span style={{ color: "var(--mt-charcoal)" }}>{it.title}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="mt-body mt-4 text-[13px]">
                                {role === "admin" ? "오늘 한 일을 기록해 로펌에 공유하세요." : "MAKETHIS1 이 진행한 작업이 여기에 공유됩니다."}
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════ 자료 ═══════════════ */

function RecordsTab({
    role,
    firmQuery,
    activeFirmId,
    notify,
}: {
    role: "admin" | "firm";
    firmQuery: string;
    activeFirmId: string | null;
    notify: (m: string) => void;
}) {
    const [records, setRecords] = useState<PortalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState<string | null>(null);

    const [type, setType] = useState("상담기록");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [uploading, setUploading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api<{ records: PortalRecord[] }>(`/api/portal/records${firmQuery}`);
            setRecords(data.records);
        } catch (e) {
            notify(e instanceof Error ? e.message : "자료를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [firmQuery, notify]);

    useEffect(() => {
        load();
    }, [load]);

    const upload = async () => {
        if (!title.trim() || !content.trim() || uploading) return;
        setUploading(true);
        try {
            await api(`/api/portal/records${firmQuery}`, {
                method: "POST",
                body: JSON.stringify({ type, title, content, firmId: activeFirmId }),
            });
            setTitle("");
            setContent("");
            notify("업로드 완료 — AI가 정리해 두었습니다.");
            load();
        } catch (e) {
            notify(e instanceof Error ? e.message : "업로드 실패");
        } finally {
            setUploading(false);
        }
    };

    const patch = async (id: string, action: "confirm" | "redigest") => {
        try {
            await api(`/api/portal/records/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
            notify(action === "confirm" ? "확인 처리했습니다." : "다시 정리했습니다.");
            load();
        } catch (e) {
            notify(e instanceof Error ? e.message : "처리 실패");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8 items-start">
            {/* 업로드 */}
            <section className="pt-card p-7">
                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>New Record</p>
                <h2 className="mt-serif text-[19px] font-semibold mt-3">자료를 올리면 AI가 바로 정리합니다.</h2>
                <p className="mt-body mt-2 text-[12.5px]">
                    상담기록, 수임내역, 판결문을 붙여넣으세요. 개인정보는 정리 과정에서 제외됩니다.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                    <select className="pt-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="자료 유형">
                        {["상담기록", "수임내역", "판결문", "기타"].map((t) => (
                            <option key={t}>{t}</option>
                        ))}
                    </select>
                    <input className="pt-input" placeholder="제목 (예: 3월 이혼 상담 기록 12건)" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <textarea className="pt-textarea" placeholder="내용을 붙여넣으세요" value={content} onChange={(e) => setContent(e.target.value)} />
                    <button className="pt-btn" onClick={upload} disabled={uploading || !title.trim() || !content.trim()}>
                        {uploading ? (
                            <>
                                <Dots /> AI 정리 중…
                            </>
                        ) : (
                            "업로드 + AI 정리 →"
                        )}
                    </button>
                </div>
            </section>

            {/* 목록 */}
            <section>
                <p className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>
                    Records {records.length > 0 && <span className="mt-num">({records.length})</span>}
                </p>
                {loading ? (
                    <div className="py-16 text-center"><Dots /></div>
                ) : records.length === 0 ? (
                    <p className="mt-body text-[13.5px]">아직 자료가 없습니다.</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {records.map((r) => (
                            <li key={r.id} className="pt-card">
                                <button
                                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                                    onClick={() => setOpen(open === r.id ? null : r.id)}
                                    aria-expanded={open === r.id}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2.5">
                                            <span className="pt-pill">{r.type}</span>
                                            <span className="text-[14px] font-medium truncate" style={{ color: "var(--mt-ink)" }}>{r.title}</span>
                                        </div>
                                        <p className="text-[11px] mt-1.5" style={{ color: "var(--mt-gray-light)" }}>
                                            {fmtDate(r.created_at)} · {r.created_by === "admin" ? "MAKETHIS1" : "로펌"} 등록
                                        </p>
                                    </div>
                                    <StatusPill status={r.status} />
                                </button>

                                {open === r.id && (
                                    <div className="px-5 pb-5 pt-1" style={{ borderTop: "1px solid var(--mt-line)" }}>
                                        {r.structured ? (
                                            <div className="pt-4">
                                                <StructuredView s={r.structured} />
                                            </div>
                                        ) : (
                                            <p className="mt-body pt-4 text-[13px]">AI 정리가 아직 없습니다.</p>
                                        )}
                                        <div className="mt-4 flex gap-2">
                                            {role === "admin" && r.status !== "확인됨" && (
                                                <button className="pt-btn" style={{ height: 36, fontSize: 12.5 }} onClick={() => patch(r.id, "confirm")}>
                                                    확인 — 전략에 반영
                                                </button>
                                            )}
                                            <button className="pt-btn pt-btn-ghost" style={{ height: 36, fontSize: 12.5 }} onClick={() => patch(r.id, "redigest")}>
                                                AI 다시 정리
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

/* ═══════════════ AI 조언 ═══════════════ */

function AdviceTab({
    role: _role,
    firmQuery,
    activeFirmId,
    notify,
}: {
    role: "admin" | "firm";
    firmQuery: string;
    activeFirmId: string | null;
    notify: (m: string) => void;
}) {
    const [list, setList] = useState<Advice[]>([]);
    const [today, setToday] = useState("");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api<{ advice: Advice[]; today: string }>(`/api/portal/advice${firmQuery}`);
            setList(data.advice);
            setToday(data.today);
        } catch (e) {
            notify(e instanceof Error ? e.message : "조언을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [firmQuery, notify]);

    useEffect(() => {
        load();
    }, [load]);

    const generate = async () => {
        setGenerating(true);
        try {
            await api(`/api/portal/advice${firmQuery}`, { method: "POST", body: JSON.stringify({ firmId: activeFirmId }) });
            notify("오늘의 조언이 준비됐습니다.");
            load();
        } catch (e) {
            notify(e instanceof Error ? e.message : "조언 생성 실패");
        } finally {
            setGenerating(false);
        }
    };

    const hasToday = list.some((a) => a.advice_date === today);

    return (
        <div className="max-w-[760px]">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>AI Advice</p>
                    <h2 className="mt-serif text-[22px] font-semibold mt-2">자료가 전략이 되는 곳.</h2>
                </div>
                <button className="pt-btn" onClick={generate} disabled={generating}>
                    {generating ? <Dots /> : hasToday ? "오늘 조언 다시 생성" : "오늘 조언 생성 →"}
                </button>
            </div>

            {loading ? (
                <div className="py-16 text-center"><Dots /></div>
            ) : list.length === 0 ? (
                <p className="mt-body mt-8 text-[13.5px]">
                    아직 조언이 없습니다. 자료를 먼저 올려두면 근거 있는 조언이 만들어집니다.
                </p>
            ) : (
                <div className="mt-8 relative pl-6">
                    <span aria-hidden className="absolute left-[3px] top-2 bottom-2 w-px" style={{ background: "var(--mt-accent)", opacity: 0.4 }} />
                    <ul className="flex flex-col gap-6">
                        {list.map((a) => (
                            <li key={a.id} className="relative">
                                <span aria-hidden className="absolute -left-6 top-[7px] w-[7px] h-[7px] rounded-full" style={{ background: "var(--mt-accent)" }} />
                                <div className="pt-card p-6">
                                    <p className="mt-num text-[11px]" style={{ color: "var(--mt-gray-light)" }}>
                                        {a.advice_date}
                                        {a.advice_date === today && (
                                            <span className="pt-pill pt-pill-blue ml-2">Today</span>
                                        )}
                                    </p>
                                    <p className="mt-3 text-[14.5px] leading-[1.8] font-medium" style={{ color: "var(--mt-ink)" }}>{a.summary}</p>
                                    {!!a.recommendations?.length && (
                                        <ul className="mt-4 flex flex-col gap-2.5">
                                            {a.recommendations.map((r) => (
                                                <li key={r.title} className="text-[13px]">
                                                    <span className="pt-pill pt-pill-blue mr-2">{r.area}</span>
                                                    <span className="font-medium" style={{ color: "var(--mt-ink)" }}>{r.title}</span>
                                                    <span style={{ color: "var(--mt-gray)" }}> — {r.why}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {!!a.todos?.length && (
                                        <ul className="mt-4 flex flex-wrap gap-2">
                                            {a.todos.map((t) => (
                                                <li key={t.task} className="pt-pill">
                                                    {t.owner} · {t.task}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ═══════════════ 업무일지 ═══════════════ */

function WorklogTab({
    role,
    firmQuery,
    activeFirmId,
    notify,
}: {
    role: "admin" | "firm";
    firmQuery: string;
    activeFirmId: string | null;
    notify: (m: string) => void;
}) {
    const [logs, setLogs] = useState<Worklog[]>([]);
    const [loading, setLoading] = useState(true);

    // admin 작성 상태
    const [logDate, setLogDate] = useState(todayStr());
    const [rough, setRough] = useState("");
    const [items, setItems] = useState<WorklogItem[]>([]);
    const [organizing, setOrganizing] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api<{ worklogs: Worklog[] }>(`/api/portal/worklog${firmQuery}`);
            setLogs(data.worklogs);
        } catch (e) {
            notify(e instanceof Error ? e.message : "업무일지를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [firmQuery, notify]);

    useEffect(() => {
        load();
    }, [load]);

    const organize = async () => {
        if (!rough.trim() || organizing) return;
        setOrganizing(true);
        try {
            const data = await api<{ items: WorklogItem[] }>(`/api/portal/worklog`, {
                method: "POST",
                body: JSON.stringify({ organize: true, firmId: activeFirmId, logDate, rough }),
            });
            setItems(data.items);
            notify("AI 정돈 완료 — 확인 후 공개하세요.");
        } catch (e) {
            notify(e instanceof Error ? e.message : "AI 정리 실패");
        } finally {
            setOrganizing(false);
        }
    };

    const save = async (published: boolean) => {
        if (!items.length || saving) return;
        setSaving(true);
        try {
            await api(`/api/portal/worklog`, {
                method: "POST",
                body: JSON.stringify({ firmId: activeFirmId, logDate, items, published }),
            });
            notify(published ? "로펌에 공개했습니다." : "임시 저장했습니다.");
            setRough("");
            setItems([]);
            load();
        } catch (e) {
            notify(e instanceof Error ? e.message : "저장 실패");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
            {role === "admin" && (
                <section className="pt-card p-7">
                    <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>Write Worklog</p>
                    <h2 className="mt-serif text-[19px] font-semibold mt-3">오늘 한 일, 메모만 던지세요.</h2>
                    <p className="mt-body mt-2 text-[12.5px]">AI가 로펌 대표가 읽기 좋은 형태로 정돈합니다.</p>

                    <div className="mt-6 flex flex-col gap-3">
                        <input type="date" className="pt-input" value={logDate} onChange={(e) => setLogDate(e.target.value)} aria-label="날짜" />
                        <textarea
                            className="pt-textarea"
                            placeholder={"예)\n파워링크 이혼 키워드 입찰 조정, cpc 12% 절감\n블로그 상속 글 2건 발행\n홈페이지 회생 랜딩 초안"}
                            value={rough}
                            onChange={(e) => setRough(e.target.value)}
                        />
                        <button className="pt-btn pt-btn-ghost" onClick={organize} disabled={organizing || !rough.trim()}>
                            {organizing ? <Dots /> : "AI로 정돈하기"}
                        </button>

                        {items.length > 0 && (
                            <>
                                <ul className="flex flex-col gap-2 mt-2">
                                    {items.map((it, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-[13px] p-3 rounded-[2px]" style={{ border: "1px solid var(--mt-line)" }}>
                                            <span className="pt-pill pt-pill-blue shrink-0">{it.area}</span>
                                            <div className="min-w-0">
                                                <p className="font-medium" style={{ color: "var(--mt-ink)" }}>{it.title}</p>
                                                <p className="mt-0.5" style={{ color: "var(--mt-gray)" }}>{it.detail}</p>
                                            </div>
                                            <button
                                                className="ml-auto text-[11px] hover:opacity-60 shrink-0"
                                                style={{ color: "var(--mt-gray-light)" }}
                                                onClick={() => setItems(items.filter((_, j) => j !== i))}
                                                aria-label="항목 삭제"
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2">
                                    <button className="pt-btn flex-1" onClick={() => save(true)} disabled={saving}>
                                        {saving ? <Dots /> : "로펌에 공개 →"}
                                    </button>
                                    <button className="pt-btn pt-btn-ghost" onClick={() => save(false)} disabled={saving}>
                                        임시 저장
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            )}

            <section className={role === "firm" ? "lg:col-span-2 max-w-[720px]" : ""}>
                <p className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>Worklog</p>
                {loading ? (
                    <div className="py-16 text-center"><Dots /></div>
                ) : logs.length === 0 ? (
                    <p className="mt-body text-[13.5px]">
                        {role === "admin" ? "아직 기록이 없습니다." : "공유된 업무일지가 아직 없습니다."}
                    </p>
                ) : (
                    <div className="relative pl-6">
                        <span aria-hidden className="absolute left-[3px] top-2 bottom-2 w-px" style={{ background: "var(--mt-accent)", opacity: 0.4 }} />
                        <ul className="flex flex-col gap-5">
                            {logs.map((w) => (
                                <li key={w.id} className="relative">
                                    <span aria-hidden className="absolute -left-6 top-[7px] w-[7px] h-[7px] rounded-full" style={{ background: "var(--mt-accent)" }} />
                                    <div className="pt-card p-6">
                                        <p className="mt-num text-[11px] flex items-center gap-2" style={{ color: "var(--mt-gray-light)" }}>
                                            {w.log_date}
                                            {role === "admin" && !w.published && <span className="pt-pill">비공개</span>}
                                        </p>
                                        <ul className="mt-3 flex flex-col gap-2.5">
                                            {w.items.map((it, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-[13.5px]">
                                                    <span className="pt-pill shrink-0">{it.area}</span>
                                                    <div>
                                                        <p className="font-medium" style={{ color: "var(--mt-ink)" }}>{it.title}</p>
                                                        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--mt-gray)" }}>{it.detail}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </div>
    );
}

/* ═══════════════ 메시지 ═══════════════ */

function MessagesTab({
    role,
    firmQuery,
    activeFirmId,
}: {
    role: "admin" | "firm";
    firmQuery: string;
    activeFirmId: string | null;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const data = await api<{ messages: Message[] }>(`/api/portal/messages${firmQuery}`);
            setMessages(data.messages);
        } catch {
            /* 조용히 */
        }
    }, [firmQuery]);

    useEffect(() => {
        load();
        const t = setInterval(load, 20000);
        return () => clearInterval(t);
    }, [load]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end" });
    }, [messages.length]);

    const send = async () => {
        if (!body.trim() || sending) return;
        setSending(true);
        try {
            await api(`/api/portal/messages`, {
                method: "POST",
                body: JSON.stringify({ body, firmId: activeFirmId }),
            });
            setBody("");
            load();
        } finally {
            setSending(false);
        }
    };

    const mine = role;

    return (
        <div className="max-w-[680px] mx-auto flex flex-col" style={{ minHeight: "60vh" }}>
            <div className="flex-1 flex flex-col gap-3 pb-6">
                {messages.length === 0 && (
                    <p className="mt-body text-[13.5px] text-center py-12">
                        첫 메시지를 남겨 보세요. 급한 일은 전화가 빠릅니다.
                    </p>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.author === mine ? "justify-end" : "justify-start"}`}>
                        <div className={`pt-msg ${m.author === "admin" ? "pt-msg-admin" : ""}`}>
                            <p className="mt-en text-[8.5px] font-medium mb-1" style={{ color: m.author === "admin" ? "var(--mt-accent)" : "var(--mt-gray-light)" }}>
                                {m.author === "admin" ? "MAKETHIS1" : "로펌"} · {fmtDate(m.created_at)}
                            </p>
                            <p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            <div className="flex gap-2 sticky bottom-6">
                <input
                    className="pt-input"
                    placeholder="메시지 입력…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                />
                <button className="pt-btn shrink-0" onClick={send} disabled={sending || !body.trim()}>
                    보내기
                </button>
            </div>
        </div>
    );
}

/* ═══════════════ 로펌 관리 (admin) ═══════════════ */

function FirmsTab({
    firms,
    setupSql,
    reload,
    notify,
}: {
    firms: Firm[];
    setupSql: string | null;
    reload: () => void;
    notify: (m: string) => void;
}) {
    const [name, setName] = useState("");
    const [memo, setMemo] = useState("");
    const [busy, setBusy] = useState(false);

    const create = async () => {
        if (!name.trim() || busy) return;
        setBusy(true);
        try {
            const data = await api<{ firm?: Firm; setupRequired?: boolean }>(`/api/portal/firms`, {
                method: "POST",
                body: JSON.stringify({ name, memo }),
            });
            if (data.setupRequired) {
                notify("먼저 아래 SQL로 테이블을 생성해 주세요.");
                return;
            }
            setName("");
            setMemo("");
            notify(`등록 완료 — 접속 코드: ${data.firm?.access_code}`);
            reload();
        } catch (e) {
            notify(e instanceof Error ? e.message : "등록 실패");
        } finally {
            setBusy(false);
        }
    };

    const copy = (text: string) => {
        navigator.clipboard?.writeText(text).then(() => notify("복사했습니다."));
    };

    if (setupSql) {
        return (
            <div className="max-w-[760px]">
                <p className="mt-en mt-label" style={{ color: "var(--mt-stamp)" }}>Setup Required</p>
                <h2 className="mt-serif text-[22px] font-semibold mt-3">포털 테이블이 아직 없습니다.</h2>
                <p className="mt-body mt-3 text-[13.5px] max-w-[60ch]">
                    Supabase 대시보드 → SQL Editor 에서 아래 SQL 을 한 번 실행하면 준비가 끝납니다.
                    (supabase/migrations/013_client_portal.sql 과 동일한 내용입니다)
                </p>
                <div className="mt-5">
                    <button className="pt-btn mb-3" onClick={() => copy(setupSql)}>
                        SQL 복사
                    </button>
                    <pre className="pt-code">{setupSql}</pre>
                </div>
                <button className="pt-btn pt-btn-ghost mt-5" onClick={reload}>
                    실행했어요 — 다시 확인
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8 items-start">
            <section className="pt-card p-7">
                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>New Firm</p>
                <h2 className="mt-serif text-[19px] font-semibold mt-3">로펌을 등록하고 코드를 전달하세요.</h2>
                <div className="mt-6 flex flex-col gap-3">
                    <input className="pt-input" placeholder="로펌 이름" value={name} onChange={(e) => setName(e.target.value)} />
                    <input className="pt-input" placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} />
                    <button className="pt-btn" onClick={create} disabled={busy || !name.trim()}>
                        {busy ? <Dots /> : "등록 + 접속 코드 발급 →"}
                    </button>
                </div>
            </section>

            <section>
                <p className="mt-en mt-label mb-4" style={{ color: "var(--mt-gray)" }}>
                    Firms {firms.length > 0 && <span className="mt-num">({firms.length})</span>}
                </p>
                {firms.length === 0 ? (
                    <p className="mt-body text-[13.5px]">등록된 로펌이 없습니다.</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {firms.map((f) => (
                            <li key={f.id} className="pt-card px-5 py-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[14.5px] font-medium" style={{ color: "var(--mt-ink)" }}>{f.name}</p>
                                    {f.memo && <p className="text-[12px] mt-0.5" style={{ color: "var(--mt-gray)" }}>{f.memo}</p>}
                                </div>
                                <button
                                    className="mt-en text-[11px] font-medium px-3 py-2 rounded-[2px] hover:opacity-70 shrink-0"
                                    style={{ border: "1px solid var(--mt-accent)", color: "var(--mt-accent)", letterSpacing: "0.06em" }}
                                    onClick={() => copy(f.access_code ?? "")}
                                    title="접속 코드 복사"
                                >
                                    {f.access_code}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
