"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
    Globe,
    Sparkles,
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
    results?: { channel: string; title: string; success: boolean }[];
}

const INPUT_MODES = [
    { key: "rss" as InputMode, label: "RSS 자동 불러오기", icon: Rss, desc: "블로그 ID 입력으로 최근 글 자동 조회" },
    { key: "url" as InputMode, label: "URL 붙여넣기", icon: Link2, desc: "한 줄에 하나씩 URL을 붙여넣기" },
    { key: "file" as InputMode, label: "파일 업로드", icon: FileUp, desc: "URL 목록이 담긴 TXT/CSV 파일" },
];

export default function MigratePage() {
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
    const router = useRouter();

    // ─── Step 1: Load posts ───
    const loadFromRss = async () => {
        if (!blogId.trim()) return;
        setLoading(true);
        setError("");
        setRssNotice("");

        try {
            const res = await fetch(`/api/migrate/list?blogId=${encodeURIComponent(blogId.trim())}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "글 목록을 불러올 수 없습니다.");
                return;
            }

            setPosts(data.posts.map((p: { title: string; url: string; date: string }) => ({
                ...p,
                selected: true,
                status: "pending" as PostStatus,
            })));
            if (data.notice) setRssNotice(data.notice);
            setStep(2);
        } catch {
            setError("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const loadFromUrls = () => {
        const urls = urlText
            .split("\n")
            .map((u) => u.trim())
            .filter((u) => u.startsWith("http"));

        if (urls.length === 0) {
            setError("유효한 URL을 입력해주세요.");
            return;
        }

        setPosts(urls.map((url) => ({
            title: url,
            url,
            selected: true,
            status: "pending" as PostStatus,
        })));
        setStep(2);
    };

    const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const urls = text
                .split("\n")
                .map((u) => u.trim())
                .filter((u) => u.startsWith("http"));

            if (urls.length === 0) {
                setError("파일에서 유효한 URL을 찾을 수 없습니다.");
                return;
            }

            setPosts(urls.map((url) => ({
                title: url,
                url,
                selected: true,
                status: "pending" as PostStatus,
            })));
            setStep(2);
        };
        reader.readAsText(file);
    };

    // ─── Step 2: Selection ───
    const toggleAll = () => {
        const allSelected = posts.every((p) => p.selected);
        setPosts((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
    };

    const togglePost = (idx: number) => {
        setPosts((prev) => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
    };

    const selectedCount = posts.filter((p) => p.selected).length;

    // ─── Step 3: Process ───
    const startMigration = useCallback(async () => {
        const selectedUrls = posts.filter((p) => p.selected).map((p) => p.url);
        if (selectedUrls.length === 0) return;

        setStep(3);
        setProcessing(true);

        try {
            const res = await fetch("/api/migrate/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ urls: selectedUrls }),
            });

            if (!res.ok || !res.body) {
                setError("마이그레이션을 시작할 수 없습니다.");
                setProcessing(false);
                return;
            }

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
                                const selected = prev.filter((p) => p.selected);
                                const idx = data.index;
                                if (idx >= 0 && idx < selected.length) {
                                    // Map back to original array
                                    let selectedIdx = 0;
                                    return prev.map((p) => {
                                        if (!p.selected) return p;
                                        if (selectedIdx === idx) {
                                            selectedIdx++;
                                            return {
                                                ...p,
                                                title: data.title || p.title,
                                                status: data.status as PostStatus,
                                                error: data.error,
                                                results: data.results,
                                            };
                                        }
                                        selectedIdx++;
                                        return p;
                                    });
                                }
                                return prev;
                            });
                        }
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "마이그레이션 중 오류 발생");
        } finally {
            setProcessing(false);
        }
    }, [posts]);

    // ─── Progress Stats ───
    const selectedPosts = posts.filter((p) => p.selected);
    const doneCount = selectedPosts.filter((p) => p.status === "done").length;
    const errorCount = selectedPosts.filter((p) => p.status === "error").length;
    const progressPercent = selectedPosts.length > 0
        ? Math.round(((doneCount + errorCount) / selectedPosts.length) * 100)
        : 0;

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
            case "generating": return "AI 윤문 중...";
            case "done": return "완료";
            case "error": return "실패";
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <ArrowRightLeft size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">네이버 블로그 옮기기</h1>
                    <p className="text-sm text-white/40">기존 네이버 블로그 글을 구글 SEO + AI 검색 최적화 콘텐츠로 변환</p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 my-6">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? "bg-[#3563AE] text-white" : "bg-white/5 text-white/30"
                            }`}>
                            {s}
                        </div>
                        <span className={`text-xs font-medium hidden sm:block ${step >= s ? "text-white/70" : "text-white/20"}`}>
                            {s === 1 ? "글 목록" : s === 2 ? "선택" : "실행"}
                        </span>
                        {s < 3 && <ChevronRight size={14} className="text-white/15 ml-1" />}
                    </div>
                ))}
            </div>

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400"
                    >
                        <AlertCircle size={16} />
                        {error}
                        <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ STEP 1: Input ═══ */}
            {step === 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    {/* Mode tabs */}
                    <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03]">
                        {INPUT_MODES.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => { setInputMode(m.key); setError(""); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${inputMode === m.key
                                        ? "bg-[#3563AE]/15 text-[#6B94E0]"
                                        : "text-white/35 hover:text-white/50 hover:bg-white/[0.03]"
                                    }`}
                            >
                                <m.icon size={15} />
                                <span className="hidden sm:inline">{m.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* RSS input */}
                    {inputMode === "rss" && (
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">네이버 블로그 ID 또는 URL</label>
                                <input
                                    type="text"
                                    value={blogId}
                                    onChange={(e) => setBlogId(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && loadFromRss()}
                                    placeholder="lawyer_blog 또는 https://blog.naver.com/lawyer_blog"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#3563AE]/30 focus:border-[#3563AE]/40 transition-all"
                                />
                            </div>
                            <button
                                onClick={loadFromRss}
                                disabled={loading || !blogId.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                {loading ? "불러오는 중..." : "글 목록 불러오기"}
                            </button>
                            <p className="text-xs text-white/25">RSS는 최근 글 30~50개를 제공합니다. 더 많은 글은 URL 붙여넣기를 사용하세요.</p>
                        </div>
                    )}

                    {/* URL paste */}
                    {inputMode === "url" && (
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                            <div>
                                <label className="text-sm font-medium text-white/60 mb-2 block">블로그 글 URL 목록 (한 줄에 하나씩)</label>
                                <textarea
                                    value={urlText}
                                    onChange={(e) => setUrlText(e.target.value)}
                                    placeholder={"https://blog.naver.com/lawyer_blog/223456789001\nhttps://blog.naver.com/lawyer_blog/223456789002\nhttps://blog.naver.com/lawyer_blog/223456789003"}
                                    rows={10}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#3563AE]/30 focus:border-[#3563AE]/40 transition-all resize-none font-mono text-xs"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-white/25">
                                    {urlText.split("\n").filter((u) => u.trim().startsWith("http")).length}개 URL 감지
                                </p>
                                <button
                                    onClick={loadFromUrls}
                                    disabled={!urlText.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    다음 <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* File upload */}
                    {inputMode === "file" && (
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="p-8 rounded-xl border-2 border-dashed border-white/[0.08] text-center cursor-pointer hover:border-[#3563AE]/30 hover:bg-white/[0.02] transition-all"
                            >
                                <FileUp size={28} className="mx-auto mb-3 text-white/20" />
                                <p className="text-sm font-medium text-white/50">TXT 또는 CSV 파일을 클릭하여 선택</p>
                                <p className="text-xs text-white/25 mt-1">한 줄에 하나의 URL이 포함된 파일</p>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".txt,.csv"
                                onChange={loadFromFile}
                                className="hidden"
                            />
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ STEP 2: Selection ═══ */}
            {step === 2 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {rssNotice && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                            💡 {rssNotice}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setStep(1)} className="text-white/30 hover:text-white/60 transition-colors">
                                <ArrowLeft size={18} />
                            </button>
                            <span className="text-sm text-white/50">{posts.length}개 글 중 <strong className="text-white/80">{selectedCount}개</strong> 선택</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleAll}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10 transition-all"
                            >
                                {posts.every((p) => p.selected) ? "전체 해제" : "전체 선택"}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                        {posts.map((post, i) => (
                            <label
                                key={i}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${post.selected ? "bg-white/[0.04] border border-[#3563AE]/20" : "bg-white/[0.02] border border-transparent hover:bg-white/[0.03]"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={post.selected}
                                    onChange={() => togglePost(i)}
                                    className="w-4 h-4 rounded accent-[#3563AE]"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white/70 truncate">{post.title}</p>
                                    {post.date && <p className="text-[11px] text-white/25 mt-0.5">{post.date}</p>}
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* Estimate & Start */}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs text-white/40">
                                예상 소요 시간: <strong className="text-white/60">약 {Math.ceil(selectedCount * 0.5)}분</strong>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/30">
                                <Globe size={12} /> 구글 SEO
                                <Sparkles size={12} /> AI 검색
                            </div>
                        </div>
                        <button
                            onClick={startMigration}
                            disabled={selectedCount === 0}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/10"
                        >
                            <ArrowRightLeft size={16} />
                            {selectedCount}개 글 옮겨오기 시작
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ═══ STEP 3: Processing ═══ */}
            {step === 3 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Progress header */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-white/60">
                                {processing ? "마이그레이션 진행 중..." : "마이그레이션 완료"}
                            </span>
                            <span className="text-sm font-bold text-white/80">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> {doneCount} 완료</span>
                            {errorCount > 0 && <span className="flex items-center gap-1"><XCircle size={12} className="text-red-400" /> {errorCount} 실패</span>}
                            <span>{selectedPosts.length - doneCount - errorCount} 남음</span>
                        </div>
                    </div>

                    {/* Post list */}
                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                        {selectedPosts.map((post, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${post.status === "done" ? "bg-emerald-500/5 border border-emerald-500/10"
                                        : post.status === "error" ? "bg-red-500/5 border border-red-500/10"
                                            : post.status === "scraping" || post.status === "generating" ? "bg-[#3563AE]/5 border border-[#3563AE]/10"
                                                : "bg-white/[0.02] border border-transparent"
                                    }`}
                            >
                                {statusIcon(post.status)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white/70 truncate">{post.title}</p>
                                    <p className={`text-[11px] mt-0.5 ${post.status === "error" ? "text-red-400" : "text-white/25"
                                        }`}>
                                        {post.error || statusLabel(post.status)}
                                        {post.results && post.results.length > 0 && (
                                            <span className="ml-2">
                                                {post.results.map((r) => (
                                                    <span key={r.channel} className="mr-2">
                                                        {r.success ? "✅" : "❌"} {r.channel === "google" ? "SEO" : "AI"}
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Complete actions */}
                    {!processing && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push("/contents")}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[#3563AE] hover:bg-[#2A4F8A] transition-all"
                            >
                                콘텐츠 페이지로 이동
                            </button>
                            <button
                                onClick={() => { setStep(1); setPosts([]); setError(""); }}
                                className="px-4 py-3 rounded-xl text-sm font-medium text-white/40 border border-white/[0.06] hover:text-white/60 hover:border-white/10 transition-all"
                            >
                                추가 옮기기
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
