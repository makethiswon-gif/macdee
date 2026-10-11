"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    PIPELINE, STATUSES, STATUS_KEYS, daysLeft, hostOf, normalizeTags, splitInput, toBrief,
    type Idea, type Status,
} from "@/lib/oyk-idea/shared";

type Capture = { url: string; title: string } | null;
type Filter = Status | "all" | "active";
type Sort = "new" | "due" | "updated";

const FILTERS: { key: Filter; label: string }[] = [
    { key: "active", label: "진행 중" },
    ...STATUS_KEYS.map((k) => ({ key: k as Filter, label: STATUSES[k] })),
    { key: "all", label: "전체" },
];

// 저장은 파일 하나를 읽고-고치고-쓰는 방식이라, 이 탭의 쓰기 요청은 한 번에 하나씩 보낸다.
let writeChain: Promise<unknown> = Promise.resolve();

function api<T>(url: string, init?: RequestInit): Promise<T> {
    if (!init?.method || init.method === "GET") return request<T>(url, init);
    const run = writeChain.then(() => request<T>(url, init));
    writeChain = run.catch(() => undefined);
    return run;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
    if (res.status === 401) {
        window.location.reload();
        throw new Error("로그인이 필요합니다.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
    return data as T;
}

function ago(iso: string): string {
    const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    if (m < 60 * 24) return `${Math.round(m / 60)}시간 전`;
    const d = Math.round(m / 1440);
    if (d < 30) return `${d}일 전`;
    return iso.slice(0, 10).replaceAll("-", ".");
}

function DueBadge({ due, status }: { due: string; status: Status }) {
    if (status === "done") return null;
    const d = daysLeft(due);
    const label = d < 0 ? `마감 ${-d}일 지남` : d === 0 ? "오늘 마감" : `D-${d}`;
    return <span className={`oi-due${d <= 3 ? " oi-due--hot" : ""}${d < 0 ? " oi-due--over" : ""}`}>{label}</span>;
}

function Steps({ status }: { status: Status }) {
    const at = PIPELINE.indexOf(status);
    return (
        <span className="oi-steps" aria-hidden>
            {PIPELINE.map((s, i) => <i key={s} className={at >= 0 && i <= at ? "on" : ""} />)}
        </span>
    );
}

export default function IdeaBoard({ capture }: { capture: Capture }) {
    const [ideas, setIdeas] = useState<Idea[] | null>(null);
    const [loadError, setLoadError] = useState("");
    const [pending, setPending] = useState<{ id: string; text: string }[]>([]);
    const [text, setText] = useState("");
    const [filter, setFilter] = useState<Filter>("active");
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState<string | null>(null);
    const [starOnly, setStarOnly] = useState(false);
    const [sort, setSort] = useState<Sort>("new");
    const [openId, setOpenId] = useState<string | null>(null);
    const [toast, setToast] = useState("");
    const [showTools, setShowTools] = useState(false);
    const [captureOpen, setCaptureOpen] = useState(!!capture);
    const inputRef = useRef<HTMLInputElement>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const say = useCallback((msg: string) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(""), 2600);
    }, []);

    const load = useCallback(async () => {
        try {
            const { ideas } = await api<{ ideas: Idea[] }>("/api/idea/items");
            setIdeas(ideas);
            setLoadError("");
        } catch (e) {
            setLoadError((e as Error).message);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    // 다른 컴퓨터에서 고친 내용 — 탭으로 돌아오면 다시 불러온다.
    useEffect(() => {
        const onFocus = () => { if (document.visibilityState === "visible") load(); };
        document.addEventListener("visibilitychange", onFocus);
        return () => document.removeEventListener("visibilitychange", onFocus);
    }, [load]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement;
            const typing = el.closest("input, textarea, select, [contenteditable]");
            if (e.key === "/" && !typing) { e.preventDefault(); inputRef.current?.focus(); }
            if (e.key === "Escape") { setOpenId(null); setShowTools(false); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const upsert = useCallback((idea: Idea) => {
        setIdeas((list) => {
            if (!list) return [idea];
            const i = list.findIndex((x) => x.id === idea.id);
            if (i === -1) return [idea, ...list];
            const next = list.slice();
            next[i] = idea;
            return next;
        });
    }, []);

    async function add(e?: React.FormEvent) {
        e?.preventDefault();
        const value = text.trim();
        if (!value) return;
        const tempId = `tmp-${Date.now()}`;
        setPending((p) => [{ id: tempId, text: value }, ...p]);
        setText("");
        try {
            const { idea } = await api<{ idea: Idea }>("/api/idea/items", { method: "POST", body: JSON.stringify({ text: value }) });
            upsert(idea);
            if (filter !== "all" && filter !== "active" && filter !== "seed") setFilter("active");
        } catch (err) {
            setText(value);
            say((err as Error).message);
        } finally {
            setPending((p) => p.filter((x) => x.id !== tempId));
        }
    }

    async function patch(id: string, body: Record<string, unknown>) {
        const before = ideas?.find((i) => i.id === id);
        if (before) upsert({ ...before, ...(body as Partial<Idea>) });
        try {
            const { idea } = await api<{ idea: Idea }>(`/api/idea/items/${id}`, { method: "PATCH", body: JSON.stringify(body) });
            upsert(idea);
            return idea;
        } catch (err) {
            if (before) upsert(before);
            say((err as Error).message);
            return null;
        }
    }

    async function remove(id: string) {
        if (!window.confirm("이 아이디어를 지울까요? 되돌릴 수 없어요.")) return;
        const before = ideas;
        setIdeas((l) => l?.filter((i) => i.id !== id) ?? null);
        setOpenId(null);
        try {
            await api(`/api/idea/items/${id}`, { method: "DELETE" });
            say("지웠어요");
        } catch (err) {
            setIdeas(before);
            say((err as Error).message);
        }
    }

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: ideas?.length ?? 0, active: 0 };
        for (const i of ideas ?? []) {
            c[i.status] = (c[i.status] ?? 0) + 1;
            if (i.status !== "done" && i.status !== "hold") c.active += 1;
        }
        return c;
    }, [ideas]);

    const topTags = useMemo(() => {
        const m = new Map<string, number>();
        for (const i of ideas ?? []) for (const t of i.tags) m.set(t, (m.get(t) ?? 0) + 1);
        return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t);
    }, [ideas]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = (ideas ?? []).filter((i) => {
            if (filter === "active" && (i.status === "done" || i.status === "hold")) return false;
            if (filter !== "all" && filter !== "active" && i.status !== filter) return false;
            if (starOnly && !i.star) return false;
            if (tag && !i.tags.includes(tag)) return false;
            if (!q) return true;
            const hay = [i.title, i.memo, i.tags.join(" "), ...i.links.map((l) => `${l.title ?? ""} ${l.url} ${l.site ?? ""}`)].join(" ").toLowerCase();
            return hay.includes(q);
        });
        list = list.slice().sort((a, b) => {
            if (sort === "due") {
                if (a.due && b.due) return a.due.localeCompare(b.due);
                if (a.due || b.due) return a.due ? -1 : 1;
            }
            if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
            return b.createdAt.localeCompare(a.createdAt);
        });
        // 별표는 항상 위로
        return list.sort((a, b) => Number(b.star) - Number(a.star));
    }, [ideas, filter, query, tag, starOnly, sort]);

    const open = ideas?.find((i) => i.id === openId) ?? null;

    function exportJson() {
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ideas }, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `oyk-ideas-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        setShowTools(false);
    }

    async function logout() {
        await fetch("/api/idea/auth", { method: "DELETE" });
        window.location.reload();
    }

    const filtered = filter !== "active" || query || tag || starOnly;

    return (
        <div className="oi-app">
            <header className="oi-top">
                <div className="oi-top-in">
                    <a href="/idea" className="oi-brand" aria-label="아이디어 창고 처음으로">
                        <span className="oi-mark" role="img" aria-label="oyk" />
                        <span className="oi-brand-t">아이디어 창고</span>
                    </a>
                    <span className="oi-top-count">{ideas ? `${counts.active}개 진행 중 · 전체 ${counts.all}` : ""}</span>
                    <div className="oi-tools">
                        <button type="button" className="oi-icon-btn" aria-expanded={showTools} onClick={() => setShowTools((v) => !v)} aria-label="도구">
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                        </button>
                        {showTools && (
                            <div className="oi-menu" role="menu">
                                <Bookmarklet />
                                <button type="button" role="menuitem" onClick={exportJson}>전체 백업 내려받기 (JSON)</button>
                                <button type="button" role="menuitem" onClick={logout}>이 컴퓨터에서 로그아웃</button>
                            </div>
                        )}
                    </div>
                </div>

                <form className="oi-capture" onSubmit={add}>
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="링크를 붙여 넣거나 주제를 적고 Enter"
                        aria-label="새 아이디어"
                        autoComplete="off"
                        maxLength={4000}
                    />
                    <button type="submit" className="oi-btn oi-btn--lime" disabled={!text.trim()}>담기</button>
                </form>
            </header>

            <main className="oi-main">
                <div className="oi-filters">
                    <nav className="oi-tabs" aria-label="단계">
                        {FILTERS.map((f) => (
                            <button key={f.key} type="button" className={filter === f.key ? "on" : ""} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                                {f.label}<span>{counts[f.key] ?? 0}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="oi-filter-row">
                        <input className="oi-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색" aria-label="검색" />
                        <button type="button" className={`oi-chip oi-chip--star${starOnly ? " on" : ""}`} aria-pressed={starOnly} onClick={() => setStarOnly((v) => !v)}>★ 별표만</button>
                        <select className="oi-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
                            <option value="new">최근 담은 순</option>
                            <option value="updated">최근 고친 순</option>
                            <option value="due">마감 임박 순</option>
                        </select>
                    </div>
                    {topTags.length > 0 && (
                        <div className="oi-tagbar">
                            {topTags.map((t) => (
                                <button key={t} type="button" className={`oi-chip${tag === t ? " on" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>
                            ))}
                        </div>
                    )}
                </div>

                {loadError && (
                    <div className="oi-empty">
                        <p>{loadError}</p>
                        <button type="button" className="oi-btn" onClick={load}>다시 불러오기</button>
                    </div>
                )}

                {!ideas && !loadError && <div className="oi-grid">{[0, 1, 2].map((i) => <div key={i} className="oi-card oi-card--ghost" />)}</div>}

                {ideas && (
                    <div className="oi-grid">
                        {pending.map((p) => (
                            <article key={p.id} className="oi-card oi-card--pending" aria-busy>
                                <div className="oi-card-body">
                                    <p className="oi-site">{splitInput(p.text).urls.length ? "링크 읽는 중…" : "담는 중…"}</p>
                                    <h3 className="oi-title">{splitInput(p.text).rest || hostOf(splitInput(p.text).urls[0] ?? "")}</h3>
                                </div>
                            </article>
                        ))}
                        {shown.map((idea) => <Card key={idea.id} idea={idea} onOpen={() => setOpenId(idea.id)} onStar={() => patch(idea.id, { star: !idea.star })} onTag={setTag} />)}
                    </div>
                )}

                {ideas && shown.length === 0 && pending.length === 0 && !loadError && (
                    <div className="oi-empty">
                        {filtered && ideas.length > 0 ? (
                            <>
                                <p>조건에 맞는 아이디어가 없어요.</p>
                                <button type="button" className="oi-btn" onClick={() => { setFilter("active"); setQuery(""); setTag(null); setStarOnly(false); }}>필터 풀기</button>
                            </>
                        ) : (
                            <>
                                <p className="oi-empty-t">첫 아이디어를 담아 보세요</p>
                                <p>위 칸에 유튜브·기사 링크를 붙여 넣으면 제목과 썸네일을 알아서 가져와요. 주제만 적어도 돼요.</p>
                                <p>어느 사이트에서든 한 번에 담으려면 오른쪽 위 <b>···</b> 에서 <b>담기 버튼</b>을 즐겨찾기 막대로 끌어다 놓으세요.</p>
                            </>
                        )}
                    </div>
                )}
            </main>

            {open && <Sheet key={open.id} idea={open} onClose={() => setOpenId(null)} onPatch={(b) => patch(open.id, b)} onDelete={() => remove(open.id)} onCopy={async () => {
                try { await navigator.clipboard.writeText(toBrief(open)); say("복사했어요 — 대본메이커에 붙여 넣으세요"); } catch { say("복사하지 못했어요"); }
            }} />}

            {captureOpen && capture && <CaptureDialog capture={capture} onDone={(idea) => {
                setCaptureOpen(false);
                window.history.replaceState(null, "", "/idea");
                if (idea) {
                    upsert(idea);
                    say("담았어요");
                    if (window.opener) setTimeout(() => window.close(), 700);
                }
            }} />}

            {toast && <div className="oi-toast" role="status">{toast}</div>}
        </div>
    );
}

function Thumb({ src, alt }: { src: string; alt: string }) {
    const [broken, setBroken] = useState(false);
    if (broken) return null;
    // 외부 사이트 썸네일 — next/image 원격 도메인 목록에 둘 수 없어 그대로 쓴다.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="oi-thumb" src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
}

function Card({ idea, onOpen, onStar, onTag }: { idea: Idea; onOpen: () => void; onStar: () => void; onTag: (t: string) => void }) {
    const lead = idea.links.find((l) => l.image) ?? idea.links[0];
    return (
        <article className={`oi-card oi-card--${idea.status}${idea.star ? " is-star" : ""}`}>
            <button type="button" className="oi-card-hit" onClick={onOpen} aria-label={`${idea.title} 열기`} />
            {lead?.image && <Thumb src={lead.image} alt="" />}
            <div className="oi-card-body">
                <div className="oi-card-meta">
                    <span className="oi-site">{lead ? (lead.site || hostOf(lead.url)) : "메모"}{idea.links.length > 1 ? ` 외 ${idea.links.length - 1}` : ""}</span>
                    {idea.due && <DueBadge due={idea.due} status={idea.status} />}
                    <button type="button" className={`oi-star${idea.star ? " on" : ""}`} onClick={onStar} aria-pressed={idea.star} aria-label="별표">★</button>
                </div>
                <h3 className="oi-title">{idea.title}</h3>
                {idea.memo && <p className="oi-memo">{idea.memo}</p>}
                <div className="oi-card-foot">
                    <span className={`oi-status oi-status--${idea.status}`}>{STATUSES[idea.status]}</span>
                    <Steps status={idea.status} />
                    <span className="oi-tags">
                        {idea.tags.slice(0, 3).map((t) => <button key={t} type="button" onClick={() => onTag(t)}>#{t}</button>)}
                    </span>
                    <time dateTime={idea.createdAt}>{ago(idea.createdAt)}</time>
                </div>
            </div>
        </article>
    );
}

function Sheet({ idea, onClose, onPatch, onDelete, onCopy }: {
    idea: Idea;
    onClose: () => void;
    onPatch: (body: Record<string, unknown>) => Promise<Idea | null>;
    onDelete: () => void;
    onCopy: () => void;
}) {
    const [title, setTitle] = useState(idea.title);
    const [memo, setMemo] = useState(idea.memo);
    const [tags, setTags] = useState(idea.tags.join(", "));
    const [link, setLink] = useState("");
    const [adding, setAdding] = useState(false);
    const memoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // 메모는 멈추고 1초 뒤 저장(닫을 때도 저장)
    const saveMemo = useCallback((value: string) => {
        clearTimeout(memoTimer.current);
        if (value !== idea.memo) onPatch({ memo: value });
    }, [idea.memo, onPatch]);

    function close() {
        clearTimeout(memoTimer.current);
        const body: Record<string, unknown> = {};
        if (title.trim() && title.trim() !== idea.title) body.title = title;
        if (memo !== idea.memo) body.memo = memo;
        const t = normalizeTags(tags);
        if (t.join(",") !== idea.tags.join(",")) body.tags = t;
        if (Object.keys(body).length) onPatch(body);
        onClose();
    }

    async function addLink(e: React.FormEvent) {
        e.preventDefault();
        const url = link.trim();
        if (!url) return;
        setAdding(true);
        const ok = await onPatch({ addLink: /^https?:\/\//i.test(url) ? url : `https://${url}` });
        setAdding(false);
        if (ok) setLink("");
    }

    return (
        <div className="oi-sheet-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
            <section className="oi-sheet" role="dialog" aria-modal aria-label="아이디어 자세히" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}>
                <div className="oi-sheet-head">
                    <button type="button" className={`oi-star oi-star--lg${idea.star ? " on" : ""}`} onClick={() => onPatch({ star: !idea.star })} aria-pressed={idea.star} aria-label="별표">★</button>
                    <span className="oi-sheet-date">{idea.createdAt.slice(0, 10).replaceAll("-", ".")} 담음</span>
                    <button type="button" className="oi-icon-btn" onClick={close} aria-label="닫기">
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                </div>

                <textarea
                    className="oi-sheet-title"
                    value={title}
                    rows={2}
                    maxLength={200}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => { if (title.trim() && title.trim() !== idea.title) onPatch({ title }); }}
                    aria-label="제목"
                />

                <div className="oi-field">
                    <span className="oi-label">단계</span>
                    <div className="oi-seg" role="radiogroup" aria-label="단계">
                        {STATUS_KEYS.map((s) => (
                            <button key={s} type="button" role="radio" aria-checked={idea.status === s} className={`${idea.status === s ? "on" : ""} oi-seg--${s}`} onClick={() => onPatch({ status: s })}>
                                {STATUSES[s]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="oi-field-row">
                    <label className="oi-field">
                        <span className="oi-label">시의성 마감 <em>이 날 지나면 김새는 주제</em></span>
                        <span className="oi-due-input">
                            <input type="date" value={idea.due ?? ""} onChange={(e) => onPatch({ due: e.target.value || null })} />
                            {idea.due && <button type="button" onClick={() => onPatch({ due: null })}>지우기</button>}
                        </span>
                    </label>
                    <label className="oi-field">
                        <span className="oi-label">태그 <em>쉼표로 구분</em></span>
                        <input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            onBlur={() => { const t = normalizeTags(tags); if (t.join(",") !== idea.tags.join(",")) onPatch({ tags: t }); }}
                            placeholder="경제, 미국, 반도체"
                        />
                    </label>
                </div>

                <label className="oi-field">
                    <span className="oi-label">메모 <em>훅·각도·썸네일 문구·구성</em></span>
                    <textarea
                        className="oi-memo-input"
                        value={memo}
                        rows={7}
                        onChange={(e) => {
                            setMemo(e.target.value);
                            clearTimeout(memoTimer.current);
                            const v = e.target.value;
                            memoTimer.current = setTimeout(() => { if (v !== idea.memo) onPatch({ memo: v }); }, 1000);
                        }}
                        onBlur={() => saveMemo(memo)}
                        placeholder={"왜 지금 이 이야기인가?\n첫 30초 훅:\n썸네일 문구:"}
                    />
                </label>

                <div className="oi-field">
                    <span className="oi-label">자료 {idea.links.length > 0 && <em>{idea.links.length}개</em>}</span>
                    <ul className="oi-links">
                        {idea.links.map((l, i) => (
                            <li key={`${l.url}-${i}`}>
                                {l.image ? <Thumb src={l.image} alt="" /> : <span className="oi-link-dot" />}
                                <a href={l.url} target="_blank" rel="noopener noreferrer">
                                    <b>{l.title || hostOf(l.url)}</b>
                                    <span>{l.site || hostOf(l.url)}</span>
                                </a>
                                <button type="button" aria-label="자료 빼기" onClick={() => onPatch({ links: idea.links.filter((_, j) => j !== i) })}>×</button>
                            </li>
                        ))}
                    </ul>
                    <form className="oi-add-link" onSubmit={addLink}>
                        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="자료 링크 더하기" inputMode="url" />
                        <button type="submit" className="oi-btn" disabled={adding || !link.trim()}>{adding ? "읽는 중…" : "더하기"}</button>
                    </form>
                </div>

                <div className="oi-sheet-foot">
                    <button type="button" className="oi-btn oi-btn--primary" onClick={onCopy}>대본메이커용 복사</button>
                    <button type="button" className="oi-btn oi-btn--ghost-danger" onClick={onDelete}>지우기</button>
                </div>
            </section>
        </div>
    );
}

function CaptureDialog({ capture, onDone }: { capture: NonNullable<Capture>; onDone: (idea: Idea | null) => void }) {
    const [title, setTitle] = useState(capture.title);
    const [memo, setMemo] = useState("");
    const [tags, setTags] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const { idea } = await api<{ idea: Idea }>("/api/idea/items", {
                method: "POST",
                body: JSON.stringify({ title: title.trim(), memo, tags: normalizeTags(tags), links: [{ url: capture.url, ...(title.trim() ? { title: title.trim() } : {}) }] }),
            });
            onDone(idea);
        } catch (err) {
            setError((err as Error).message);
            setBusy(false);
        }
    }

    return (
        <div className="oi-sheet-wrap oi-sheet-wrap--center">
            <form className="oi-sheet oi-capture-dialog" onSubmit={save} role="dialog" aria-modal aria-label="이 페이지 담기">
                <p className="oi-label">이 페이지 담기</p>
                <p className="oi-capture-url">{hostOf(capture.url)}</p>
                <textarea className="oi-sheet-title" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" autoFocus maxLength={200} />
                <label className="oi-field">
                    <span className="oi-label">왜 담았나 <em>한 줄이면 충분</em></span>
                    <textarea className="oi-memo-input" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
                </label>
                <label className="oi-field">
                    <span className="oi-label">태그</span>
                    <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="경제, 미국" />
                </label>
                {error && <p className="oi-error" role="alert">{error}</p>}
                <div className="oi-sheet-foot">
                    <button type="submit" className="oi-btn oi-btn--primary" disabled={busy}>{busy ? "담는 중…" : "담기"}</button>
                    <button type="button" className="oi-btn" onClick={() => (window.opener ? window.close() : onDone(null))}>취소</button>
                </div>
            </form>
        </div>
    );
}

function Bookmarklet() {
    const ref = useRef<HTMLAnchorElement>(null);
    // React 는 javascript: 주소를 막으므로 DOM 에 직접 넣는다.
    useEffect(() => {
        const code = `javascript:(()=>{window.open('${window.location.origin}/idea?add='+encodeURIComponent(location.href)+'&t='+encodeURIComponent(document.title),'oykidea','width=520,height=680')})()`;
        ref.current?.setAttribute("href", code);
    }, []);
    return (
        <div className="oi-bm">
            <a ref={ref} className="oi-bm-btn" onClick={(e) => e.preventDefault()} draggable>＋ OYK 담기</a>
            <p>이 버튼을 즐겨찾기 막대로 끌어다 놓으세요. 어느 사이트에서든 누르면 보고 있던 페이지가 여기로 담겨요. 컴퓨터마다 한 번씩.</p>
        </div>
    );
}
