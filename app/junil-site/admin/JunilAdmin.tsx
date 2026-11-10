"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BOARDS, BOARD_KEYS, LIMITS, kdate, slugify, todayKst, type BoardKey, type Post, type PostMeta, type PostStatus } from "@/lib/junil-site/shared";
import Editor, { type EditorHandle } from "./Editor";

type Props = { categories: Record<BoardKey, string[]>; lawyers: { id: number; name: string; role: string }[] };
type Draft = Pick<Post, "title" | "category" | "lawyerIds" | "date" | "summary" | "thumb" | "images" | "slug" | "body">;
type Filter = "all" | PostStatus;

const EMPTY: Draft = { title: "", category: "", lawyerIds: [], date: "", summary: "", thumb: "", images: [], slug: "", body: "" };
const draftOf = (p: Post): Draft => ({ title: p.title, category: p.category, lawyerIds: p.lawyerIds ?? [], date: p.date, summary: p.summary, thumb: p.thumb, images: p.images ?? [], slug: p.slug, body: p.body });
const BOARD_STORE = "junil-admin-board";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : undefined });
    if (res.status === 401) {
        window.location.reload();
        throw new Error("다시 로그인해 주세요.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
    return data as T;
}

const fetchPosts = (board: BoardKey) => api<{ posts: PostMeta[] }>(`/api/junil-site/posts?board=${board}`).then((d) => d.posts);

/** 큰 사진은 올리기 전에 긴 변 1800px 로 줄인다(휴대폰 원본 그대로 올리는 일 방지). */
async function shrink(file: File): Promise<File> {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        if (scale === 1 && file.size < 1_500_000) return file;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const type = file.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.88));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.\w+$/, type === "image/png" ? ".png" : ".jpg"), { type });
    } catch {
        return file;
    }
}

export async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", await shrink(file));
    return (await api<{ url: string }>("/api/junil-site/upload", { method: "POST", body: form })).url;
}

export default function JunilAdmin({ categories, lawyers }: Props) {
    const [board, setBoard] = useState<BoardKey>("column");
    const [posts, setPosts] = useState<PostMeta[] | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [query, setQuery] = useState("");
    /** 편집 중인 글: null = 아무것도 안 엶, "new" = 새 글 */
    const [openId, setOpenId] = useState<string | null>(null);
    const [saved, setSaved] = useState<Post | null>(null);
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState("");
    const [loading, setLoading] = useState(false);
    /** 글을 새로 열 때마다 올려서 편집기를 새로 만든다 */
    const [docKey, setDocKey] = useState(0);
    const editor = useRef<EditorHandle>(null);
    const thumbInput = useRef<HTMLInputElement>(null);
    const galleryInput = useRef<HTMLInputElement>(null);
    const conf = BOARDS[board];

    const reload = useCallback(async (b: BoardKey) => {
        try {
            setPosts(await fetchPosts(b));
        } catch (e) {
            toast.error((e as Error).message);
        }
    }, []);

    // 처음 한 번: 지난번에 보던 게시판과 그 목록을 불러온다.
    useEffect(() => {
        let alive = true;
        let first: BoardKey = "column";
        try {
            const kept = window.localStorage.getItem(BOARD_STORE) as BoardKey | null;
            if (kept && BOARD_KEYS.includes(kept)) first = kept;
        } catch { /* 저장소를 못 쓰는 브라우저 */ }
        fetchPosts(first)
            .then((list) => { if (alive) { setBoard(first); setPosts(list); } })
            .catch((e: Error) => toast.error(e.message));
        return () => { alive = false; };
    }, []);

    // 저장하지 않고 창을 닫으려 하면 한 번 묻는다.
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const counts = useMemo(() => ({
        all: posts?.length ?? 0,
        published: posts?.filter((p) => p.status === "published").length ?? 0,
        draft: posts?.filter((p) => p.status === "draft").length ?? 0,
    }), [posts]);
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (posts ?? []).filter((p) => (filter === "all" || p.status === filter) && (!q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
    }, [posts, filter, query]);
    const nameOf = (ids: number[] | undefined) => (ids?.length ? ids.map((id) => lawyers.find((l) => l.id === id)?.name).filter(Boolean).join("·") : board === "column" ? "법률사무소 준일" : "");

    const leaveOk = () => !dirty || window.confirm("저장하지 않은 내용이 있습니다. 버리고 이동할까요?");

    function load(next: Draft) {
        setDraft(next);
        setDirty(false);
        // 편집기 본문은 React 상태로 두지 않는다(글자 입력마다 다시 그리지 않도록) — 글을 열 때 새로 만들며 채운다.
        setDocKey((k) => k + 1);
    }

    function switchBoard(next: BoardKey) {
        if (next === board || !leaveOk()) return;
        setBoard(next);
        setPosts(null);
        setOpenId(null);
        setSaved(null);
        setDirty(false);
        setFilter("all");
        setQuery("");
        try { window.localStorage.setItem(BOARD_STORE, next); } catch { /* 넘어감 */ }
        reload(next);
    }

    function startNew() {
        if (!leaveOk()) return;
        setOpenId("new");
        setSaved(null);
        load({ ...EMPTY, date: todayKst() });
    }

    async function open(id: string) {
        if (id === openId || !leaveOk()) return;
        setLoading(true);
        try {
            const { post } = await api<{ post: Post }>(`/api/junil-site/posts/${id}`);
            setOpenId(id);
            setSaved(post);
            load(draftOf(post));
        } catch (e) {
            toast.error((e as Error).message);
        }
        setLoading(false);
    }

    function close() {
        if (!leaveOk()) return;
        setOpenId(null);
        setSaved(null);
        setDirty(false);
    }

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
        setDraft((d) => ({ ...d, [key]: value }));
        setDirty(true);
    };

    async function save(status: PostStatus) {
        if (busy) return;
        const body = editor.current?.getHtml() ?? draft.body;
        const title = draft.title.trim();
        if (!title) return toast.error("제목을 적어 주세요.");
        if (status === "published" && !body.replace(/<[^>]+>/g, "").trim() && !/<img/i.test(body) && !draft.images.length) return toast.error("본문이 비어 있습니다.");
        setBusy(status);
        try {
            const payload = { ...draft, title, body, status, board };
            const { post } = openId === "new" || !openId
                ? await api<{ post: Post }>("/api/junil-site/posts", { method: "POST", body: JSON.stringify(payload) })
                : await api<{ post: Post }>(`/api/junil-site/posts/${openId}`, { method: "PATCH", body: JSON.stringify(payload) });
            setOpenId(post.id);
            setSaved(post);
            load(draftOf(post));
            await reload(board);
            toast.success(status === "published" ? (saved?.status === "published" ? "수정한 내용을 반영했습니다." : "발행했습니다.") : (saved?.status === "published" ? "발행을 내리고 임시 저장했습니다." : "임시 저장했습니다."));
        } catch (e) {
            toast.error((e as Error).message);
        }
        setBusy("");
    }

    async function remove() {
        if (!saved || busy) return;
        if (!window.confirm(`「${saved.title}」 글을 지울까요?\n지우면 되돌릴 수 없습니다.`)) return;
        setBusy("delete");
        try {
            await api(`/api/junil-site/posts/${saved.id}`, { method: "DELETE" });
            setOpenId(null);
            setSaved(null);
            setDirty(false);
            await reload(board);
            toast.success("글을 지웠습니다.");
        } catch (e) {
            toast.error((e as Error).message);
        }
        setBusy("");
    }

    async function pickThumb(file: File | undefined) {
        if (!file) return;
        setBusy("thumb");
        try {
            set("thumb", await uploadImage(file));
        } catch (e) {
            toast.error((e as Error).message);
        }
        setBusy("");
        if (thumbInput.current) thumbInput.current.value = "";
    }

    async function addGallery(files: File[]) {
        if (!files.length) return;
        const room = LIMITS.images - draft.images.length;
        if (room <= 0) return toast.error(`이미지는 ${LIMITS.images}장까지 넣을 수 있습니다.`);
        setBusy("gallery");
        try {
            const urls: string[] = [];
            for (const file of files.slice(0, room)) urls.push(await uploadImage(file));
            setDraft((d) => ({ ...d, images: [...d.images, ...urls] }));
            setDirty(true);
        } catch (e) {
            toast.error((e as Error).message);
        }
        setBusy("");
        if (galleryInput.current) galleryInput.current.value = "";
    }

    function moveGallery(index: number, by: number) {
        const next = [...draft.images];
        const to = index + by;
        if (to < 0 || to >= next.length) return;
        [next[index], next[to]] = [next[to], next[index]];
        set("images", next);
    }

    function toggleLawyer(id: number) {
        set("lawyerIds", draft.lawyerIds.includes(id) ? draft.lawyerIds.filter((x) => x !== id) : [...draft.lawyerIds, id]);
    }

    function preview() {
        if (!saved) return toast.error("먼저 임시 저장을 눌러 주세요.");
        if (dirty) toast.message("저장한 내용까지만 미리보기에 나옵니다.");
        window.open(`/junil-site/admin/preview/${saved.id}`, "_blank", "noopener");
    }

    async function logout() {
        if (!leaveOk()) return;
        await fetch("/api/junil-site/auth", { method: "DELETE" });
        window.location.reload();
    }

    // Ctrl+S: 지금 상태 그대로 저장
    const saveRef = useRef(save);
    useEffect(() => { saveRef.current = save; });
    const savedStatus = saved?.status ?? "draft";
    useEffect(() => {
        if (!openId) return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                saveRef.current(savedStatus);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openId, savedStatus]);

    const isPublished = saved?.status === "published";
    const slugShown = draft.slug || slugify(draft.title) || "(제목을 적으면 자동으로 정해집니다)";

    return (
        <div className={`ja-app${openId ? " ja-app--editing" : ""}`}>
            <header className="ja-top">
                <a className="ja-brand" href="/junil-site/admin">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/junil-site/img/favicon.svg" alt="" />
                    <b>법률사무소 준일</b>
                    <span>관리자 모드</span>
                </a>
                <nav>
                    <a href={`/junil-site/${conf.path}`} target="_blank" rel="noopener">{conf.label} 보기 ↗</a>
                    <a href="/junil-site" target="_blank" rel="noopener">홈페이지 ↗</a>
                    <button type="button" onClick={logout}>로그아웃</button>
                </nav>
            </header>

            <aside className="ja-side">
                <div className="ja-boards" role="tablist" aria-label="게시판">
                    {BOARD_KEYS.map((key) => (
                        <button key={key} type="button" role="tab" aria-selected={board === key} className={board === key ? "on" : ""} onClick={() => switchBoard(key)}>{BOARDS[key].label}</button>
                    ))}
                </div>
                <div className="ja-side-h">
                    <div>
                        <p className="ja-eb">BOARD</p>
                        <h1>{conf.label}</h1>
                    </div>
                    <button type="button" className="ja-btn ja-btn--primary" onClick={startNew}>+ 새 글</button>
                </div>
                <div className="ja-tabs" role="tablist" aria-label="상태">
                    {([["all", "전체"], ["published", "발행"], ["draft", "임시 저장"]] as [Filter, string][]).map(([key, label]) => (
                        <button key={key} type="button" role="tab" aria-selected={filter === key} className={filter === key ? "on" : ""} onClick={() => setFilter(key)}>
                            {label}<b>{counts[key]}</b>
                        </button>
                    ))}
                </div>
                <input className="ja-search" type="search" placeholder="제목·분류로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
                <div className="ja-list">
                    {posts === null && <p className="ja-hint">불러오는 중…</p>}
                    {posts !== null && shown.length === 0 && <p className="ja-hint">{posts.length ? "조건에 맞는 글이 없습니다." : "아직 글이 없습니다. ‘새 글’을 눌러 첫 글을 써 보세요."}</p>}
                    {shown.map((p) => (
                        <button key={p.id} type="button" className={`ja-item${p.id === openId ? " on" : ""}`} onClick={() => open(p.id)}>
                            <span className={`ja-badge ja-badge--${p.status}`}>{p.status === "published" ? "발행" : "임시"}</span>
                            <b>{p.title}</b>
                            <small>{[p.category, kdate(p.date), nameOf(p.lawyerIds)].filter(Boolean).join(" · ")}</small>
                        </button>
                    ))}
                </div>
            </aside>

            <main className="ja-main">
                {!openId && (
                    <div className="ja-blank">
                        <p className="ja-eb">JUNIL ADMIN</p>
                        <h2>글을 고르거나 새 글을 쓰세요</h2>
                        <p>왼쪽 위에서 게시판을 고르고, 목록에서 글을 누르면 고칠 수 있습니다. 임시 저장한 글은 홈페이지에 보이지 않고, 발행하면 바로 {conf.label}에 올라갑니다.</p>
                        <button type="button" className="ja-btn ja-btn--primary" onClick={startNew}>+ {conf.label} 새 글 쓰기</button>
                    </div>
                )}
                {openId && (
                    <form className={`ja-edit${loading ? " is-loading" : ""}`} onSubmit={(e) => e.preventDefault()}>
                        <div className="ja-bar">
                            <button type="button" className="ja-back" onClick={close} aria-label="목록으로">←</button>
                            <p className="ja-state">
                                <span className={`ja-badge ja-badge--${saved ? saved.status : "new"}`}>{saved ? (isPublished ? "발행된 글" : "임시 저장 글") : "새 글"}</span>
                                {dirty ? <em>저장하지 않은 변경 있음</em> : saved ? <i>저장됨 · {new Date(saved.updatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</i> : null}
                            </p>
                            <div className="ja-actions">
                                {saved && <button type="button" className="ja-btn ja-btn--ghost ja-btn--danger" onClick={remove} disabled={!!busy}>삭제</button>}
                                <button type="button" className="ja-btn ja-btn--ghost" onClick={preview} disabled={!!busy}>미리보기</button>
                                <button type="button" className="ja-btn" onClick={() => save("draft")} disabled={!!busy}>
                                    {busy === "draft" ? "저장 중…" : isPublished ? "발행 내리기" : "임시 저장"}
                                </button>
                                <button type="button" className="ja-btn ja-btn--primary" onClick={() => save("published")} disabled={!!busy}>
                                    {busy === "published" ? "올리는 중…" : isPublished ? "수정 반영" : "발행"}
                                </button>
                            </div>
                        </div>

                        <div className="ja-fields">
                            <label className="ja-f ja-f--title">
                                <span>제목</span>
                                <input value={draft.title} maxLength={LIMITS.title} placeholder="제목을 적어 주세요" onChange={(e) => set("title", e.target.value)} />
                            </label>
                            <div className={`ja-row${conf.multiLawyer ? " ja-row--2" : ""}`}>
                                <label className="ja-f">
                                    <span>{board === "column" ? "분야" : "분류"}</span>
                                    <select value={draft.category} onChange={(e) => set("category", e.target.value)}>
                                        <option value="">선택 안 함</option>
                                        {categories[board].map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </label>
                                {!conf.multiLawyer && (
                                    <label className="ja-f">
                                        <span>{conf.lawyerLabel}</span>
                                        <select value={draft.lawyerIds[0] ?? ""} onChange={(e) => set("lawyerIds", e.target.value ? [Number(e.target.value)] : [])}>
                                            <option value="">법률사무소 준일</option>
                                            {lawyers.map((l) => <option key={l.id} value={l.id}>{l.name} {l.role}</option>)}
                                        </select>
                                    </label>
                                )}
                                <label className="ja-f">
                                    <span>게시일</span>
                                    <input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
                                </label>
                            </div>
                            {conf.multiLawyer && (
                                <div className="ja-f">
                                    <span>{conf.lawyerLabel} <small>여러 명을 고를 수 있습니다. 먼저 고른 변호사가 대표로 나옵니다.</small></span>
                                    <div className="ja-checks">
                                        {lawyers.map((l) => (
                                            <label key={l.id} className={draft.lawyerIds.includes(l.id) ? "on" : ""}>
                                                <input type="checkbox" checked={draft.lawyerIds.includes(l.id)} onChange={() => toggleLawyer(l.id)} />
                                                {l.name}{draft.lawyerIds[0] === l.id && draft.lawyerIds.length > 1 ? " (대표)" : ""}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {conf.gallery && (
                                <div className="ja-f">
                                    <span>{conf.gallery} <small>{board === "case" ? "판결문·결정문 등. 글 위쪽에 따로 나오고 누르면 크게 보입니다." : "글 위쪽에 크게 나옵니다."} {LIMITS.images}장까지.</small></span>
                                    <div className="ja-gallery">
                                        {draft.images.map((src, i) => (
                                            <figure key={src}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={src} alt="" />
                                                <figcaption>
                                                    <button type="button" title="앞으로" aria-label="앞으로" onClick={() => moveGallery(i, -1)} disabled={i === 0}>←</button>
                                                    <button type="button" title="뒤로" aria-label="뒤로" onClick={() => moveGallery(i, 1)} disabled={i === draft.images.length - 1}>→</button>
                                                    <button type="button" title="빼기" aria-label="빼기" onClick={() => set("images", draft.images.filter((_, k) => k !== i))}>✕</button>
                                                </figcaption>
                                            </figure>
                                        ))}
                                        <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => addGallery(Array.from(e.target.files ?? []))} />
                                        <button type="button" className="ja-gallery-add" onClick={() => galleryInput.current?.click()} disabled={busy === "gallery"}>{busy === "gallery" ? "올리는 중…" : "+ 이미지 추가"}</button>
                                    </div>
                                </div>
                            )}

                            <div className="ja-f">
                                <span>본문</span>
                                <Editor key={docKey} ref={editor} initial={draft.body} onChange={() => setDirty(true)} upload={uploadImage} />
                            </div>

                            <label className="ja-f">
                                <span>{board === "case" ? "사건 개요" : "요약"} <small>{conf.summaryHint}</small></span>
                                <textarea rows={3} value={draft.summary} maxLength={LIMITS.summary} onChange={(e) => set("summary", e.target.value)} />
                            </label>

                            <div className="ja-row ja-row--2">
                                <div className="ja-f">
                                    <span>대표 이미지 <small>{conf.thumbHint}</small></span>
                                    <div className="ja-thumb">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {draft.thumb ? <img src={draft.thumb} alt="" /> : <div className="ja-thumb-none">이미지 없음</div>}
                                        <div>
                                            <input ref={thumbInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => pickThumb(e.target.files?.[0])} />
                                            <button type="button" className="ja-btn" onClick={() => thumbInput.current?.click()} disabled={busy === "thumb"}>{busy === "thumb" ? "올리는 중…" : draft.thumb ? "바꾸기" : "이미지 올리기"}</button>
                                            {draft.thumb && <button type="button" className="ja-btn ja-btn--ghost" onClick={() => set("thumb", "")}>빼기</button>}
                                        </div>
                                    </div>
                                </div>
                                <label className="ja-f">
                                    <span>글 주소 <small>비워 두면 제목으로 정해집니다. 발행 뒤에는 되도록 바꾸지 마세요.</small></span>
                                    <input value={draft.slug} maxLength={LIMITS.slug} placeholder="제목에서 자동" onChange={(e) => set("slug", e.target.value)} onBlur={(e) => { const v = slugify(e.target.value); if (v !== draft.slug) set("slug", v); }} />
                                    <code>/junil-site/{conf.path}/{slugShown}</code>
                                </label>
                            </div>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}
