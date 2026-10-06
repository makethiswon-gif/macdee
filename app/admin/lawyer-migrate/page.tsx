"use client";

// 관리자 "변호사 블로그 옮기기"(2026-10-06): 변호사를 골라 네이버 블로그 글을 그 변호사의 맥디 블로그로 옮긴다.
// 변호사 계정으로 로그인하지 않아도 된다. 법률 글만 고르고, 텍스트만 옮기며, 제목은 구글 검색용으로 새로 짓는다.
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, CheckCircle2, Loader2, XCircle, ExternalLink } from "lucide-react";

interface Lawyer { id: string; name: string; slug: string | null; office_name: string | null; region: string | null }
interface Post { logNo: string; title: string; date: string | null; categoryNo: number; categoryName: string }
interface Result { logNo: string; ok: boolean; skipped?: boolean; slug?: string; title?: string; note?: string; error?: string }
type Mode = "polish" | "raw";

const NON_LEGAL = /소개|오시는\s*길|찾아오시는|면책|공지|인사말|채용|이벤트|일상/;
const BATCH = 50, PER_REQUEST = 3;

export default function LawyerMigratePage() {
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [lawyerId, setLawyerId] = useState("");
    const [blogInput, setBlogInput] = useState("");
    const [blogId, setBlogId] = useState("");
    const [posts, setPosts] = useState<Post[]>([]);
    const [categories, setCategories] = useState<Record<number, string>>({});
    const [excluded, setExcluded] = useState<Set<number>>(new Set());
    const [migrated, setMigrated] = useState<Set<string>>(new Set());
    const [mode, setMode] = useState<Mode>("polish");
    const [publish, setPublish] = useState(true);
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [results, setResults] = useState<Result[]>([]);
    const [current, setCurrent] = useState("");
    const stopRef = useRef(false);

    useEffect(() => {
        fetch("/api/admin/lawyer-migrate").then((r) => r.json()).then((d) => {
            setLawyers(d.lawyers || []);
            // 변호사 관리의 "직접 등록" 뒤 넘어온 경우 그 변호사를 미리 고른다
            const pre = new URLSearchParams(window.location.search).get("lawyerId");
            if (pre && (d.lawyers || []).some((l: Lawyer) => l.id === pre)) setLawyerId(pre);
        }).catch(() => setError("변호사 목록을 불러오지 못했습니다."));
    }, []);
    const lawyer = lawyers.find((l) => l.id === lawyerId);

    async function loadPosts() {
        if (!lawyerId) { setError("먼저 변호사를 고르세요."); return; }
        setLoading(true); setError(""); setResults([]);
        try {
            const r = await fetch(`/api/admin/lawyer-migrate?blogId=${encodeURIComponent(blogInput.trim())}&lawyerId=${lawyerId}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "글 목록을 불러오지 못했습니다.");
            setBlogId(d.blogId); setPosts(d.posts); setCategories(d.categories || {}); setMigrated(new Set(d.migrated || []));
            const cats = new Map<number, string>();
            for (const p of d.posts as Post[]) cats.set(p.categoryNo, p.categoryName);
            setExcluded(new Set([...cats].filter(([, name]) => NON_LEGAL.test(name)).map(([no]) => no)));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally { setLoading(false); }
    }

    const categoryCounts = useMemo(() => {
        const m = new Map<number, { name: string; count: number }>();
        for (const p of posts) { const c = m.get(p.categoryNo) || { name: p.categoryName, count: 0 }; c.count++; m.set(p.categoryNo, c); }
        return [...m].sort((a, b) => b[1].count - a[1].count);
    }, [posts]);
    const targets = useMemo(() => posts.filter((p) => !excluded.has(p.categoryNo) && !migrated.has(p.logNo)), [posts, excluded, migrated]);
    const doneCount = posts.filter((p) => migrated.has(p.logNo)).length;

    // all: 남은 글을 끝까지 이어서 옮긴다(탭을 열어 두면 50편마다 멈추지 않는다). 중간에 멈추거나 끊겨도 다시 누르면 옮긴 글은 건너뛴다.
    async function runBatch(all = false) {
        if (!lawyerId || !blogId) return;
        const batch = all ? targets : targets.slice(0, BATCH);
        if (!batch.length) return;
        setRunning(true); setError(""); stopRef.current = false;
        try {
            for (let i = 0; i < batch.length && !stopRef.current; i += PER_REQUEST) {
                const chunk = batch.slice(i, i + PER_REQUEST);
                setCurrent(`${Math.min(i + chunk.length, batch.length)} / ${batch.length}편 — ${chunk[0].title.slice(0, 30)}`);
                const r = await fetch("/api/admin/lawyer-migrate", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lawyerId, blogId, mode, publish, items: chunk.map((p) => ({ logNo: p.logNo, date: p.date })) }),
                });
                const d = await r.json().catch(() => ({ error: `응답을 읽지 못했습니다(${r.status})` }));
                if (!r.ok) { setError(d.error || "옮기지 못했습니다."); break; }
                const got = d.results as Result[];
                setResults((prev) => [...got, ...prev]);
                setMigrated((prev) => { const next = new Set(prev); for (const x of got) if (x.ok) next.add(x.logNo); return next; });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally { setRunning(false); setCurrent(""); }
    }

    const titleOf = (logNo: string) => posts.find((p) => p.logNo === logNo)?.title || logNo;
    const card = "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5";

    return (
        <div className="max-w-4xl mx-auto space-y-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><ArrowRightLeft size={20} className="text-white" /></div>
                <div>
                    <h1 className="text-xl font-bold text-white">변호사 블로그 옮기기</h1>
                    <p className="text-sm text-white/40">네이버 블로그 글을 골라 변호사의 맥디 블로그로 옮깁니다 — 텍스트만, 제목은 구글 검색용으로</p>
                </div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex gap-2"><XCircle size={16} className="shrink-0 mt-0.5" />{error}</div>}

            <section className={card}>
                <p className="text-sm font-semibold text-white mb-3">1. 변호사와 네이버 블로그</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <select value={lawyerId} onChange={(e) => { setLawyerId(e.target.value); setPosts([]); setResults([]); }}
                        className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white">
                        <option value="">변호사 선택</option>
                        {lawyers.map((l) => <option key={l.id} value={l.id}>{l.name}{l.office_name ? ` · ${l.office_name}` : ""}{l.slug ? ` (/blog/${l.slug})` : ""}</option>)}
                    </select>
                    <input value={blogInput} onChange={(e) => setBlogInput(e.target.value)} placeholder="https://blog.naver.com/아이디 또는 아이디"
                        className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/25" />
                    <button onClick={loadPosts} disabled={loading || running || !blogInput.trim()}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                        {loading ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" />불러오는 중</span> : "전체 글 불러오기"}
                    </button>
                </div>
                {lawyer && !lawyer.slug && <p className="mt-2 text-xs text-amber-400">이 변호사는 블로그 주소(slug)가 없어 옮겨도 공개 블로그에 보이지 않습니다.</p>}
            </section>

            {posts.length > 0 && (
                <section className={card}>
                    <p className="text-sm font-semibold text-white">2. 옮길 카테고리 — 전체 {posts.length}편 · 이미 옮김 {doneCount}편 · 옮길 글 <span className="text-emerald-400">{targets.length}편</span></p>
                    <p className="text-xs text-white/35 mt-1 mb-3">소개·오시는 길·면책공고 같은 법률 글이 아닌 카테고리는 처음부터 빠져 있습니다. 눌러서 넣거나 뺄 수 있습니다.</p>
                    <div className="flex flex-wrap gap-2">
                        {categoryCounts.map(([no, c]) => {
                            const on = !excluded.has(no);
                            return (
                                <button key={no} onClick={() => setExcluded((prev) => { const next = new Set(prev); if (on) next.add(no); else next.delete(no); return next; })}
                                    className={`rounded-full px-3 py-1.5 text-xs border ${on ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/[0.08] text-white/30 line-through"}`}>
                                    {categories[no] || c.name} {c.count}
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {posts.length > 0 && (
                <section className={card}>
                    <p className="text-sm font-semibold text-white mb-3">3. 옮기는 방식</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {([["polish", "살짝 다듬기 (추천)", "맞춤법·어색한 문장·네이버 전용 문구만 고칩니다. 내용·구조·분량은 그대로. 편당 약 1분, 약 $0.05"],
                            ["raw", "원문 그대로", "본문은 손대지 않고 제목·설명만 새로 짓습니다. 편당 약 10초, 약 $0.005"]] as [Mode, string, string][]).map(([value, label, desc]) => (
                            <button key={value} onClick={() => setMode(value)}
                                className={`text-left rounded-xl border p-3 ${mode === value ? "border-emerald-500/50 bg-emerald-500/[0.08]" : "border-white/[0.08]"}`}>
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="text-xs text-white/40 mt-1 leading-relaxed">{desc}</p>
                            </button>
                        ))}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
                        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
                        바로 게시 (끄면 콘텐츠 관리에서 검토 후 게시)
                    </label>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button onClick={() => runBatch(true)} disabled={running || !targets.length}
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                            {running ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" />옮기는 중</span> : `남은 ${targets.length}편 모두 옮기기`}
                        </button>
                        <button onClick={() => runBatch(false)} disabled={running || !targets.length}
                            className="rounded-xl border border-white/[0.12] px-4 py-2.5 text-sm text-white/70 disabled:opacity-40">
                            {`${Math.min(BATCH, targets.length)}편만 옮기기`}
                        </button>
                        {running && <button onClick={() => { stopRef.current = true; }} className="rounded-xl border border-white/[0.12] px-4 py-2.5 text-sm text-white/70">지금 3편 뒤 멈추기</button>}
                        {current && <span className="text-xs text-white/50">{current}</span>}
                    </div>
                    <p className="text-xs text-white/30 mt-2">「모두 옮기기」는 이 탭을 열어 두면 끝까지 이어서 옮깁니다(3편씩 차례로). 멈추거나 끊겨도 다시 누르면 이미 옮긴 글은 건너뜁니다. 원래 글의 작성일이 그대로 붙습니다.</p>
                </section>
            )}

            {results.length > 0 && (
                <section className={card}>
                    <p className="text-sm font-semibold text-white mb-3">결과 — 성공 {results.filter((r) => r.ok && !r.skipped).length} · 건너뜀 {results.filter((r) => r.skipped).length} · 실패 {results.filter((r) => !r.ok).length}</p>
                    <ul className="divide-y divide-white/[0.05]">
                        {results.map((r, i) => (
                            <li key={`${r.logNo}-${i}`} className="py-2.5 flex items-start gap-2 text-sm">
                                {r.ok ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                                <div className="min-w-0">
                                    <p className="text-white/80 truncate">{r.title || titleOf(r.logNo)}</p>
                                    <p className="text-xs text-white/35 truncate">
                                        {r.skipped ? "이미 옮긴 글" : r.ok ? `원제목: ${titleOf(r.logNo)}` : r.error}
                                        {r.note ? ` · ${r.note}` : ""}
                                    </p>
                                </div>
                                {r.ok && r.slug && lawyer?.slug && (
                                    <a href={`/blog/${lawyer.slug}/${r.slug}`} target="_blank" rel="noreferrer" className="ml-auto shrink-0 text-white/40 hover:text-white"><ExternalLink size={15} /></a>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
