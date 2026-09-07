"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
    REQUEST_CATEGORIES, REQUEST_PRIORITIES, REQUEST_STATUSES,
    type PortalRequestListResponse, type RequestCategory, type RequestPriority,
} from "@/lib/portal-requests";

export default function RequestsTab({ role, firmQuery, activeFirmId, notify }: {
    role: "admin" | "firm";
    firmQuery: string;
    activeFirmId: string | null;
    notify: (message: string) => void;
}) {
    const id = useId();
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [category, setCategory] = useState<RequestCategory>("블로그·콘텐츠");
    const [priority, setPriority] = useState<RequestPriority>("보통");
    const [dueDate, setDueDate] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [data, setData] = useState<PortalRequestListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [setupRequired, setSetupRequired] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const submitController = useRef<AbortController | null>(null);

    useEffect(() => () => submitController.current?.abort(), []);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setData(null);
        const params = new URLSearchParams(firmQuery.replace(/^\?/, ""));
        params.set("page", String(page));
        params.set("pageSize", "10");
        if (status) params.set("status", status);
        else params.delete("status");
        void (async () => {
            try {
                const response = await fetch(`/api/portal/requests?${params}`, { cache: "no-store", signal: controller.signal });
                const result = await response.json();
                if (controller.signal.aborted) return;
                setSetupRequired(!!result.setupRequired);
                if (!response.ok) throw new Error(result.error || "요청사항을 불러오지 못했습니다.");
                setData(result);
            } catch (caught) {
                if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "요청사항을 불러오지 못했습니다.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, [firmQuery, page, status, refresh]);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving || setupRequired || (role === "admin" && !activeFirmId)) return;
        const controller = new AbortController();
        submitController.current = controller;
        setSaving(true);
        setFormError("");
        try {
            const response = await fetch("/api/portal/requests", {
                method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
                body: JSON.stringify({ title, body, category, priority, due_date: dueDate || null, firmId: activeFirmId }),
            });
            const result = await response.json();
            if (controller.signal.aborted) return;
            if (!response.ok) {
                if (result.setupRequired) setSetupRequired(true);
                throw new Error(result.error || "저장하지 못했습니다. 입력 내용은 그대로 남아 있습니다.");
            }
            setTitle(""); setBody(""); setDueDate(""); setPriority("보통");
            setPage(1); setStatus(""); setRefresh((value) => value + 1);
            notify("요청사항을 접수했습니다. 담당자가 확인 후 진행 상태를 안내합니다.");
        } catch (caught) {
            if (!controller.signal.aborted) setFormError(caught instanceof Error ? caught.message : "저장하지 못했습니다. 입력 내용은 그대로 남아 있습니다.");
        } finally {
            if (!controller.signal.aborted) setSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8 items-start">
            <section className="pt-card p-5 sm:p-7 min-w-0" aria-labelledby={`${id}-heading`}>
                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>Request</p>
                <h2 id={`${id}-heading`} className="mt-serif text-[20px] font-semibold mt-3">필요한 일을 편하게 남겨 주세요.</h2>
                <p className="mt-body text-[13px] mt-2">광고 방향, 콘텐츠 주제, 홈페이지 수정 등. 요청은 담당자가 확인하고 월간 전략에도 참고합니다.</p>
                <p id={`${id}-privacy`} className="mt-body text-[12px] mt-4">의뢰인 이름·연락처·사건번호 등 식별정보는 입력 전에 지워 주세요. 희망일은 확정 일정이 아니며, 긴급 요청은 담당자에게도 연락해 주세요.</p>
                <form onSubmit={submit} className="flex flex-col gap-4 mt-6" aria-describedby={`${id}-privacy`}>
                    <fieldset disabled={saving || setupRequired} className="flex flex-col gap-4 min-w-0">
                        <div>
                            <label htmlFor={`${id}-title`} className="block text-[13px] font-medium mb-2">요청 제목</label>
                            <input id={`${id}-title`} className="pt-input w-full" required maxLength={120} placeholder="예: 다음 달 상속 분야 광고를 늘리고 싶어요" value={title} onChange={(event) => setTitle(event.target.value)} />
                        </div>
                        <div>
                            <label htmlFor={`${id}-body`} className="block text-[13px] font-medium mb-2">요청 내용</label>
                            <textarea id={`${id}-body`} className="pt-textarea w-full" required maxLength={10000} rows={6} placeholder="원하는 방향이나 수정할 내용을 적어 주세요. 형식은 자유입니다." value={body} onChange={(event) => setBody(event.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor={`${id}-category`} className="block text-[13px] font-medium mb-2">요청 분야</label>
                                <select id={`${id}-category`} className="pt-select w-full" value={category} onChange={(event) => setCategory(event.target.value as RequestCategory)}>{REQUEST_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
                            </div>
                            <div>
                                <label htmlFor={`${id}-priority`} className="block text-[13px] font-medium mb-2">우선순위</label>
                                <select id={`${id}-priority`} className="pt-select w-full" value={priority} onChange={(event) => setPriority(event.target.value as RequestPriority)}>{REQUEST_PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor={`${id}-due`} className="block text-[13px] font-medium mb-2">희망일 <span className="font-normal">(선택)</span></label>
                            <input id={`${id}-due`} type="date" min="2000-01-01" max="2100-12-31" className="pt-input w-full" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                        </div>
                        <button className="pt-btn" type="submit" disabled={!title.trim() || !body.trim() || (role === "admin" && !activeFirmId)}>{saving ? "접수 중…" : "요청사항 보내기 →"}</button>
                    </fieldset>
                    {role === "admin" && !activeFirmId && <p className="mt-body text-[13px]">요청을 등록하려면 먼저 로펌을 선택해 주세요.</p>}
                    {formError && <p role="alert" className="text-[13px]" style={{ color: "#a92323" }}>{formError}</p>}
                </form>
            </section>
            <section className="min-w-0" aria-labelledby={`${id}-list-heading`} aria-busy={loading}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 id={`${id}-list-heading`} className="mt-serif text-[20px] font-semibold">요청 내역{data ? ` · ${data.total}건` : ""}</h2>
                    <div>
                        <label htmlFor={`${id}-filter`} className="sr-only">처리 상태로 필터</label>
                        <select id={`${id}-filter`} className="pt-select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); setExpanded(null); }}>
                            <option value="">전체 상태</option>
                            {REQUEST_STATUSES.map((value) => <option key={value} value={value}>{value}{data ? ` (${data.counts[value]})` : ""}</option>)}
                        </select>
                    </div>
                </div>
                {loading ? <p role="status" className="mt-body py-12 text-center text-[13px]">요청사항을 불러오는 중…</p> : error ? (
                    <div className="pt-card p-5"><p role="alert" className="mt-body text-[13px]">{error}</p><button type="button" className="pt-btn pt-btn-ghost mt-4" onClick={() => setRefresh((value) => value + 1)}>다시 불러오기</button></div>
                ) : data?.requests.length ? (
                    <ul className="flex flex-col gap-3">
                        {data.requests.map((item) => (
                            <li key={item.id} className="pt-card">
                                <button type="button" className="w-full text-left p-5 flex items-start justify-between gap-3" aria-expanded={expanded === item.id} aria-controls={`${id}-request-${item.id}`} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                                    <span className="min-w-0">
                                        <span className="flex flex-wrap gap-2 mb-2"><span className="pt-pill">{item.category}</span>{item.priority === "긴급" && <span className="pt-pill">긴급</span>}</span>
                                        <span className="block text-[14px] font-medium break-words">{item.title}</span>
                                        <span className="block text-[12px] mt-2" style={{ color: "var(--mt-gray)" }}>{item.created_at.slice(0, 10)}{role === "admin" && item.firm_name ? ` · ${item.firm_name}` : ""}{item.due_date ? ` · 희망일 ${item.due_date}` : ""}</span>
                                    </span>
                                    <span className={`pt-pill shrink-0 ${item.status === "완료" ? "pt-pill-ink" : item.status === "진행중" ? "pt-pill-blue" : ""}`}>{item.status}</span>
                                </button>
                                <div id={`${id}-request-${item.id}`} hidden={expanded !== item.id} className="p-5 pt-0">
                                    <p className="mt-body text-[13px] whitespace-pre-wrap break-words">{item.body}</p>
                                    {role === "admin" && item.admin_note && <p className="mt-body text-[12px] mt-4 whitespace-pre-wrap break-words">내부 메모 · {item.admin_note}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="mt-body text-[13px] py-8">{status ? "이 상태의 요청사항이 없습니다." : "아직 요청사항이 없습니다. 필요한 일을 남겨 주세요."}</p>}
                {!loading && !error && data && data.total > data.pageSize && (
                    <nav aria-label="요청사항 페이지" className="flex items-center justify-between gap-3 mt-5">
                        <button type="button" className="pt-btn pt-btn-ghost" disabled={page <= 1} onClick={() => { setPage((value) => value - 1); setExpanded(null); }}>이전</button>
                        <span className="text-[13px]">{page} / {Math.ceil(data.total / data.pageSize)}</span>
                        <button type="button" className="pt-btn pt-btn-ghost" disabled={page * data.pageSize >= data.total} onClick={() => { setPage((value) => value + 1); setExpanded(null); }}>다음</button>
                    </nav>
                )}
            </section>
        </div>
    );
}
