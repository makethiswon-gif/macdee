"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    IDEA_CATEGORIES, IDEA_STATUS, LIMITS, MEMBERS, memberOf,
    type CrewItem, type IdeaStatus, type Kind, type MemberKey,
} from "@/lib/deepmakai/shared";

const TABS: { kind: Kind; label: string; en: string }[] = [
    { kind: "notice", label: "공지", en: "NOTICE" },
    { kind: "idea", label: "아이디어", en: "IDEA BOX" },
    { kind: "talk", label: "잡담", en: "TALK" },
];
type Load = "idle" | "loading" | "ready" | "missing" | "error";
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

const store = {
    get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

function ago(iso: string) {
    const t = new Date(iso).getTime();
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return "방금";
    if (s < 3600) return `${Math.floor(s / 60)}분 전`;
    if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Fist() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6.2 10.4c0-1.2 1-2.1 2.1-2.1h.4V7c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v.3h.2V6.6c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v1.1c1 .1 1.8.9 1.8 1.9v4.6c0 3.4-2.8 6.2-6.2 6.2h-1c-2.8 0-5.1-2.3-5.1-5.1v-2.6c-.8-.3-1.2-.9-1.2-1.7z" />
        </svg>
    );
}

function Avatar({ author }: { author: string }) {
    const m = memberOf(author);
    return <span className={`av tone-${m?.tone ?? "indigo"}`} aria-hidden="true">{(m?.name ?? "?").slice(0, 1)}</span>;
}

export default function CrewBoard({ token }: { token: string }) {
    const api = `/api/deepmakai/${token}/items`;
    const [me, setMe] = useState<MemberKey | null>(null);
    const [picking, setPicking] = useState(false);
    const [tab, setTab] = useState<Kind>("idea");
    const [items, setItems] = useState<Record<Kind, CrewItem[]>>({ notice: [], idea: [], talk: [] });
    const [load, setLoad] = useState<Record<Kind, Load>>({ notice: "idle", idea: "idle", talk: "idle" });
    const [flash, setFlash] = useState("");
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);

    // 작성 폼
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [category, setCategory] = useState<string>(IDEA_CATEGORIES[0]);
    const [date, setDate] = useState("");
    const [place, setPlace] = useState("");
    const [posting, setPosting] = useState(false);

    // 편집·삭제
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [confirmId, setConfirmId] = useState<string | null>(null);

    // 아이디어 필터
    const [catFilter, setCatFilter] = useState<string>("전체");
    const [statusFilter, setStatusFilter] = useState<string>("전체");
    const [sort, setSort] = useState<"new" | "hot">("new");

    const talkEnd = useRef<HTMLDivElement>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const say = useCallback((msg: string) => {
        setFlash(msg);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(""), 3200);
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
            setUpdatedAt(Date.now());
        } catch {
            setLoad((s) => ({ ...s, [kind]: s[kind] === "ready" ? "ready" : "error" }));
            if (!quiet) say("불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침을 눌러 주세요.");
        }
    }, [api, say]);

    useEffect(() => { TABS.forEach((t) => fetchKind(t.kind)); }, [fetchKind]);

    // 보고 있을 때만 20초마다 새 글 확인
    useEffect(() => {
        const tick = () => { if (document.visibilityState === "visible") fetchKind(tab, true); };
        const id = setInterval(tick, 20000);
        document.addEventListener("visibilitychange", tick);
        return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
    }, [tab, fetchKind]);

    useEffect(() => {
        if (tab === "talk") talkEnd.current?.scrollIntoView({ block: "end" });
    }, [tab, items.talk.length]);

    const chooseMe = (key: MemberKey) => { setMe(key); store.set("dm-crew-me", key); setPicking(false); };
    const chooseTab = (k: Kind) => { setTab(k); store.set("dm-crew-tab", k); setEditingId(null); setConfirmId(null); };

    const replaceItem = (it: CrewItem) => setItems((s) => ({ ...s, [it.kind]: s[it.kind].map((x) => (x.id === it.id ? it : x)) }));

    async function post() {
        if (!me) { setPicking(true); say("먼저 누구인지 골라 주세요."); return; }
        const text = body.trim();
        if (!text) { say("내용을 적어 주세요."); return; }
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
            if (res.status === 429) { say("너무 빨리 올리고 있어요. 잠시 뒤에 다시 올려 주세요."); return; }
            if (!res.ok) throw new Error(data.error);
            setItems((s) => ({ ...s, [tab]: [data.item as CrewItem, ...s[tab]] }));
            setTitle(""); setBody(""); setPlace(""); setDate("");
            say(tab === "idea" ? "아이디어를 걸었습니다." : tab === "notice" ? "공지를 올렸습니다." : "보냈습니다.");
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

    const canManage = (it: CrewItem) => !!me && (me === "pd" || me === it.author);

    const ideas = useMemo(() => {
        let list = items.idea;
        if (catFilter !== "전체") list = list.filter((i) => i.meta?.category === catFilter);
        if (statusFilter !== "전체") list = list.filter((i) => i.status === statusFilter);
        if (sort === "hot") list = [...list].sort((a, b) => (b.reactions?.fist?.length || 0) - (a.reactions?.fist?.length || 0));
        return list;
    }, [items.idea, catFilter, statusFilter, sort]);

    const notices = useMemo(() => {
        const today = todayKey();
        const withDate = (i: CrewItem) => (typeof i.meta?.date === "string" ? (i.meta.date as string) : "");
        const upcoming = items.notice.filter((i) => withDate(i) >= today).sort((a, b) => withDate(a).localeCompare(withDate(b)));
        const rest = items.notice.filter((i) => !(withDate(i) >= today));
        return { upcoming, rest };
    }, [items.notice]);

    const talk = useMemo(() => [...items.talk].reverse(), [items.talk]);
    const meInfo = me ? memberOf(me) : null;
    const current = load[tab];

    function startEdit(it: CrewItem) { setEditingId(it.id); setEditTitle(it.title || ""); setEditBody(it.body); setConfirmId(null); }
    async function saveEdit(it: CrewItem) {
        await patch(it, { op: "edit", title: it.kind === "talk" ? undefined : editTitle, body: editBody }, "고쳤습니다.");
        setEditingId(null);
    }

    // 아래 셋은 컴포넌트가 아니라 렌더 함수다. 이 함수 안에서 컴포넌트로 정의하면 렌더마다 새 타입이 되어
    // 수정칸이 한 글자마다 다시 마운트되고 포커스를 잃는다.
    function manage(it: CrewItem) {
        if (!canManage(it)) return null;
        if (confirmId === it.id) {
            return (
                <span className="dm-confirm" role="group" aria-label="삭제 확인">
                    지울까요?
                    <button type="button" className="dm-link danger" onClick={() => remove(it)}>지우기</button>
                    <button type="button" className="dm-link" onClick={() => setConfirmId(null)}>취소</button>
                </span>
            );
        }
        return (
            <span className="dm-confirm">
                <button type="button" className="dm-link" onClick={() => startEdit(it)}>고치기</button>
                <button type="button" className="dm-link danger" onClick={() => { setConfirmId(it.id); setEditingId(null); }}>지우기</button>
            </span>
        );
    }

    function editBox(it: CrewItem) {
        return (
            <div style={{ display: "grid", gap: 8 }}>
                {it.kind !== "talk" && (
                    <input className="dm-input" value={editTitle} maxLength={LIMITS.title} onChange={(e) => setEditTitle(e.target.value)} aria-label="제목 고치기" />
                )}
                <textarea className="dm-textarea" value={editBody} maxLength={LIMITS.body} onChange={(e) => setEditBody(e.target.value)} aria-label="내용 고치기" />
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="dm-btn" onClick={() => saveEdit(it)}>저장</button>
                    <button type="button" className="dm-btn ghost" onClick={() => setEditingId(null)}>취소</button>
                </div>
            </div>
        );
    }

    function fistButton(it: CrewItem) {
        const who = it.reactions?.fist || [];
        const mine = !!me && who.includes(me);
        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button type="button" className="dm-fist" aria-pressed={mine} onClick={() => patch(it, { op: "react", key: "fist" })}
                    aria-label={`주먹 인사 ${who.length}개${mine ? ", 내가 누름" : ""}`}>
                    <Fist /> {who.length}
                </button>
                {who.length > 0 && <span className="dm-who-reacted">{who.map((k) => memberOf(k)?.name).filter(Boolean).join(" · ")}</span>}
            </span>
        );
    }

    function renderCompose() {
        const disabled = posting || !me;
        return (
            <form className="dm-compose" onSubmit={(e) => { e.preventDefault(); post(); }} aria-label="새 글 쓰기">
                {tab === "idea" && (
                    <div className="row two">
                        <label className="dm-field" htmlFor="dm-cat">종류
                            <select id="dm-cat" className="dm-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                                {IDEA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </label>
                        <label className="dm-field" htmlFor="dm-title">한 줄 제목
                            <input id="dm-title" className="dm-input" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 계체 끝나고 첫 끼 먹방 회차" />
                        </label>
                    </div>
                )}
                {tab === "notice" && (
                    <>
                        <label className="dm-field" htmlFor="dm-title">제목
                            <input id="dm-title" className="dm-input" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 다음 녹화 일정" />
                        </label>
                        <div className="row two">
                            <label className="dm-field" htmlFor="dm-date">날짜 (선택)
                                <input id="dm-date" type="date" className="dm-input" value={date} onChange={(e) => setDate(e.target.value)} />
                            </label>
                            <label className="dm-field" htmlFor="dm-place">장소 (선택)
                                <input id="dm-place" className="dm-input" value={place} maxLength={80} onChange={(e) => setPlace(e.target.value)} placeholder="예: 신사동 체육관 B1" />
                            </label>
                        </div>
                    </>
                )}
                <label className="dm-field" htmlFor="dm-body">{tab === "talk" ? "메시지" : "내용"}
                    <textarea id="dm-body" className="dm-textarea" value={body} maxLength={LIMITS.body} onChange={(e) => setBody(e.target.value)}
                        style={tab === "talk" ? { minHeight: 60 } : undefined}
                        placeholder={tab === "idea" ? "어떤 그림인지, 누구를 부르면 좋을지, 어디서 찍으면 좋을지 편하게 적어 주세요." : tab === "notice" ? "준비물, 시간, 참고할 것" : "편하게 한마디"} />
                </label>
                <div className="dm-compose-foot">
                    <span className="dm-hint">{meInfo ? <>작성자: <b>{meInfo.name}</b></> : "누구인지 먼저 골라 주세요"} · {body.length}/{LIMITS.body}</span>
                    <button type="submit" className={`dm-btn${tab === "idea" ? " red" : ""}`} disabled={disabled}>
                        {posting ? "올리는 중…" : tab === "idea" ? "아이디어 걸기" : tab === "notice" ? "공지 올리기" : "보내기"}
                    </button>
                </div>
            </form>
        );
    }

    function renderState() {
        if (current === "missing") {
            return (
                <div className="dm-alert" role="status">
                    <b>방을 준비하고 있습니다</b>
                    <p style={{ margin: "6px 0 0" }}>저장 공간이 아직 만들어지지 않았습니다. PD가 준비를 마치면 바로 쓸 수 있습니다.</p>
                </div>
            );
        }
        if (current === "error" && items[tab].length === 0) {
            return <div className="dm-alert" role="alert"><b>불러오지 못했습니다</b><p style={{ margin: "6px 0 0" }}>인터넷 연결을 확인하고 아래 새로고침을 눌러 주세요.</p></div>;
        }
        if ((current === "loading" || current === "idle") && items[tab].length === 0) {
            return <div className="dm-empty">불러오는 중…</div>;
        }
        return null;
    }

    const stateBox = renderState();

    return (
        <>
            <header className="dm-head">
                <div className="dm-head-in">
                    <div className="dm-brand">
                        <span className="dm-eyebrow">DEEP MAKAI · MMA PODCAST</span>
                        <h1 className="dm-title"><span className="en">CREW ROOM</span><span className="kr">딥마카이 크루룸</span></h1>
                    </div>
                    <span className="dm-label">CREW ONLY · 주소 공유 금지</span>
                </div>
            </header>

            <section className="dm-who" aria-labelledby="dm-who-q">
                {picking || !me ? (
                    <>
                        <p className="dm-who-q" id="dm-who-q">누구세요? 내 패치를 골라 주세요</p>
                        <div className="dm-patches" role="group" aria-label="멤버 선택">
                            {MEMBERS.map((m) => (
                                <button key={m.key} type="button" className={`dm-patch tone-${m.tone}`} aria-pressed={me === m.key} onClick={() => chooseMe(m.key)}>
                                    <span className="mark" aria-hidden="true">{m.name.slice(0, 1)}</span>
                                    <span className="nm">{m.name}</span>
                                    <span className="rl">{m.role}</span>
                                </button>
                            ))}
                        </div>
                        <p className="dm-me" style={{ margin: 0 }}>한 번 고르면 이 기기에서는 기억합니다.</p>
                    </>
                ) : (
                    <p className="dm-me" id="dm-who-q" style={{ margin: 0 }}>
                        <b>{meInfo?.name}</b>(으)로 들어와 있습니다 · <button type="button" onClick={() => setPicking(true)}>바꾸기</button>
                    </p>
                )}
            </section>

            <nav className="dm-tabs-wrap" aria-label="게시판">
                <div className="dm-tabs" role="tablist">
                    {TABS.map((t) => (
                        <button key={t.kind} type="button" role="tab" id={`dm-tab-${t.kind}`} aria-controls="dm-panel"
                            aria-selected={tab === t.kind} className="dm-tab" onClick={() => chooseTab(t.kind)}>
                            {t.label} <small>{t.en}</small> <span className="count">{items[t.kind].length}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="dm-main" id="dm-panel" role="tabpanel" aria-labelledby={`dm-tab-${tab}`}>
                {tab === "notice" && (
                    <>
                        <div className="dm-bar">
                            <div>
                                <h2 className="dm-h2">공지 · 촬영 일정</h2>
                                <p className="dm-sub">다가오는 일정이 위에 옵니다. 날짜와 장소를 넣으면 카드에 크게 보입니다.</p>
                            </div>
                        </div>
                        {renderCompose()}
                        {stateBox}
                        {!stateBox && items.notice.length === 0 && <div className="dm-empty">아직 공지가 없습니다.</div>}
                        <div className="dm-notices">
                            {[...notices.upcoming, ...notices.rest].map((it) => {
                                const d = typeof it.meta?.date === "string" ? new Date(`${it.meta.date}T00:00:00`) : null;
                                const past = d ? (it.meta.date as string) < todayKey() : false;
                                return (
                                    <article key={it.id} className="dm-notice" style={past ? { opacity: 0.72 } : undefined}>
                                        <div className={`dm-date${d ? "" : " none"}`} aria-label={d ? `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일` : "날짜 없음"}>
                                            {d ? (<><span className="m">{MONTHS[d.getMonth()]}</span><span className="d">{d.getDate()}</span><span className="w">{WEEK[d.getDay()]}</span></>)
                                                : (<><span className="m">NOTE</span><span className="d">공지</span></>)}
                                        </div>
                                        <div className="dm-notice-body">
                                            {editingId === it.id ? editBox(it) : (
                                                <>
                                                    <h3>{it.title}</h3>
                                                    {typeof it.meta?.place === "string" && <span className="place">장소 · {it.meta.place as string}</span>}
                                                    <p className="body">{it.body}</p>
                                                </>
                                            )}
                                            <div className="dm-meta">
                                                <span>{memberOf(it.author)?.name} · {ago(it.created_at)}{past ? " · 지난 일정" : ""}</span>
                                                {fistButton(it)}
                                                {manage(it)}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}

                {tab === "idea" && (
                    <>
                        <div className="dm-bar">
                            <div>
                                <h2 className="dm-h2">아이디어 박스</h2>
                                <p className="dm-sub">코너, 게스트, 촬영 장소, 먹방·캠핑, 협찬 아이디어를 태그처럼 걸어 두세요. 좋으면 주먹 인사.</p>
                            </div>
                        </div>
                        {renderCompose()}
                        <div className="dm-bar">
                            <div className="dm-filters" role="group" aria-label="종류로 보기">
                                {["전체", ...IDEA_CATEGORIES].map((c) => (
                                    <button key={c} type="button" className="dm-chip" aria-pressed={catFilter === c} onClick={() => setCatFilter(c)}>{c}</button>
                                ))}
                            </div>
                            <div className="dm-filters">
                                <label className="dm-sr" htmlFor="dm-status-filter">상태로 보기</label>
                                <select id="dm-status-filter" className="dm-status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="전체">상태 전체</option>
                                    {Object.entries(IDEA_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <button type="button" className="dm-chip" aria-pressed={sort === "hot"} onClick={() => setSort(sort === "hot" ? "new" : "hot")}>
                                    {sort === "hot" ? "주먹 많은 순" : "최신 순"}
                                </button>
                            </div>
                        </div>
                        {stateBox}
                        {!stateBox && ideas.length === 0 && <div className="dm-empty">{items.idea.length ? "조건에 맞는 아이디어가 없습니다." : "첫 아이디어를 걸어 주세요."}</div>}
                        <div className="dm-grid">
                            {ideas.map((it) => {
                                const st = (it.status || "new") as IdeaStatus;
                                return (
                                    <article key={it.id} className="dm-tag">
                                        <div className="dm-tag-top">
                                            <span className="dm-cat">{(it.meta?.category as string) || "기타"}</span>
                                            {me === "pd" ? (
                                                <>
                                                    <label className="dm-sr" htmlFor={`st-${it.id}`}>상태 바꾸기</label>
                                                    <select id={`st-${it.id}`} className="dm-status-select" value={st}
                                                        onChange={(e) => patch(it, { op: "status", status: e.target.value }, `‘${IDEA_STATUS[e.target.value as IdeaStatus]}’(으)로 바꿨습니다.`)}>
                                                        {Object.entries(IDEA_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                    </select>
                                                </>
                                            ) : (
                                                <span className={`dm-stamp st-${st}`}>{IDEA_STATUS[st]}</span>
                                            )}
                                        </div>
                                        {editingId === it.id ? editBox(it) : (
                                            <>
                                                <h3>{it.title}</h3>
                                                <p className="body">{it.body}</p>
                                            </>
                                        )}
                                        <div className="dm-tag-foot">
                                            {fistButton(it)}
                                            <span>{memberOf(it.author)?.name} · {ago(it.created_at)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>{manage(it)}</div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}

                {tab === "talk" && (
                    <>
                        <div className="dm-bar">
                            <div>
                                <h2 className="dm-h2">잡담</h2>
                                <p className="dm-sub">녹화 전후로 편하게. 20초마다 새 메시지를 가져옵니다.</p>
                            </div>
                        </div>
                        {stateBox}
                        {!stateBox && talk.length === 0 && <div className="dm-empty">첫 한마디를 남겨 주세요.</div>}
                        <div className="dm-talk" aria-live="polite">
                            {talk.map((it) => (
                                <div key={it.id} className={`dm-msg${it.author === me ? " mine" : ""}`}>
                                    <Avatar author={it.author} />
                                    <div className="dm-bubble">
                                        <div className="who">{memberOf(it.author)?.name}<time dateTime={it.created_at}>{ago(it.created_at)}</time></div>
                                        {editingId === it.id ? editBox(it) : <p>{it.body}</p>}
                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>{manage(it)}</div>
                                    </div>
                                </div>
                            ))}
                            <div ref={talkEnd} />
                        </div>
                        {renderCompose()}
                    </>
                )}
            </main>

            <footer className="dm-foot">
                <span>주소를 아는 사람만 들어올 수 있는 방입니다. 주소를 밖에 공유하지 마세요.</span>
                <span>
                    {updatedAt ? `${new Date(updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준 · ` : ""}
                    <button type="button" className="dm-link" onClick={() => TABS.forEach((t) => fetchKind(t.kind))}>새로고침</button>
                </span>
            </footer>

            <div role="status" aria-live="polite" style={{
                position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
                background: "#1C1A16", color: "#F4EEE0", padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                opacity: flash ? 1 : 0, pointerEvents: "none", transition: "opacity .2s", maxWidth: "calc(100% - 32px)", textAlign: "center", zIndex: 20,
            }}>{flash}</div>
        </>
    );
}
