"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRightLeft,
    Rss,
    Link2,
    FileUp,
    Search,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronRight,
    BookOpen,
    ArrowLeft,
} from "lucide-react";

type InputMode = "rss" | "url" | "file";
type PostStatus = "pending" | "scraping" | "generating" | "done" | "error";

interface BlogPost {
    title: string;
    url: string;
    date?: string;
    selected: boolean;
    status: PostStatus;
    error?: string;
}

const INPUT_MODES = [
    { key: "rss" as InputMode, label: "RSS 자동 불러오기", icon: Rss },
    { key: "url" as InputMode, label: "URL 붙여넣기", icon: Link2 },
    { key: "file" as InputMode, label: "파일 업로드", icon: FileUp },
];

export default function AdminMagazineMigratePage() {
    const [step, setStep] = useState(1);
    const [inputMode, setInputMode] = useState<InputMode>("rss");
    const [blogId, setBlogId] = useState("");
    const [urlText, setUrlText] = useState("");
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");
    const [rssNotice, setRssNotice] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    // ─── Step 1: Load posts ───
    const loadFromRss = async () => {
        if (!blogId.trim()) return;
        setLoading(true); setError(""); setRssNotice("");
        try {
            const res = await fetch(`/api/migrate/list?blogId=${encodeURIComponent(blogId.trim())}`);
            const data = await res.json();
            if (!res.ok) { setError(data.error || "글 목록을 불러올 수 없습니다."); return; }
            setPosts(data.posts.map((p: { title: string; url: string; date: string }) => ({ ...p, selected: true, status: "pending" as PostStatus })));
            if (data.notice) setRssNotice(data.notice);
            setStep(2);
        } catch { setError("네트워크 오류가 발생했습니다."); }
        finally { setLoading(false); }
    };

    const loadFromUrls = () => {
        const urls = urlText.split("\n").map((u) => u.trim()).filter((u) => u.startsWith("http"));
        if (urls.length === 0) { setError("유효한 URL을 입력해주세요."); return; }
        setPosts(urls.map((url) => ({ title: url, url, selected: true, status: "pending" as PostStatus })));
        setStep(2);
    };

    const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const urls = text.split("\n").map((u) => u.trim()).filter((u) => u.startsWith("http"));
            if (urls.length === 0) { setError("파일에서 유효한 URL을 찾을 수 없습니다."); return; }
            setPosts(urls.map((url) => ({ title: url, url, selected: true, status: "pending" as PostStatus })));
            setStep(2);
        };
        reader.readAsText(file);
    };

    // ─── Step 2 ───
    const toggleAll = () => {
        const allSelected = posts.every((p) => p.selected);
        setPosts((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
    };
    const togglePost = (idx: number) => {
        setPosts((prev) => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
    };
    const selectedCount = posts.filter((p) => p.selected).length;

    // ─── Step 3: Process → Magazine ───
    const startMigration = useCallback(async () => {
        const selectedUrls = posts.filter((p) => p.selected).map((p) => p.url);
        if (selectedUrls.length === 0) return;
        setStep(3); setProcessing(true);
        try {
            const res = await fetch("/api/admin/magazines/migrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ urls: selectedUrls }),
            });
            if (!res.ok || !res.body) { setError("마이그레이션을 시작할 수 없습니다."); setProcessing(false); return; }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === "progress") {
                            setPosts((prev) => {
                                let selectedIdx = 0;
                                return prev.map((p) => {
                                    if (!p.selected) return p;
                                    if (selectedIdx === data.index) {
                                        selectedIdx++;
                                        return { ...p, title: data.title || p.title, status: data.status as PostStatus, error: data.error };
                                    }
                                    selectedIdx++;
                                    return p;
                                });
                            });
                        }
                    } catch { /* ignore */ }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "마이그레이션 중 오류 발생");
        } finally { setProcessing(false); }
    }, [posts]);

    // ─── Stats ───
    const selectedPosts = posts.filter((p) => p.selected);
    const doneCount = selectedPosts.filter((p) => p.status === "done").length;
    const errorCount = selectedPosts.filter((p) => p.status === "error").length;
    const progressPercent = selectedPosts.length > 0 ? Math.round(((doneCount + errorCount) / selectedPosts.length) * 100) : 0;

    const statusIcon = (status: PostStatus) => {
        switch (status) {
            case "pending": return <div className="w-5 h-5 rounded-full border-2 border-white/10" />;
            case "scraping": return <Loader2 size={18} className="text-blue-400 animate-spin" />;
            case "generating": return <Loader2 size={18} className="text-amber-400 animate-spin" />;
            case "done": return <CheckCircle2 size={18} className="text-emerald-400" />;
            case "error": return <XCircle size={18} className="text-red-400" />;
        }
    };
    const statusLabel = (status: PostStatus) => {
        switch (status) {
            case "pending": return "대기 중";
            case "scraping": return "스크래핑 중...";
            case "generating": return "매거진 변환 중...";
            case "done": return "완료 (draft 저장)";
            case "error": return "실패";
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <BookOpen size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">네이버 블로그 → 매거진</h1>
                    <p className="text-sm text-white/40">macdee 네이버 블로그 글을 매거진 기사(draft)로 변환</p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? "bg-purple-500 text-white" : "bg-white/5 text-white/30"}`}>{s}</div>
                        <span className={`text-xs font-medium hidden sm:block ${step >= s ? "text-white/70" : "text-white/20"}`}>
                            {s === 1 ? "글 목록" : s === 2 ? "선택" : "변환"}
                        </span>
                        {s < 3 && <ChevronRight size={14} className="text-white/15 ml-1" />}
                    </div>
                ))}
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle size={16} />{error}
                        <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ STEP 1 ═══ */}
            {step === 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03]">
                        {INPUT_MODES.map((m) => (
                            <button key={m.key} onClick={() => { setInputMode(m.key); setError(""); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${inputMode === m.key ? "bg-purple-500/15 text-purple-300" : "text-white/35 hover:text-white/50 hover:bg-white/[0.03]"}`}>
                                <m.icon size={15} /><span className="hidden sm:inline">{m.label}</span>
                            </button>
                        ))}
                    </div>

                    {inputMode === "rss" && (
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">macdee 네이버 블로그 ID 또는 URL</label>
                                <input type="text" value={blogId} onChange={(e) => setBlogId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadFromRss()}
                                    placeholder="macdee_blog 또는 https://blog.naver.com/macdee_blog"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/40 transition-all" />
                            </div>
                            <button onClick={loadFromRss} disabled={loading || !blogId.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                {loading ? "불러오는 중..." : "글 목록 불러오기"}
                            </button>
                        </div>
                    )}
                    {inputMode === "url" && (
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">블로그 글 URL 목록 (한 줄에 하나씩)</label>
                                <textarea value={urlText} onChange={(e) => setUrlText(e.target.value)}
                                    placeholder={"https://blog.naver.com/macdee_blog/223456789001\nhttps://blog.naver.com/macdee_blog/223456789002"}
                                    rows={10} className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none font-mono text-xs" />
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-white/25">{urlText.split("\n").filter((u) => u.trim().startsWith("http")).length}개 URL 감지</p>
                                <button onClick={loadFromUrls} disabled={!urlText.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-40 transition-all">
                                    다음 <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                    {inputMode === "file" && (
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <div onClick={() => fileRef.current?.click()} className="p-8 rounded-xl border-2 border-dashed border-white/[0.08] text-center cursor-pointer hover:border-purple-500/30 hover:bg-white/[0.02] transition-all">
                                <FileUp size={28} className="mx-auto mb-3 text-white/20" />
                                <p className="text-sm font-medium text-white/50">TXT 또는 CSV 파일을 클릭하여 선택</p>
                            </div>
                            <input ref={fileRef} type="file" accept=".txt,.csv" onChange={loadFromFile} className="hidden" />
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ STEP 2 ═══ */}
            {step === 2 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {rssNotice && <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">💡 {rssNotice}</div>}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setStep(1)} className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={18} /></button>
                            <span className="text-sm text-white/50">{posts.length}개 글 중 <strong className="text-white/80">{selectedCount}개</strong> 선택</span>
                        </div>
                        <button onClick={toggleAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 border border-white/[0.06] transition-all">
                            {posts.every((p) => p.selected) ? "전체 해제" : "전체 선택"}
                        </button>
                    </div>
                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                        {posts.map((post, i) => (
                            <label key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${post.selected ? "bg-white/[0.04] border border-purple-500/20" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.03]"}`}>
                                <input type="checkbox" checked={post.selected} onChange={() => togglePost(i)} className="w-4 h-4 rounded accent-purple-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white/70 truncate">{post.title}</p>
                                    {post.date && <p className="text-[11px] text-white/25 mt-0.5">{post.date}</p>}
                                </div>
                            </label>
                        ))}
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs text-white/40">예상 소요: <strong className="text-white/60">약 {Math.ceil(selectedCount * 0.5)}분</strong></div>
                            <div className="flex items-center gap-2 text-xs text-white/30"><BookOpen size={12} /> 매거진 draft로 저장</div>
                        </div>
                        <button onClick={startMigration} disabled={selectedCount === 0}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-40 transition-all shadow-lg shadow-purple-500/10">
                            <ArrowRightLeft size={16} />{selectedCount}개 글 매거진으로 변환
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ═══ STEP 3 ═══ */}
            {step === 3 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-white/60">{processing ? "매거진 변환 진행 중..." : "변환 완료"}</span>
                            <span className="text-sm font-bold text-white/80">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
                            <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> {doneCount} 완료</span>
                            {errorCount > 0 && <span className="flex items-center gap-1"><XCircle size={12} className="text-red-400" /> {errorCount} 실패</span>}
                            <span>{selectedPosts.length - doneCount - errorCount} 남음</span>
                        </div>
                    </div>
                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                        {selectedPosts.map((post, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${post.status === "done" ? "bg-emerald-500/5 border border-emerald-500/10" : post.status === "error" ? "bg-red-500/5 border border-red-500/10" : post.status === "scraping" || post.status === "generating" ? "bg-purple-500/5 border border-purple-500/10" : "bg-white/[0.02] border border-transparent"}`}>
                                {statusIcon(post.status)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white/70 truncate">{post.title}</p>
                                    <p className={`text-[11px] mt-0.5 ${post.status === "error" ? "text-red-400" : "text-white/25"}`}>
                                        {post.error || statusLabel(post.status)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!processing && (
                        <div className="flex gap-3">
                            <a href="/admin/magazines" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 transition-all">
                                매거진 관리로 이동
                            </a>
                            <button onClick={() => { setStep(1); setPosts([]); setError(""); }}
                                className="px-4 py-3 rounded-xl text-sm font-medium text-white/40 border border-white/[0.06] hover:text-white/60 transition-all">
                                추가 변환
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
