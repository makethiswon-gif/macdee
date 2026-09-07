"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
    ArrowDown, ArrowRight, CalendarDays, Check, ChevronDown, Copy,
    FileText, Inbox, LoaderCircle, LockKeyhole, RefreshCw, Sparkles,
} from "lucide-react";
import { getPreviousKstMonth, type ReportRow, type SourceCounts, type StrategyReport } from "@/lib/portal-strategy";
import type { PortalRequest, PortalRequestListResponse, RequestStatus } from "@/lib/portal-requests";
import styles from "./ClientStrategyDashboard.module.css";

// Response-only types: this client never imports the server AI runtime.
type Topic = StrategyReport["topics"][number];
type Firm = { id: string; name: string };
type StrategyResponse = {
    month: string; firms: Firm[]; reports: ReportRow[]; setupRequired?: boolean; error?: string;
};
type RequestResponse = PortalRequestListResponse & { error?: string };

const EMPTY_COUNTS: SourceCounts = { records: 0, requests: 0, worklogs: 0, messages: 0 };
const STATUSES: RequestStatus[] = ["접수", "진행중", "완료", "보류"];
const REPORT_LABELS: Record<ReportRow["status"], string> = {
    completed: "AI 초안 준비", generating: "분석 중", failed: "생성 실패", insufficient_data: "자료 보완 필요",
};

function readableMonth(value: string) {
    const [year, month] = value.split("-");
    return `${year}년 ${Number(month)}월`;
}

function readableDate(value: string | null | undefined, withTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
        ...(withTime ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}),
    }).format(date);
}

async function readResponse<T extends { error?: string }>(response: Response, allowSetup = false): Promise<T> {
    const data = await response.json().catch(() => ({}));
    if (allowSetup && data.setupRequired === true) return data as T;
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("관리자 로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.");
        }
        throw new Error(data.error || `요청을 처리하지 못했습니다. (${response.status})`);
    }
    return data as T;
}

function Evidence({ ids }: { ids: string[] }) {
    const uniqueIds = [...new Set(ids || [])];
    if (!uniqueIds.length) return <span className={styles.noEvidence}>확인 가능한 개별 근거 없음 · 검토 필요</span>;
    return (
        <details className={styles.evidence}>
            <summary>근거 {uniqueIds.length}건 <ChevronDown size={12} aria-hidden /></summary>
            <p>원자료 식별자입니다. 클라이언트 CMS에서 원문과 공개 가능 범위를 확인해 주세요.</p>
            <ul>{uniqueIds.map((id) => <li key={id}><code>{id}</code></li>)}</ul>
        </details>
    );
}

function TopicList({ topics, firmName }: { topics: Topic[]; firmName: string }) {
    const inputId = useId();
    const [search, setSearch] = useState("");
    const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
    const searchTerm = search.trim().toLocaleLowerCase();
    const filtered = topics.filter((topic) =>
        [topic.title, topic.keyword, topic.intent, topic.angle, topic.channel].join(" ").toLocaleLowerCase().includes(searchTerm)
    );

    useEffect(() => { setCopyState("idle"); }, [search, topics]);

    async function copyTopics() {
        const text = filtered.map((topic, index) =>
            `${index + 1}. ${topic.title}\n채널: ${topic.channel} | 우선순위: ${topic.priority}\n키워드: ${topic.keyword}\n검색 의도: ${topic.intent}\n작성 방향: ${topic.angle}`
        ).join("\n\n");
        try {
            await navigator.clipboard.writeText(`${firmName} · 콘텐츠 주제 초안\n\n${text}`);
            setCopyState("copied");
        } catch {
            setCopyState("error");
        }
    }

    return (
        <section className={styles.reportSection} aria-label="추천 포스팅 주제">
            <div className={styles.sectionHeading}>
                <div><span className={styles.sectionIndex}>03 / CONTENT</span><h3>포스팅할 주제 <span>{topics.length}</span></h3></div>
                <button className={styles.secondaryButton} onClick={copyTopics} disabled={!filtered.length}>
                    {copyState === "copied" ? <Check size={15} /> : <Copy size={15} />} {copyState === "copied" ? "복사 완료" : "주제 복사"}
                </button>
            </div>
            <label className={styles.searchLabel} htmlFor={inputId}>제목·키워드·채널 검색</label>
            <input id={inputId} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="예: 이혼, 상담, 인스타그램" className={styles.input} />
            <p className={styles.copyMessage} aria-live="polite">{copyState === "error" ? "복사가 허용되지 않았습니다. 아래 주제를 직접 선택해 복사해 주세요." : searchTerm ? `${filtered.length}개 주제 검색됨` : "원고 작성 전 사건 정보와 표현의 적절성을 확인해 주세요."}</p>
            {filtered.length ? (
                <ol className={styles.topics}>
                    {filtered.map((topic, index) => (
                        <li key={`${topic.title}-${index}`} className={styles.topic}>
                            <div className={styles.topicTop}><span className={styles.topicNumber}>{String(index + 1).padStart(2, "0")}</span><div className={styles.badges}><span className={styles.neutralBadge}>{topic.channel}</span>{topic.priority === "높음" && <span className={styles.blueBadge}>우선 추천</span>}</div></div>
                            <h4>{topic.title}</h4>
                            <dl><div><dt>키워드</dt><dd>{topic.keyword}</dd></div><div><dt>검색 의도</dt><dd>{topic.intent}</dd></div><div><dt>작성 방향</dt><dd>{topic.angle}</dd></div></dl>
                            <Evidence ids={topic.evidenceIds} />
                        </li>
                    ))}
                </ol>
            ) : <p className={styles.emptyInline}>{topics.length ? "검색어에 맞는 주제가 없습니다." : "근거가 충분하지 않아 추천 주제가 없습니다. 보완해 등록한 자료는 다음 월간 분석에 반영됩니다."}</p>}
        </section>
    );
}

function ReportContent({ report, firmName }: { report: StrategyReport; firmName: string }) {
    return (
        <div className={styles.reportContent}>
            <section className={styles.summaryBlock}>
                <span className={styles.sectionIndex}>MONTHLY BRIEF</span>
                <h3>이번 달 자료가 말해주는 것</h3>
                <p>{report.summary}</p>
                {report.nextMonthFocus && <div className={styles.nextFocus}><ArrowRight size={18} aria-hidden /><div><strong>다음 달 집중 방향</strong><p>{report.nextMonthFocus}</p></div></div>}
            </section>
            <section className={styles.reportSection} aria-label="자료에서 읽은 신호">
                <div className={styles.sectionHeading}><div><span className={styles.sectionIndex}>01 / SIGNAL</span><h3>자료에서 읽은 신호</h3></div></div>
                <div className={styles.signalGrid}>{report.signals.map((signal, index) => <article key={index} className={styles.signal}><h4>{signal.title}</h4><p>{signal.detail}</p><Evidence ids={signal.evidenceIds} /></article>)}</div>
                {!report.signals.length && <p className={styles.emptyInline}>확인 가능한 신호가 없습니다. 추가 자료가 필요합니다.</p>}
            </section>
            <section className={styles.reportSection} aria-label="우선 실행할 마케팅 전략">
                <div className={styles.sectionHeading}><div><span className={styles.sectionIndex}>02 / ACTION</span><h3>우선 실행할 일</h3></div></div>
                <ol className={styles.priorities}>{report.priorities.map((priority, index) => <li key={index}><span className={styles.actionNumber}>{String(index + 1).padStart(2, "0")}</span><div><div className={styles.actionHeading}><h4>{priority.title}</h4><span className={styles.neutralBadge}>{priority.channel}</span></div><p>{priority.action}</p><div className={styles.reason}><strong>이유</strong><p>{priority.reason}</p></div><Evidence ids={priority.evidenceIds} /></div></li>)}</ol>
                {!report.priorities.length && <p className={styles.emptyInline}>자료를 보완한 후 실행 우선순위를 정할 수 있습니다.</p>}
            </section>
            <TopicList topics={report.topics} firmName={firmName} />
            <div className={styles.bottomGrid}>
                <section className={styles.reportSection} aria-label="요청사항 종합">
                    <div className={styles.sectionHeading}><div><span className={styles.sectionIndex}>04 / CLIENT VOICE</span><h3>요청사항 종합</h3></div></div>
                    {report.requestSummary.length ? <ul className={styles.requestSummary}>{report.requestSummary.map((request, index) => <li key={`${request.requestId}-${index}`}><h4>{request.summary}</h4><p>{request.suggestedAction}</p><Evidence ids={[`request:${request.requestId.replace(/^request:/, "")}`]} /></li>)}</ul> : <p className={styles.emptyInline}>이번 보고서에 포함된 요청사항이 없습니다.</p>}
                </section>
                <section className={styles.reportSection} aria-label="보완할 자료">
                    <div className={styles.sectionHeading}><div><span className={styles.sectionIndex}>05 / NEXT INPUT</span><h3>확인·보완할 자료</h3></div></div>
                    {report.gaps.length ? <ul className={styles.gaps}>{report.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul> : <p className={styles.emptyInline}>AI가 제안한 추가 확인 항목은 없습니다. 원자료 검토는 별도로 필요합니다.</p>}
                </section>
            </div>
            <div className={styles.reviewNote}><LockKeyhole size={17} aria-hidden /><p><strong>대표 검토용 AI 초안입니다.</strong> 클라이언트에게 자동 공개되지 않습니다. 사실관계·개인정보·공개 동의·광고 표현을 확인한 뒤 사용하세요. 광고 집행, 포스팅, 메시지 발송은 자동 실행하지 않습니다.</p></div>
        </div>
    );
}

function RequestCard({ request, firmName, onSaved }: { request: PortalRequest; firmName: string; onSaved: (request: PortalRequest) => void }) {
    const id = useId();
    const [status, setStatus] = useState<RequestStatus>(request.status);
    const [note, setNote] = useState(request.admin_note || "");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [failed, setFailed] = useState(false);
    const dirty = status !== request.status || note !== (request.admin_note || "");

    useEffect(() => {
        setStatus(request.status);
        setNote(request.admin_note || "");
    }, [request.status, request.admin_note]);

    async function save() {
        setSaving(true);
        setMessage("");
        setFailed(false);
        try {
            const response = await fetch(`/api/portal/requests/${encodeURIComponent(request.id)}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ status, admin_note: note.trim() }),
            });
            const result = await readResponse<{ request: PortalRequest; error?: string }>(response);
            setMessage("저장했습니다.");
            onSaved(result.request);
        } catch (error) {
            setFailed(true);
            setMessage(error instanceof Error ? error.message : "저장하지 못했습니다. 다시 시도해 주세요.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <article className={styles.requestCard}>
            <div className={styles.requestTop}><p>{firmName}</p><div className={styles.badges}>{request.priority === "긴급" && <span className={styles.urgentBadge}>긴급</span>}<span className={styles.neutralBadge}>{request.category}</span><span className={request.status === "완료" ? styles.greenBadge : styles.blueBadge}>{request.status}</span></div></div>
            <h3>{request.title}</h3>
            <div className={styles.requestDates}><span>접수 {readableDate(request.created_at)}</span>{request.due_date && <span>희망일 {readableDate(request.due_date)}</span>}</div>
            <details className={styles.requestOriginal} open><summary>클라이언트 요청 원문 <ChevronDown size={14} aria-hidden /></summary><p>{request.body}</p></details>
            <div className={styles.requestEditor}>
                <div className={styles.statusField}><label htmlFor={`${id}-status`}>처리 상태</label><select id={`${id}-status`} className={styles.input} value={status} onChange={(event) => setStatus(event.target.value as RequestStatus)} disabled={saving}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select><p>변경한 상태는 클라이언트에게 보입니다.</p></div>
                <div className={styles.noteField}><label htmlFor={`${id}-note`}>내부 메모 <span>대표 전용</span></label><textarea id={`${id}-note`} className={styles.input} value={note} onChange={(event) => setNote(event.target.value)} disabled={saving} maxLength={5000} rows={3} placeholder="대응 방향, 확인할 사항, 업무 담당 메모" /><p>클라이언트에게 공개하거나 발송하지 않습니다. {note.length.toLocaleString()} / 5,000</p></div>
            </div>
            <div className={styles.requestSave}><p className={failed ? styles.inlineError : styles.saveMessage} role={failed ? "alert" : "status"}>{message}</p><button className={styles.primaryButton} onClick={save} disabled={saving || !dirty}>{saving ? <LoaderCircle className={styles.spinner} size={15} /> : <Check size={15} />}{saving ? "저장 중" : "변경 저장"}</button></div>
        </article>
    );
}

function RequestInbox({ firmId, firms, onCounts }: { firmId: string; firms: Firm[]; onCounts: (counts: Record<RequestStatus, number>) => void }) {
    const [status, setStatus] = useState("");
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [priority, setPriority] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<RequestResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [revision, setRevision] = useState(0);
    const pageSize = 12;

    useEffect(() => { setPage(1); }, [firmId]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (firmId) params.set("firm", firmId);
        if (status) params.set("status", status);
        if (search) params.set("q", search);
        // Priority filtering is intentionally scoped to the loaded page because
        // the requests API promises only firm/status/query pagination filters.
        fetch(`/api/portal/requests?${params}`, { cache: "no-store", credentials: "include", signal: controller.signal })
            .then((response) => readResponse<RequestResponse>(response, true))
            .then(setData)
            .catch((failure) => { if (!controller.signal.aborted) { setData(null); setError(failure instanceof Error ? failure.message : "요청사항을 불러오지 못했습니다."); } })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [firmId, status, search, page, revision, onCounts]);

    const requests = (data?.requests || []).filter((request) => !priority || request.priority === priority);
    const pages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

    useEffect(() => { if (data?.counts) onCounts(data.counts); }, [data?.counts, onCounts]);

    function applySavedRequest(updated: PortalRequest) {
        // Keep sibling cards mounted so saving one request cannot discard an
        // unfinished note on another. Concurrent saves merge into latest state.
        setData((current) => {
            if (!current) return current;
            const previous = current.requests.find((request) => request.id === updated.id);
            const counts = { ...current.counts };
            if (previous && previous.status !== updated.status) {
                counts[previous.status] = Math.max(0, counts[previous.status] - 1);
                counts[updated.status]++;
            }
            return { ...current, counts, requests: current.requests.map((request) => request.id === updated.id ? updated : request) };
        });
    }

    return (
        <section className={styles.inbox} aria-label="클라이언트 요청사항">
            <div className={styles.inboxIntro}><div><span className={styles.sectionIndex}>CLIENT REQUESTS</span><h2>빠뜨리지 않는 요청 관리</h2><p>요청사항은 월 구분 없이 모아서 봅니다. 원문, 처리 상태, 내부 메모를 한곳에서 관리하세요.</p></div><button className={styles.secondaryButton} onClick={() => setRevision((value) => value + 1)} disabled={loading}><RefreshCw size={14} className={loading ? styles.spinner : undefined} />새로고침</button></div>
            <form className={styles.inboxFilters} onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); setPage(1); }}>
                <label>처리 상태<select className={styles.input} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">모든 상태</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>우선순위<select className={styles.input} value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">현재 페이지 전체</option><option value="긴급">현재 페이지 긴급</option><option value="보통">현재 페이지 보통</option></select></label>
                <label className={styles.inboxSearch}>제목·내용 검색<div><input className={styles.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="요청 키워드를 입력하세요" /><button type="submit" className={styles.primaryButton}>검색</button></div></label>
            </form>
            {error && <div role="alert" className={styles.errorBox}><p>{error}</p><button onClick={() => setRevision((value) => value + 1)} className={styles.secondaryButton}>다시 불러오기</button></div>}
            {data?.setupRequired && <div role="status" className={styles.setupBox}><strong>요청사항 저장소 설정이 필요합니다.</strong><p>데이터베이스 마이그레이션이 적용된 뒤 사용할 수 있습니다. 기존 자료에는 영향을 주지 않습니다.</p></div>}
            {loading ? <div className={styles.loading} role="status"><LoaderCircle className={styles.spinner} size={20} />요청사항을 불러오는 중</div> : !error && !data?.setupRequired && <>
                <div className={styles.resultCount}><span>검색 결과 <strong>{(data?.total || 0).toLocaleString()}건</strong></span><span>{priority ? `현재 페이지 ${priority} ${requests.length}건` : `${page} / ${pages} 페이지`}</span></div>
                {requests.length ? <div className={styles.requestList}>{requests.map((request) => <RequestCard key={request.id} request={request} firmName={request.firm_name || firms.find((firm) => firm.id === request.firm_id)?.name || "로펌 정보 확인 필요"} onSaved={applySavedRequest} />)}</div> : <div className={styles.emptyState}><Inbox size={28} /><h3>{search || status || priority ? "조건에 맞는 요청이 없습니다." : "아직 접수된 요청사항이 없습니다."}</h3><p>{priority ? "우선순위 조건은 현재 페이지에만 적용됩니다. 다른 페이지도 확인해 주세요." : "클라이언트가 CMS의 요청사항 메뉴에 입력하면 이곳에 모입니다."}</p></div>}
                {pages > 1 && <nav className={styles.pagination} aria-label="요청사항 페이지"><button className={styles.secondaryButton} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>이전</button><span>{page} / {pages}</span><button className={styles.secondaryButton} disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>다음</button></nav>}
            </>}
        </section>
    );
}

export default function ClientStrategyDashboard() {
    const [month, setMonth] = useState(getPreviousKstMonth);
    const [firmId, setFirmId] = useState("");
    const [tab, setTab] = useState<"strategy" | "requests">("strategy");
    const [data, setData] = useState<StrategyResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [revision, setRevision] = useState(0);
    const [generation, setGeneration] = useState<{ firmId: string; month: string } | null>(null);
    const [generationError, setGenerationError] = useState<{ firmId: string; month: string; message: string } | null>(null);
    const [generationMessage, setGenerationMessage] = useState("");
    const [requestCounts, setRequestCounts] = useState<Record<RequestStatus, number> | null>(null);
    const activeMonth = useRef(month);
    activeMonth.current = month;
    const controllerRef = useRef<AbortController | null>(null);
    const captureCounts = useCallback((counts: Record<RequestStatus, number>) => setRequestCounts(counts), []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setData(null);
        fetch(`/api/admin/client-strategy?month=${encodeURIComponent(month)}`, {
            cache: "no-store", credentials: "include", signal: controller.signal,
        })
            .then((response) => readResponse<StrategyResponse>(response, true))
            .then(setData)
            .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "월간 전략을 불러오지 못했습니다."); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [month, revision]);

    // Poll only an already-started job. Loading this page never requests AI work.
    useEffect(() => {
        if (!data?.reports?.some((report) => report.status === "generating") || generation) return;
        const timer = window.setTimeout(() => setRevision((value) => value + 1), 8000);
        return () => window.clearTimeout(timer);
    }, [data, generation]);

    useEffect(() => {
        setRequestCounts(null);
        const controller = new AbortController();
        const params = new URLSearchParams({ page: "1", pageSize: "1" });
        if (firmId) params.set("firm", firmId);
        fetch(`/api/portal/requests?${params}`, { cache: "no-store", credentials: "include", signal: controller.signal })
            .then(readResponse<RequestResponse>)
            .then((result) => { if (!result.setupRequired) setRequestCounts(result.counts); })
            .catch(() => { /* The full inbox displays actionable error and setup details. */ });
        return () => controller.abort();
    }, [firmId, revision]);

    useEffect(() => () => controllerRef.current?.abort(), []);

    const firms = data?.firms || [];
    const visibleFirms = firmId ? firms.filter((firm) => firm.id === firmId) : firms;
    const reports = useMemo(() => (data?.reports || []).filter((report) => !firmId || report.firm_id === firmId), [data, firmId]);
    const totalSources = reports.reduce((total, report) => {
        for (const key of Object.keys(EMPTY_COUNTS) as (keyof SourceCounts)[]) total[key] += report.source_counts?.[key] || 0;
        return total;
    }, { ...EMPTY_COUNTS });
    const completed = reports.filter((report) => report.status === "completed").length;

    async function generate(firm: Firm, report?: ReportRow) {
        if (generation || data?.setupRequired || report?.status === "completed" || report?.status === "insufficient_data") return;
        const targetMonth = month;
        const controller = new AbortController();
        controllerRef.current = controller;
        setGeneration({ firmId: firm.id, month: targetMonth });
        setGenerationError(null);
        setGenerationMessage(`${firm.name}의 자료를 분석하고 있습니다. 창을 닫아도 진행 중인 서버 작업은 남을 수 있습니다.`);
        try {
            const result = await readResponse<{ report?: ReportRow; error?: string }>(await fetch("/api/admin/client-strategy", {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                signal: controller.signal, body: JSON.stringify({ month: targetMonth, firmId: firm.id }),
            }));
            if (result.report && activeMonth.current === targetMonth) {
                setData((current) => current ? { ...current, reports: [...current.reports.filter((item) => item.firm_id !== firm.id), result.report!] } : current);
            }
            const state = result.report?.status;
            setGenerationMessage(state === "completed" ? `${firm.name}의 AI 전략 초안이 준비되었습니다.` : state === "insufficient_data" ? `${firm.name}은 해당 월에 분석할 자료가 없습니다. 새로 등록한 자료는 다음 월간 분석에 반영됩니다.` : state === "generating" ? `${firm.name}의 분석이 진행 중입니다. 잠시 후 결과를 확인해 주세요.` : state === "failed" ? `${firm.name}의 생성에 실패했습니다. 오류를 확인한 뒤 다시 시도해 주세요.` : "처리 결과를 새로 불러옵니다.");
            if (!result.report && activeMonth.current === targetMonth) setRevision((value) => value + 1);
        } catch (failure) {
            if (!controller.signal.aborted) {
                setGenerationMessage("");
                setGenerationError({ firmId: firm.id, month: targetMonth, message: failure instanceof Error ? failure.message : "생성하지 못했습니다. 잠시 후 다시 시도해 주세요." });
            }
        } finally {
            setGeneration(null);
            controllerRef.current = null;
        }
    }

    return (
        <div className={styles.workspace}>
            <header className={styles.hero}>
                <div className={styles.heroTop}><span className={styles.eyebrow}>MAKETHIS1 / OWNER WORKSPACE</span><span className={styles.private}><LockKeyhole size={12} aria-hidden />대표 전용</span></div>
                <h1>클라이언트 전략실<span>.</span></h1>
                <p className={styles.heroDescription}>상담·사례·요청사항을 모아,<br className={styles.mobileBreak} /> 다음 달 마케팅의 방향을 정합니다.</p>
                <div className={styles.heroBottom}><p><CalendarDays size={15} aria-hidden />매월 1일 오전 9시 · 한국시간<br />전월에 등록한 자료 + 현재 미처리 요청 종합</p><Link href="/portal" className={styles.portalLink}>클라이언트 CMS · 로펌 관리<ArrowRight size={17} aria-hidden /></Link></div>
            </header>
            <section className={styles.toolbar} aria-label="전략 조회 조건">
                <label>자료 기준 월<div className={styles.monthInput}><CalendarDays size={17} aria-hidden /><input type="month" value={month} max={getPreviousKstMonth()} min="2000-01" onChange={(event) => { if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(event.target.value) && event.target.value <= getPreviousKstMonth()) setMonth(event.target.value); }} aria-label="자료 기준 월" /></div></label>
                <label className={styles.firmFilter}>클라이언트<select value={firmId} onChange={(event) => setFirmId(event.target.value)} className={styles.input}><option value="">전체 클라이언트</option>{firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name}</option>)}</select></label>
                <button className={styles.secondaryButton} onClick={() => setRevision((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? styles.spinner : undefined} />새로고침</button>
            </section>
            <section className={styles.overview} aria-label="운영 현황">
                <article><span>선택한 클라이언트</span><strong>{loading ? "—" : visibleFirms.length}<small>곳</small></strong><p>{firmId ? "로펌별 보기" : "전체 로펌 보기"}</p></article>
                <article><span>월간 전략 준비</span><strong>{loading ? "—" : completed}<small>건</small></strong><p>{readableMonth(month)} 자료 기준</p></article>
                <article><span>보고서에 반영한 자료</span><strong>{loading ? "—" : totalSources.records}<small>건</small></strong><p>상담·수임·판결·승소사례</p></article>
                <article><span>확인할 요청사항</span><strong>{requestCounts ? requestCounts.접수 + requestCounts.진행중 : "—"}<small>건</small></strong><p>접수 + 진행중 · 전체 기간</p></article>
            </section>
            <nav className={styles.tabs} aria-label="전략실 메뉴"><button onClick={() => setTab("strategy")} aria-pressed={tab === "strategy"} className={tab === "strategy" ? styles.activeTab : ""}><Sparkles size={17} />월간 전략</button><button onClick={() => setTab("requests")} aria-pressed={tab === "requests"} className={tab === "requests" ? styles.activeTab : ""}><Inbox size={17} />요청사항{requestCounts && requestCounts.접수 > 0 && <span>{requestCounts.접수}</span>}</button></nav>
            <div className={styles.generationNotice} role="status" aria-live="polite">{generation && <LoaderCircle className={styles.spinner} size={15} />}{generationMessage}</div>
            {error && <div role="alert" className={styles.errorBox}><p>{error}</p><div><button onClick={() => setRevision((value) => value + 1)} className={styles.secondaryButton}>다시 불러오기</button><Link href="/admin">관리자 로그인</Link></div></div>}
            {data?.setupRequired && <div role="status" className={styles.setupBox}><strong>월간 전략 저장소 설정이 필요합니다.</strong><p>아직 데이터베이스 설정이 완료되지 않았습니다. 마이그레이션 적용 후 전략 생성과 저장을 사용할 수 있습니다.</p></div>}
            {tab === "requests" ? <RequestInbox key={firmId} firmId={firmId} firms={firms} onCounts={captureCounts} /> : <section aria-label="월간 전략 보고서">
                <div className={styles.strategyIntro}><div><span className={styles.sectionIndex}>MONTHLY STRATEGY</span><h2>{readableMonth(month)} 등록 자료 → 다음 달 실행안</h2><p>자료 등록일 기준으로 분석하며, 현재 미처리 요청도 함께 봅니다. 미생성·실패 건은 직접 생성하고 완료한 보고서는 보존합니다.</p></div><span className={styles.draftPill}><FileText size={14} aria-hidden />대표 검토용 초안</span></div>
                {loading ? <div role="status" className={styles.loading}><LoaderCircle size={20} className={styles.spinner} />월간 전략을 불러오는 중</div> : !error && !data?.setupRequired && <>
                    {!visibleFirms.length ? <div className={styles.emptyState}><FileText size={30} /><h3>등록된 클라이언트가 없습니다.</h3><p>클라이언트 CMS에서 로펌을 등록하고 자료를 모아 주세요. 샘플 전략이나 가상 수치는 표시하지 않습니다.</p><Link href="/portal" className={styles.primaryButton}>클라이언트 등록하기<ArrowRight size={15} /></Link></div> : <div className={styles.reports}>{visibleFirms.map((firm) => {
                        const row = reports.find((report) => report.firm_id === firm.id);
                        const counts = row?.source_counts || EMPTY_COUNTS;
                        const stale = row?.status === "generating" && Date.now() - new Date(row.updated_at).getTime() > 3 * 60 * 1000;
                        const busy = (generation?.firmId === firm.id && generation.month === month) || (row?.status === "generating" && !stale);
                        const finalized = row?.status === "completed" || row?.status === "insufficient_data";
                        const failure = generationError?.firmId === firm.id && generationError.month === month ? generationError.message : null;
                        return <article key={firm.id} className={styles.reportCard}>
                            <div className={styles.reportCardTop}><div><span className={styles.firmEyebrow}>{readableMonth(month)} · 등록 기준</span><h2>{firm.name}</h2><div className={styles.reportMeta}><span className={busy ? styles.blueBadge : row?.status === "failed" || stale ? styles.urgentBadge : row?.status === "completed" ? styles.greenBadge : styles.neutralBadge}>{busy ? "분석 중" : stale ? "분석 지연 · 재시도 가능" : row ? REPORT_LABELS[row.status] : "아직 생성하지 않음"}</span><span>{row?.generated_at ? `생성 ${readableDate(row.generated_at, true)}` : "월간 전략 초안"}</span></div></div><button className={styles.primaryButton} disabled={Boolean(generation) || busy || finalized} onClick={() => generate(firm, row)}>{busy ? <LoaderCircle className={styles.spinner} size={16} /> : finalized ? <Check size={16} /> : <Sparkles size={16} />}{busy ? "분석 중" : row?.status === "completed" ? "이번 달 생성 완료" : row?.status === "insufficient_data" ? "자료 없음 · 분석 마감" : stale ? "중단된 분석 재시도" : row?.status === "failed" ? "다시 시도" : "AI 전략 만들기"}</button></div>
                            <div className={styles.sourceBar} aria-label="보고서에 반영한 근거"><span>반영 자료</span><span>상담·사례 <b>{counts.records}</b></span><span>요청사항 <b>{counts.requests}</b></span><span>업무일지 <b>{counts.worklogs}</b></span><span>메시지 <b>{counts.messages}</b></span></div>
                            {failure && <div className={styles.cardError} role="alert">{failure}</div>}
                            {row?.status === "failed" && row.error_message && <div className={styles.cardError} role="alert">{row.error_message}</div>}
                            {row?.report ? <details className={styles.reportDetails} open={visibleFirms.length === 1}><summary><span>전략·포스팅 주제 확인 <span>{row.report.topics.length}개 주제</span></span><ArrowDown size={18} aria-hidden /></summary><ReportContent report={row.report} firmName={firm.name} />{row.model && <p className={styles.modelNote}>생성 모델: {row.model} · 내용은 AI 제안이며 확정된 업무 지시가 아닙니다.</p>}</details> : <div className={styles.reportPlaceholder}>{busy ? "자료를 분석하고 실행 우선순위와 콘텐츠 주제를 정리하고 있습니다. 새로고침해도 중복으로 생성하지 않습니다." : row?.status === "insufficient_data" ? "이 달에 분석할 자료가 없습니다. 새로 등록한 상담 내역, 사례, 요청사항은 다음 월간 분석에 반영됩니다." : row?.status === "failed" ? "보고서 생성에 실패했습니다. 자료와 연결 설정을 확인한 뒤 다시 시도해 주세요." : "이 달의 상담·사례·업무일지·요청사항을 함께 분석합니다. 이 페이지에서는 버튼을 누를 때만 AI 생성이 실행됩니다."}</div>}
                        </article>;
                    })}</div>}
                </>}
            </section>}
        </div>
    );
}
