"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    IDEA_CATEGORIES, IDEA_STATUS, LIMITS, MEMBERS, memberOf,
    type CrewItem, type IdeaStatus, type Kind, type MemberKey,
} from "@/lib/deepmakai/shared";

const TABS: { kind: Kind; label: string }[] = [
    { kind: "notice", label: "공지" },
    { kind: "idea", label: "아이디어" },
    { kind: "talk", label: "잡담" },
];
const PIPE: IdeaStatus[] = ["new", "review", "picked", "shooting", "done"];
const WEEK_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEK_KR = ["일", "월", "화", "수", "목", "금", "토"];
type Load = "idle" | "loading" | "ready" | "missing" | "error";

const store = {
    get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

function ago(iso: string) {
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return "방금";
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
const pad = (n: number) => String(n).padStart(2, "0");
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dateOf = (it: CrewItem) => (typeof it.meta?.date === "string" ? (it.meta.date as string) : "");
function dday(key: string) {
    const [y, m, d] = key.split("-").map(Number);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d).getTime() - t.getTime()) / 86_400_000);
}

function Oct({ who, lg }: { who: string; lg?: boolean }) {
    const m = memberOf(who);
    return <span className={`oct m-${m?.key ?? "pd"}${lg ? " lg" : ""}`} aria-hidden="true">{m?.key === "pd" ? "PD" : (m?.name ?? "?").slice(0, 1)}</span>;
}

function Mark() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M8.4 2.5h7.2l5.9 5.9v7.2l-5.9 5.9H8.4l-5.9-5.9V8.4z" />
        </svg>
    );
}

export default function CrewBoard({ token }: { token: string }) {
    const api = `/api/deepmakai/${token}/items`;
    const [me, setMe] = useState<MemberKey | null>(null);
    const [picking, setPicking] = useState(false);
    const [tab, setTab] = useState<Kind>("idea");
    const [items, setItems] = useState<Record<Kind, CrewItem[]>>({ notice: [], idea: [], talk: [] });
    const [load, setLoad] = useState<Record<Kind, Load>>({ notice: "idle", idea: "idle", talk: "idle" });
    const [preview, setPreview] = useState(false);
    const [flash, setFlash] = useState("");
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);

    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [category, setCategory] = useState<string>(IDEA_CATEGORIES[0]);
    const [date, setDate] = useState("");
    const [place, setPlace] = useState("");
    const [composeOpen, setComposeOpen] = useState(false);
    const [posting, setPosting] = useState(false);

    const [open, setOpen] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [hitId, setHitId] = useState<string | null>(null);

    const [catFilter, setCatFilter] = useState("전체");
    const [sort, setSort] = useState<"new" | "hot">("new");

    const talkEnd = useRef<HTMLDivElement>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const say = useCallback((msg: string) => {
        setFlash(msg);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(""), 2800);
    }, []);

    useEffect(() => {
        const saved = store.get("dm-crew-me");
        if (saved && MEMBERS.some((m) => m.key === saved)) setMe(saved as MemberKey);
        else setPicking(true);
        const t = store.get("dm-crew-tab");
        if (t === "notice" || t === "idea" || t === "talk") setTab(t);
    }, []);

    const fetchKind = useCallback(async (kind: Kind, quiet = false) => {
        if (!quiet) setLoad((s) => ({ ...s, [kind]: s[kind] === "ready" ? "ready" : "loading" }));
        try {
            const res = await fetch(`${api}?kind=${kind}`, { cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (res.status === 503 && data.error === "table_missing") { setLoad((s) => ({ ...s, [kind]: "missing" })); return; }
            if (!res.ok) throw new Error(data.error || String(res.status));
            setItems((s) => ({ ...s, [kind]: data.items as CrewItem[] }));
            setLoad((s) => ({ ...s, [kind]: "ready" }));
            setPreview(!!data.preview);
            setUpdatedAt(Date.now());
        } catch {
            setLoad((s) => ({ ...s, [kind]: s[kind] === "ready" ? "ready" : "error" }));
            if (!quiet) say("불러오지 못했습니다. 연결을 확인하고 새로고침을 눌러 주세요.");
        }
    }, [api, say]);

    useEffect(() => { TABS.forEach((t) => fetchKind(t.kind)); }, [fetchKind]);

    useEffect(() => {
        const tick = () => { if (document.visibilityState === "visible") fetchKind(tab, true); };
        const id = setInterval(tick, 20000);
        document.addEventListener("visibilitychange", tick);
        return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
    }, [tab, fetchKind]);

    useEffect(() => { if (tab === "talk") talkEnd.current?.scrollIntoView({ block: "end" }); }, [tab, items.talk.length]);

    const chooseMe = (key: MemberKey) => { setMe(key); store.set("dm-crew-me", key); setPicking(false); };
    const chooseTab = (k: Kind) => {
        setTab(k); store.set("dm-crew-tab", k);
        setEditingId(null); setConfirmId(null); setOpen(null); setComposeOpen(false);
    };
    const replaceItem = (it: CrewItem) => setItems((s) => ({ ...s, [it.kind]: s[it.kind].map((x) => (x.id === it.id ? it : x)) }));

    async function post() {
        if (!me) { setPicking(true); say("먼저 누구인지 골라 주세요."); return; }
        const text = body.trim() || (tab === "idea" ? title.trim() : "");
        if (!text) { say(tab === "talk" ? "메시지를 적어 주세요." : "내용을 적어 주세요."); return; }
        if (tab !== "talk" && !title.trim()) { say("제목을 적어 주세요."); return; }
        setPosting(true);
        try {
            const res = await fetch(api, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: tab, author: me, title, body: text, category, date, place }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 503) { setLoad((s) => ({ ...s, [tab]: "missing" })); return; }
            if (res.status === 429) { say("잠깐만요. 조금 뒤에 다시 올려 주세요."); return; }
            if (!res.ok) throw new Error(data.error);
            setItems((s) => ({ ...s, [tab]: [data.item as CrewItem, ...s[tab]] }));
            setTitle(""); setBody(""); setPlace(""); setDate(""); setComposeOpen(false);
            say(tab === "idea" ? "아이디어를 던졌습니다." : tab === "notice" ? "공지를 올렸습니다." : "");
        } catch {
            say("올리지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
        } finally {
            setPosting(false);
        }
    }

    async function patch(item: CrewItem, payload: Record<string, unknown>, okMsg?: string) {
        if (!me) { setPicking(true); return; }
        try {
            const res = await fetch(`${api}/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ member: me, ...payload }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 403) { say("글쓴이나 PD만 바꿀 수 있습니다."); return; }
            if (!res.ok) throw new Error(data.error);
            replaceItem(data.item as CrewItem);
            if (okMsg) say(okMsg);
        } catch {
            say("저장하지 못했습니다. 잠시 뒤 다시 해 주세요.");
        }
    }

    async function remove(item: CrewItem) {
        if (!me) return;
        try {
            const res = await fetch(`${api}/${item.id}?member=${me}`, { method: "DELETE" });
            if (res.status === 403) { say("글쓴이나 PD만 지울 수 있습니다."); return; }
            if (!res.ok) throw new Error();
            setItems((s) => ({ ...s, [item.kind]: s[item.kind].filter((x) => x.id !== item.id) }));
            setConfirmId(null);
            say("지웠습니다.");
        } catch {
            say("지우지 못했습니다. 잠시 뒤 다시 해 주세요.");
        }
    }

    function punch(it: CrewItem) {
        if (!me) { setPicking(true); return; }
        setHitId(it.id);
        setTimeout(() => setHitId((h) => (h === it.id ? null : h)), 340);
        patch(it, { op: "react", key: "fist" });
    }

    const canManage = (it: CrewItem) => !!me && (me === "pd" || me === it.author);
    const startEdit = (it: CrewItem) => { setEditingId(it.id); setEditTitle(it.title || ""); setEditBody(it.body); setConfirmId(null); };
    async function saveEdit(it: CrewItem) {
        await patch(it, { op: "edit", title: it.kind === "talk" ? undefined : editTitle, body: editBody }, "고쳤습니다.");
        setEditingId(null);
    }

    // 렌더 함수 — 이 안에서 컴포넌트로 정의하면 렌더마다 다시 마운트돼 입력칸이 포커스를 잃는다.
    function manage(it: CrewItem) {
        if (!canManage(it)) return null;
        const cls = "linkbtn";
        if (confirmId === it.id) {
            return (
                <span className="meta" role="group" aria-label="삭제 확인">
                    지울까요?
                    <button type="button" className={`${cls} danger`} onClick={() => remove(it)}>지우기</button>
                    <button type="button" className={cls} onClick={() => setConfirmId(null)}>취소</button>
                </span>
            );
        }
        return (
            <span className="meta">
                <button type="button" className={cls} onClick={() => startEdit(it)}>고치기</button>
                <button type="button" className={`${cls} danger`} onClick={() => { setConfirmId(it.id); setEditingId(null); }}>지우기</button>
            </span>
        );
    }

    function editBox(it: CrewItem) {
        return (
            <div style={{ display: "grid", gap: 8 }}>
                {it.kind !== "talk" && <input className="input" value={editTitle} maxLength={LIMITS.title} onChange={(e) => setEditTitle(e.target.value)} aria-label="제목 고치기" />}
                <textarea className="textarea" value={editBody} maxLength={LIMITS.body} onChange={(e) => setEditBody(e.target.value)} aria-label="내용 고치기" />
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn" onClick={() => saveEdit(it)}>저장</button>
                    <button type="button" className="btn ghost" onClick={() => setEditingId(null)}>취소</button>
                </div>
            </div>
        );
    }

    function pipeline(it: CrewItem) {
        const st = (it.status || "new") as IdeaStatus;
        const idx = PIPE.indexOf(st);
        const isPd = me === "pd";
        const cls = `pipe${st === "done" ? " done" : ""}${st === "hold" ? " hold" : ""}`;
        return (
            <div className={cls}>
                <div className="pipe-bar" role={isPd ? "group" : undefined} aria-label={isPd ? "진행 단계 바꾸기" : undefined}>
                    {PIPE.map((p, i) => isPd ? (
                        <button key={p} type="button" className="pipe-hit" aria-label={`${IDEA_STATUS[p]} 단계로`}
                            aria-pressed={p === st} onClick={() => patch(it, { op: "status", status: p }, `‘${IDEA_STATUS[p]}’ 단계로 옮겼습니다.`)}>
                            <span className={`pipe-seg${i <= idx ? " on" : ""}`} />
                        </button>
                    ) : (
                        <span key={p} className={`pipe-seg${i <= idx ? " on" : ""}`} />
                    ))}
                </div>
                <div className="pipe-label">
                    <span><b>{IDEA_STATUS[st]}</b>{st !== "hold" && idx >= 0 ? <span className="mono"> · {idx + 1}/5</span> : null}</span>
                    {isPd && (
                        <button type="button" className="linkbtn" onClick={() => patch(it, { op: "status", status: st === "hold" ? "review" : "hold" })}>
                            {st === "hold" ? "보류 풀기" : "보류"}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ---------- 파생 목록 ----------
    const ideas = useMemo(() => {
        let list = items.idea;
        if (catFilter !== "전체") list = list.filter((i) => i.meta?.category === catFilter);
        if (sort === "hot") list = [...list].sort((a, b) => (b.reactions?.fist?.length || 0) - (a.reactions?.fist?.length || 0));
        return list;
    }, [items.idea, catFilter, sort]);

    const notices = useMemo(() => {
        const today = todayKey();
        const upcoming = items.notice.filter((i) => dateOf(i) >= today).sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
        const next = upcoming[0] ?? null;
        const rest = [...upcoming.slice(1), ...items.notice.filter((i) => !(dateOf(i) >= today))];
        return { next, rest };
    }, [items.notice]);

    const talk = useMemo(() => [...items.talk].reverse(), [items.talk]);
    const current = load[tab];
    const meInfo = me ? memberOf(me) : null;

    function stateBox() {
        if (current === "missing") return <div className="alert" role="status"><b>방을 준비하고 있습니다</b><span className="meta">저장 공간이 아직 만들어지지 않았습니다. PD가 준비를 마치면 바로 쓸 수 있습니다.</span></div>;
        if (current === "error" && items[tab].length === 0) return <div className="alert" role="alert"><b>불러오지 못했습니다</b><span className="meta">연결을 확인하고 아래 새로고침을 눌러 주세요.</span></div>;
        if ((current === "loading" || current === "idle") && items[tab].length === 0) return <div className="empty">불러오는 중…</div>;
        return null;
    }
    const blocked = stateBox();

    return (
        <>
            {preview && <p className="preview-strip" role="note"><b>로컬 미리보기</b> · 예시 글입니다. 여기서 쓴 글은 이 PC 개발 서버에만 잠깐 남습니다.</p>}

            <div className="cr-wrap">
                <header className="cr-top">
                    <span className="cr-mark"><Mark /> DEEP MAKAI CREW</span>
                    {me && !picking && (
                        <button type="button" className="cr-me" onClick={() => setPicking(true)} aria-label={`${meInfo?.name}(으)로 들어와 있음. 바꾸기`}>
                            <Oct who={me} /> {me === "pd" ? "제작 PD" : meInfo?.name}
                        </button>
                    )}
                </header>

                <section className="cr-hero">
                    <h1 className="cr-h1">크루룸</h1>
                    <p className="cr-lede">PD와 선수 네 명만 쓰는 방. 촬영 공지, 아이디어, 잡담을 한곳에서.</p>
                </section>

                {(picking || !me) && (
                    <section className="cr-who" aria-labelledby="who-h">
                        <h2 id="who-h">누구세요?</h2>
                        <div className="cr-people" role="group" aria-label="멤버 선택">
                            {MEMBERS.map((m) => (
                                <button key={m.key} type="button" className="cr-person" aria-pressed={me === m.key} onClick={() => chooseMe(m.key)}>
                                    <Oct who={m.key} lg />
                                    <b>{m.name}</b>
                                    <small>{m.key === "pd" ? "제작" : "진행"}</small>
                                </button>
                            ))}
                        </div>
                        <span className="meta">한 번 고르면 이 기기가 기억합니다.</span>
                    </section>
                )}
            </div>

            <nav className="cr-tabs-bar" aria-label="게시판">
                <div className="cr-wrap">
                    <div className="cr-tabs" role="tablist">
                        {TABS.map((t) => (
                            <button key={t.kind} type="button" role="tab" id={`tab-${t.kind}`} aria-controls="panel" aria-selected={tab === t.kind}
                                className="cr-tab" onClick={() => chooseTab(t.kind)}>
                                {t.label}<span className="n">{items[t.kind].length}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <main className="cr-wrap cr-main" id="panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
                {/* ---------------- 아이디어 ---------------- */}
                {tab === "idea" && (
                    <>
                        <form className={`throw${composeOpen ? " open" : ""}`} onSubmit={(e) => { e.preventDefault(); post(); }}>
                            <div className="throw-line">
                                <label className="sr" htmlFor="throw">아이디어 한 줄</label>
                                <input id="throw" className="input" value={title} maxLength={LIMITS.title} placeholder="아이디어 한 줄 던지기"
                                    onFocus={() => setComposeOpen(true)} onChange={(e) => setTitle(e.target.value)} />
                                {!composeOpen && <button type="button" className="btn accent" onClick={() => setComposeOpen(true)}>던지기</button>}
                            </div>
                            {composeOpen && (
                                <div className="throw-more">
                                    <div className="chips" role="group" aria-label="종류">
                                        {IDEA_CATEGORIES.map((c) => (
                                            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
                                        ))}
                                    </div>
                                    <label className="sr" htmlFor="throw-body">자세히</label>
                                    <textarea id="throw-body" className="textarea" value={body} maxLength={LIMITS.body} onChange={(e) => setBody(e.target.value)}
                                        placeholder="어떤 그림인지, 누구를 부를지, 어디서 찍을지 (선택)" />
                                    <div className="row-between">
                                        <span className="meta">{meInfo ? `${meInfo.name} 이름으로 올라갑니다` : "누구인지 먼저 골라 주세요"}</span>
                                        <span style={{ display: "flex", gap: 8 }}>
                                            <button type="button" className="btn ghost" onClick={() => setComposeOpen(false)}>접기</button>
                                            <button type="submit" className="btn accent" disabled={posting || !me}>{posting ? "던지는 중…" : "던지기"}</button>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </form>

                        <div className="row-between">
                            <div className="chips" role="group" aria-label="종류로 보기">
                                {["전체", ...IDEA_CATEGORIES].map((c) => (
                                    <button key={c} type="button" className="chip" aria-pressed={catFilter === c} onClick={() => setCatFilter(c)}>{c}</button>
                                ))}
                            </div>
                            <button type="button" className="chip" aria-pressed={sort === "hot"} onClick={() => setSort(sort === "hot" ? "new" : "hot")}>
                                {sort === "hot" ? "펀치 많은 순" : "최신 순"}
                            </button>
                        </div>

                        {blocked}
                        {!blocked && ideas.length === 0 && <div className="empty">{items.idea.length ? "이 종류의 아이디어는 아직 없어요." : "첫 아이디어를 던져 주세요."}</div>}

                        {ideas.map((it) => {
                            const who = it.reactions?.fist || [];
                            const mine = !!me && who.includes(me);
                            const isOpen = open === it.id;
                            return (
                                <article key={it.id} className="card">
                                    <div className="idea">
                                        <button type="button" className={`punch${hitId === it.id ? " hit" : ""}`} aria-pressed={mine} onClick={() => punch(it)}
                                            aria-label={`펀치 ${who.length}${mine ? ", 내가 누름" : ""}`}>
                                            <span className="count">{who.length}</span>
                                            <span className="lbl">PUNCH</span>
                                        </button>
                                        <div className="idea-main">
                                            {editingId === it.id ? editBox(it) : (
                                                <>
                                                    <h3 className="idea-title">
                                                        <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : it.id)}>{it.title}</button>
                                                    </h3>
                                                    {it.body && it.body !== it.title && (
                                                        isOpen ? <p className="body-text">{it.body}</p> : <p className="clamp">{it.body}</p>
                                                    )}
                                                </>
                                            )}
                                            <div className="meta">
                                                <span className="tag">{(it.meta?.category as string) || "기타"}</span>
                                                <span>{memberOf(it.author)?.name} · {ago(it.created_at)}</span>
                                            </div>
                                            {pipeline(it)}
                                            {isOpen && (
                                                <div className="row-between">
                                                    <span className="who-punched">{who.length ? `펀치: ${who.map((k) => memberOf(k)?.name).filter(Boolean).join(", ")}` : "아직 펀치가 없어요"}</span>
                                                    {manage(it)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </>
                )}

                {/* ---------------- 공지 ---------------- */}
                {tab === "notice" && (
                    <>
                        {blocked}
                        {notices.next && (() => {
                            const it = notices.next;
                            const k = dateOf(it);
                            const n = dday(k);
                            const d = new Date(`${k}T00:00:00`);
                            return (
                                <article className="card next">
                                    <div className="next-top">
                                        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                                            <span className="next-kicker">NEXT</span>
                                            {editingId === it.id ? editBox(it) : <h3>{it.title}</h3>}
                                        </div>
                                        <span className={`dday${n === 0 ? " today" : ""}`}>{n === 0 ? "D-DAY" : `D-${n}`}</span>
                                    </div>
                                    <div className="meta">
                                        <span className="mono">{d.getMonth() + 1}.{pad(d.getDate())} {WEEK_KR[d.getDay()]}</span>
                                        {typeof it.meta?.place === "string" && <span className="place">{it.meta.place as string}</span>}
                                    </div>
                                    {editingId !== it.id && <p className="body-text">{it.body}</p>}
                                    <div className="row-between">
                                        <span className="meta">{memberOf(it.author)?.name} · {ago(it.created_at)}</span>
                                        {manage(it)}
                                    </div>
                                </article>
                            );
                        })()}

                        {composeOpen ? (
                            <form className="card" onSubmit={(e) => { e.preventDefault(); post(); }} aria-label="공지 쓰기">
                                <label className="field" htmlFor="n-title">제목
                                    <input id="n-title" className="input" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 다음 녹화 일정" />
                                </label>
                                <div className="two">
                                    <label className="field" htmlFor="n-date">날짜 (선택)
                                        <input id="n-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                                    </label>
                                    <label className="field" htmlFor="n-place">장소 (선택)
                                        <input id="n-place" className="input" value={place} maxLength={80} onChange={(e) => setPlace(e.target.value)} placeholder="예: 신사동 체육관 B1" />
                                    </label>
                                </div>
                                <label className="field" htmlFor="n-body">내용
                                    <textarea id="n-body" className="textarea" value={body} maxLength={LIMITS.body} onChange={(e) => setBody(e.target.value)} placeholder="시간, 준비물, 참고할 것" />
                                </label>
                                <div className="row-between">
                                    <span className="meta">날짜를 넣으면 가장 가까운 일정이 맨 위에 D-데이로 뜹니다.</span>
                                    <span style={{ display: "flex", gap: 8 }}>
                                        <button type="button" className="btn ghost" onClick={() => setComposeOpen(false)}>취소</button>
                                        <button type="submit" className="btn accent" disabled={posting || !me}>{posting ? "올리는 중…" : "공지 올리기"}</button>
                                    </span>
                                </div>
                            </form>
                        ) : (
                            <button type="button" className="btn ghost" onClick={() => setComposeOpen(true)}>+ 공지 올리기</button>
                        )}

                        {!blocked && items.notice.length === 0 && <div className="empty">아직 공지가 없어요.</div>}

                        {notices.rest.map((it) => {
                            const k = dateOf(it);
                            const d = k ? new Date(`${k}T00:00:00`) : null;
                            const past = !!k && k < todayKey();
                            return (
                                <article key={it.id} className={`card notice${past ? " past" : ""}`}>
                                    <div className="date-block" aria-label={d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : "날짜 없음"}>
                                        {d ? (<><div className="md">{pad(d.getMonth() + 1)}.{pad(d.getDate())}</div><div className="dw">{WEEK_EN[d.getDay()]}</div></>) : <div className="dw">MEMO</div>}
                                    </div>
                                    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                        {editingId === it.id ? editBox(it) : (
                                            <>
                                                <h3>{it.title}</h3>
                                                {typeof it.meta?.place === "string" && <span className="meta">{it.meta.place as string}</span>}
                                                <p className="body-text">{it.body}</p>
                                            </>
                                        )}
                                        <div className="row-between">
                                            <span className="meta">{memberOf(it.author)?.name} · {ago(it.created_at)}{past ? " · 지난 일정" : ""}</span>
                                            {manage(it)}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </>
                )}

                {/* ---------------- 잡담 ---------------- */}
                {tab === "talk" && (
                    <>
                        {blocked}
                        {!blocked && talk.length === 0 && <div className="empty">첫 한마디를 남겨 주세요.</div>}
                        <div className="talk" aria-live="polite">
                            {talk.map((it) => (
                                <div key={it.id} className={`msg${it.author === me ? " mine" : ""}`}>
                                    {it.author !== me && <Oct who={it.author} />}
                                    <div className="bubble">
                                        <div className="by">{memberOf(it.author)?.name}</div>
                                        {editingId === it.id ? editBox(it) : <p className="body-text">{it.body}</p>}
                                        <time dateTime={it.created_at}>{ago(it.created_at)}</time>
                                        {canManage(it) && editingId !== it.id && <div style={{ marginTop: 2 }}>{manage(it)}</div>}
                                    </div>
                                </div>
                            ))}
                            <div ref={talkEnd} />
                        </div>
                        <form className="talk-compose" onSubmit={(e) => { e.preventDefault(); post(); }}>
                            <label className="sr" htmlFor="talk-in">메시지</label>
                            <input id="talk-in" className="input" value={body} maxLength={LIMITS.body} onChange={(e) => setBody(e.target.value)}
                                placeholder={me ? "메시지 보내기" : "누구인지 먼저 골라 주세요"} />
                            <button type="submit" className="btn accent" disabled={posting || !me || !body.trim()}>보내기</button>
                        </form>
                    </>
                )}

                <footer className="foot">
                    <span>주소를 아는 사람만 들어오는 방입니다. 밖에 공유하지 마세요.</span>
                    <span>
                        {updatedAt ? <span className="mono">{new Date(updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · </span> : null}
                        <button type="button" className="linkbtn" onClick={() => TABS.forEach((t) => fetchKind(t.kind))}>새로고침</button>
                    </span>
                </footer>
            </main>

            <div className="toast" role="status" aria-live="polite" style={{ opacity: flash ? 1 : 0 }}>{flash}</div>
        </>
    );
}
