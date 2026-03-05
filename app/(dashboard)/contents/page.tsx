"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    FileText,
    BookOpen,
    Instagram,
    Globe,
    Search,
    Wand2,
    Loader2,
    Filter,
    Palette,
    ChevronDown,
    ChevronUp,
    Clock,
    Film,
    Trash2,
    CheckSquare,
    Square,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const CHANNEL_META: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
    blog: { label: "네이버 블로그", icon: BookOpen, color: "#03C75A" },
    instagram: { label: "인스타그램", icon: Instagram, color: "#E1306C" },
    google: { label: "구글 SEO", icon: Globe, color: "#4285F4" },
    macdee: { label: "AI 검색", icon: Search, color: "#3563AE" },
    webtoon: { label: "웹툰", icon: Film, color: "#F59E0B" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "초안", color: "text-gray-500", bg: "bg-gray-100" },
    review: { label: "검토 대기", color: "text-amber-600", bg: "bg-amber-50" },
    approved: { label: "승인됨", color: "text-emerald-600", bg: "bg-emerald-50" },
    published: { label: "발행됨", color: "text-blue-600", bg: "bg-blue-50" },
    failed: { label: "실패", color: "text-red-600", bg: "bg-red-50" },
};

const BLOG_STYLES = [
    { key: "novel", label: "소설형", desc: "이야기처럼 풀어내는 스토리텔링" },
    { key: "essay", label: "에세이", desc: "변호사의 솔직한 경험과 생각" },
    { key: "column", label: "칼럼", desc: "전문가 시각의 객관적 분석" },
    { key: "review", label: "후기", desc: "사건 처리 과정과 결과 정리" },
];

const CARD_COLORS = [
    { key: "default", label: "다크 네이비", colors: ["#1a1a2e", "#16213e"] },
    { key: "warm", label: "웜 브라운", colors: ["#2C1810", "#3D2317"] },
    { key: "forest", label: "포레스트", colors: ["#1A2E1A", "#162E22"] },
    { key: "slate", label: "슬레이트", colors: ["#1E293B", "#0F172A"] },
    { key: "wine", label: "와인", colors: ["#2E1A1A", "#3D1F1F"] },
    { key: "custom", label: "커스텀", colors: ["#1a1a2e", "#16213e"] },
];

const WEBTOON_STYLES = [
    { key: "dramatic", label: "극화 만화", desc: "진지한 법정 드라마풍", icon: "🎭" },
    { key: "soft", label: "감성 일러스트", desc: "부드럽고 따뜻한", icon: "🎨" },
    { key: "cinematic", label: "시네마틱", desc: "실사 영화 스틸컷", icon: "🎬" },
    { key: "minimal", label: "미니멀", desc: "깔끔한 라인 아트", icon: "✏️" },
];

interface Content {
    id: string;
    channel: string;
    title: string;
    body: string;
    status: string;
    created_at: string;
    uploads?: { title: string; type: string } | null;
}

export default function ContentsPage() {
    const [contents, setContents] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [filter, setFilter] = useState("all");
    const [generating, setGenerating] = useState(false);
    const [generatingWebtoon, setGeneratingWebtoon] = useState(false);
    const [uploads, setUploads] = useState<{ id: string; title: string; status: string }[]>([]);
    const [expandedUpload, setExpandedUpload] = useState<string | null>(null);
    const [uploadStyles, setUploadStyles] = useState<Record<string, string>>({});
    const [uploadColors, setUploadColors] = useState<Record<string, string>>({});
    const [webtoonStyles, setWebtoonStyles] = useState<Record<string, string>>({});
    const [customColorInput, setCustomColorInput] = useState("#1a1a2e");
    // Track which generation types have been completed per upload
    const [completedAI, setCompletedAI] = useState<Record<string, boolean>>({});
    const [completedWebtoon, setCompletedWebtoon] = useState<Record<string, boolean>>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const contentsRef = useRef(contents);
    contentsRef.current = contents;

    const fetchContents = useCallback(async (loadMore = false) => {
        const offset = loadMore ? contentsRef.current.length : 0;
        const url = filter === "all" ? `/api/contents?limit=20&offset=${offset}` : `/api/contents?channel=${filter}&limit=20&offset=${offset}`;
        if (loadMore) setLoadingMore(true); else setLoading(true);
        const res = await fetch(url);
        const data = await res.json();
        if (loadMore) {
            setContents(prev => [...prev, ...(data.contents || [])]);
        } else {
            setContents(data.contents || []);
        }
        setHasMore(data.hasMore || false);
        setLoading(false);
        setLoadingMore(false);
    }, [filter]);

    const fetchUploads = useCallback(async () => {
        try {
            const res = await fetch("/api/uploads");
            const data = await res.json();
            // Filter to only show uploads with "processing" status
            setUploads((data.uploads || []).filter((u: { status: string }) => u.status === "processing"));
        } catch {
            console.error("Failed to fetch uploads");
        }
    }, []);

    useEffect(() => { fetchContents(); fetchUploads(); }, [fetchContents, fetchUploads]);

    const getStyleForUpload = (uploadId: string) => uploadStyles[uploadId] || "column";

    const setStyleForUpload = (uploadId: string, style: string) => {
        setUploadStyles((prev) => ({ ...prev, [uploadId]: style }));
    };

    const handleDeleteUpload = async (uploadId: string) => {
        if (!confirm("이 업로드를 삭제하시겠습니까?")) return;
        try {
            const res = await fetch("/api/uploads", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ upload_id: uploadId }),
            });
            if (res.ok) {
                toast.success("업로드가 삭제되었습니다.");
                await fetchUploads();
            } else {
                const data = await res.json();
                toast.error(data.error || "삭제에 실패했습니다.");
            }
        } catch {
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteContent = async (contentId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("이 콘텐츠를 삭제하시겠습니까?")) return;
        try {
            const res = await fetch("/api/contents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: contentId }),
            });
            if (res.ok) {
                toast.success("콘텐츠가 삭제되었습니다.");
                setContents(prev => prev.filter(c => c.id !== contentId));
                setSelectedIds(prev => { const n = new Set(prev); n.delete(contentId); return n; });
            } else {
                const data = await res.json();
                toast.error(data.error || "삭제에 실패했습니다.");
            }
        } catch {
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`선택한 ${selectedIds.size}개 콘텐츠를 삭제하시겠습니까?`)) return;
        setBulkDeleting(true);
        let deleted = 0;
        for (const id of selectedIds) {
            try {
                const res = await fetch("/api/contents", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                });
                if (res.ok) deleted++;
            } catch { /* skip */ }
        }
        toast.success(`${deleted}개 콘텐츠가 삭제되었습니다.`);
        setSelectedIds(new Set());
        setContents(prev => prev.filter(c => !selectedIds.has(c.id)));
        setBulkDeleting(false);
    };

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === contents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(contents.map(c => c.id)));
        }
    };

    const handleGenerate = async (uploadId: string) => {
        setGenerating(true);
        try {
            const blogStyle = getStyleForUpload(uploadId);
            const res = await fetch("/api/contents/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ upload_id: uploadId, blogStyle }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(`생성 실패: ${data.error || "알 수 없는 오류"}`);
            } else {
                const failCount = data.errors?.length || 0;
                const successCount = data.successful || 0;
                if (successCount === 0) {
                    toast.error("콘텐츠 생성에 실패했습니다. PDF 텍스트가 너무 짧거나 인식이 안 될 수 있습니다. 다른 파일로 시도해 주세요.");
                } else if (failCount > 0) {
                    toast.warning(`${successCount}개 채널 생성 완료, ${failCount}개 채널 실패.`);
                } else {
                    toast.success(`${successCount}개 채널 콘텐츠가 생성되었습니다!`);
                }
                // Mark AI generation as completed for this upload
                setCompletedAI(prev => ({ ...prev, [uploadId]: true }));
            }
            await fetchContents();
            await fetchUploads();
        } catch (err) {
            toast.error("콘텐츠 생성 중 오류가 발생했습니다.");
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateWebtoon = async (uploadId: string) => {
        setGeneratingWebtoon(true);
        try {
            const res = await fetch("/api/contents/generate-webtoon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ upload_id: uploadId, webtoon_style: webtoonStyles[uploadId] || "dramatic" }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 403) {
                    toast.error("웹툰 기능은 무제한 플랜에서만 사용할 수 있습니다.");
                } else {
                    toast.error(`웹툰 생성 실패: ${data.error || "알 수 없는 오류"}`);
                }
            } else {
                toast.success(`4컷 만화가 생성되었습니다! (${data.panels}컷)`);
                // Mark webtoon generation as completed for this upload
                setCompletedWebtoon(prev => ({ ...prev, [uploadId]: true }));
            }
            await fetchContents();
            await fetchUploads();
        } catch (err) {
            toast.error("웹툰 생성 중 오류가 발생했습니다.");
            console.error(err);
        } finally {
            setGeneratingWebtoon(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F2937]">콘텐츠</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">AI가 생성한 콘텐츠를 관리합니다.</p>
                </div>
            </div>

            {/* Pending uploads to generate */}
            {uploads.length > 0 && (
                <div className="mt-6 p-4 rounded-2xl bg-[#3563AE]/[0.04] border border-[#3563AE]/10">
                    <p className="text-sm font-semibold text-[#1F2937] mb-3">📝 AI 콘텐츠 생성 대기 중</p>
                    <div className="space-y-3">
                        {uploads.map((u) => {
                            const isExpanded = expandedUpload === u.id;
                            const selectedStyle = getStyleForUpload(u.id);
                            const aiDone = completedAI[u.id] || false;
                            const webtoonDone = completedWebtoon[u.id] || false;

                            // If both are done, hide the entire upload item
                            if (aiDone && webtoonDone) return null;

                            return (
                                <div key={u.id} className="rounded-xl bg-white border border-[#E8EBF0] overflow-hidden">
                                    {/* Upload header */}
                                    <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3">
                                            <FileText size={16} className="text-[#3563AE]" />
                                            <span className="text-sm text-[#374151]">{u.title || "제목 없음"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!aiDone && (
                                                <button
                                                    onClick={() => handleGenerate(u.id)}
                                                    disabled={generating || generatingWebtoon}
                                                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#3563AE] rounded-lg hover:bg-[#2A4F8A] disabled:opacity-50 transition-colors"
                                                >
                                                    {generating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                                    AI 생성
                                                </button>
                                            )}
                                            {aiDone && (
                                                <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg">
                                                    ✅ AI 완료
                                                </span>
                                            )}
                                            {!webtoonDone && (
                                                <button
                                                    onClick={() => handleGenerateWebtoon(u.id)}
                                                    disabled={generating || generatingWebtoon}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg hover:bg-[#F59E0B]/20 disabled:opacity-50 transition-colors"
                                                >
                                                    {generatingWebtoon ? <Loader2 size={12} className="animate-spin" /> : <Film size={12} />}
                                                    웹툰
                                                </button>
                                            )}
                                            {webtoonDone && (
                                                <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg">
                                                    ✅ 웹툰 완료
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleDeleteUpload(u.id)}
                                                className="flex items-center gap-1 px-2 py-1.5 text-xs text-[#EF4444] hover:bg-red-50 rounded-lg transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Style options - always visible */}
                                    <div className="px-3 pb-3"
                                    >
                                        <div className="px-3 pb-3 border-t border-[#E8EBF0] pt-3 space-y-3">
                                            {/* Blog style */}
                                            <div>
                                                <p className="text-[11px] font-semibold text-[#6B7280] mb-2 flex items-center gap-1.5">
                                                    <BookOpen size={11} /> 네이버 블로그 스타일
                                                </p>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {BLOG_STYLES.map((style) => (
                                                        <button
                                                            key={style.key}
                                                            onClick={() => setStyleForUpload(u.id, style.key)}
                                                            className={`p-2.5 rounded-xl border text-left transition-all ${selectedStyle === style.key
                                                                ? "border-[#3563AE] bg-[#3563AE]/[0.06]"
                                                                : "border-[#E4E7ED] hover:border-[#3563AE]/30"
                                                                }`}
                                                        >
                                                            <p className={`text-[12px] font-semibold ${selectedStyle === style.key ? "text-[#3563AE]" : "text-[#374151]"
                                                                }`}>
                                                                {style.label}
                                                            </p>
                                                            <p className="text-[10px] text-[#9CA3B0] mt-0.5 leading-tight">
                                                                {style.desc}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Card news color */}
                                            <div>
                                                <p className="text-[11px] font-semibold text-[#6B7280] mb-2 flex items-center gap-1.5">
                                                    <Palette size={11} /> 카드뉴스 색상
                                                </p>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {CARD_COLORS.map((color) => {
                                                        const selected = (uploadColors[u.id] || "default") === color.key;
                                                        return (
                                                            <button
                                                                key={color.key}
                                                                onClick={() => setUploadColors((prev) => ({ ...prev, [u.id]: color.key }))}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${selected
                                                                    ? "border-[#3563AE] bg-[#3563AE]/[0.06]"
                                                                    : "border-[#E4E7ED] hover:border-[#3563AE]/30"
                                                                    }`}
                                                            >
                                                                <div
                                                                    className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                                                                    style={{ background: `linear-gradient(135deg, ${color.colors[0]}, ${color.colors[1]})` }}
                                                                />
                                                                <span className={`text-[10px] font-medium ${selected ? "text-[#3563AE]" : "text-[#6B7280]"}`}>
                                                                    {color.label}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {(uploadColors[u.id]) === "custom" && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={customColorInput}
                                                            onChange={(e) => setCustomColorInput(e.target.value)}
                                                            className="w-8 h-8 rounded-lg border border-[#E4E7ED] cursor-pointer appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded"
                                                        />
                                                        <span className="text-[10px] text-[#9CA3B0] font-mono">{customColorInput.toUpperCase()}</span>
                                                        <div className="flex gap-1 ml-2">
                                                            {["#1a1a2e", "#2C1810", "#1A2E1A", "#1E293B", "#2E1A1A", "#0D1B2A", "#2D132C", "#1A1A1A"].map((c) => (
                                                                <button
                                                                    key={c}
                                                                    onClick={() => setCustomColorInput(c)}
                                                                    className={`w-5 h-5 rounded-full border transition-all ${customColorInput === c ? "border-[#3563AE] scale-110" : "border-transparent hover:border-[#D1D5DB]"}`}
                                                                    style={{ background: c }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Webtoon style */}
                                            <div>
                                                <p className="text-[11px] font-semibold text-[#6B7280] mb-2 flex items-center gap-1.5">
                                                    <Film size={11} /> 웹툰 그림체
                                                </p>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {WEBTOON_STYLES.map((style) => {
                                                        const sel = (webtoonStyles[u.id] || "dramatic") === style.key;
                                                        return (
                                                            <button
                                                                key={style.key}
                                                                onClick={() => setWebtoonStyles((prev) => ({ ...prev, [u.id]: style.key }))}
                                                                className={`p-2.5 rounded-xl border text-left transition-all ${sel
                                                                    ? "border-[#F59E0B] bg-[#F59E0B]/[0.06]"
                                                                    : "border-[#E4E7ED] hover:border-[#F59E0B]/30"
                                                                    }`}
                                                            >
                                                                <p className={`text-[12px] font-semibold ${sel ? "text-[#F59E0B]" : "text-[#374151]"}`}>
                                                                    {style.icon} {style.label}
                                                                </p>
                                                                <p className="text-[10px] text-[#9CA3B0] mt-0.5">{style.desc}</p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
            }

            {/* Channel filter */}
            <div className="mt-6 flex gap-1.5 p-1 rounded-xl bg-[#E8EBF0]/50 overflow-x-auto">
                <button
                    onClick={() => setFilter("all")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${filter === "all" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
                        }`}
                >
                    <Filter size={14} /> 전체
                </button>
                {Object.entries(CHANNEL_META).map(([key, val]) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${filter === key ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
                            }`}
                    >
                        <val.icon size={14} /> {val.label}
                    </button>
                ))}
            </div>

            {/* Content list */}
            <div className="mt-6">
                {loading ? (
                    <div className="text-center py-16">
                        <Loader2 size={24} className="animate-spin text-[#3563AE] mx-auto" />
                    </div>
                ) : contents.length === 0 ? (
                    <div className="p-12 rounded-2xl bg-white border border-[#E8EBF0] text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#3563AE]/[0.06] flex items-center justify-center">
                            <FileText size={24} className="text-[#3563AE]" />
                        </div>
                        <p className="text-sm font-semibold text-[#374151]">아직 생성된 콘텐츠가 없습니다</p>
                        <p className="text-xs text-[#9CA3B0] mt-1">업로드 후 AI 생성 버튼을 눌러보세요</p>
                        <Link
                            href="/upload"
                            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#3563AE] rounded-lg hover:bg-[#2A4F8A] transition-colors"
                        >
                            업로드하기
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Bulk action bar */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-3">
                                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[12px] font-medium text-[#6B7280] hover:text-[#374151] transition-colors">
                                    {selectedIds.size === contents.length && contents.length > 0
                                        ? <CheckSquare size={16} className="text-[#3563AE]" />
                                        : <Square size={16} />}
                                    전체 선택
                                </button>
                                {selectedIds.size > 0 && (
                                    <span className="text-[12px] text-[#3563AE] font-medium">{selectedIds.size}개 선택됨</span>
                                )}
                            </div>
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626] disabled:opacity-50 transition-colors"
                                >
                                    {bulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    {selectedIds.size}개 삭제
                                </button>
                            )}
                        </div>
                        <AnimatePresence>
                            <div className="bg-white rounded-2xl border border-[#E8EBF0] divide-y divide-[#E8EBF0] overflow-hidden">
                                {contents.map((c, i) => {
                                    const ch = CHANNEL_META[c.channel] || CHANNEL_META.blog;
                                    const st = STATUS_META[c.status] || STATUS_META.draft;
                                    return (
                                        <motion.div
                                            key={c.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                        >
                                            <Link
                                                href={`/contents/${c.id}`}
                                                className={`flex items-center gap-4 p-4 hover:bg-[#F9FAFB] transition-colors ${selectedIds.has(c.id) ? 'bg-[#3563AE]/[0.04]' : ''}`}
                                            >
                                                <button
                                                    onClick={(e) => toggleSelect(c.id, e)}
                                                    className="flex-shrink-0"
                                                >
                                                    {selectedIds.has(c.id)
                                                        ? <CheckSquare size={18} className="text-[#3563AE]" />
                                                        : <Square size={18} className="text-[#D1D5DB]" />}
                                                </button>
                                                <div
                                                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{ background: `${ch.color}12` }}
                                                >
                                                    <ch.icon size={16} style={{ color: ch.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#1F2937] truncate">{c.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[11px] font-medium" style={{ color: ch.color }}>{ch.label}</span>
                                                        <span className="text-[#D1D5DB]">·</span>
                                                        <span className="text-[11px] text-[#9CA3B0] flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${st.color} ${st.bg}`}>
                                                    {st.label}
                                                </span>
                                                <button
                                                    onClick={(e) => handleDeleteContent(c.id, e)}
                                                    className="p-1.5 rounded-lg text-[#9CA3B0] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
                                                    title="삭제"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </AnimatePresence>
                        {hasMore && (
                            <button
                                onClick={() => fetchContents(true)}
                                disabled={loadingMore}
                                className="w-full mt-3 py-3 rounded-xl border border-[#E8EBF0] bg-white text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
                            >
                                {loadingMore ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : null}
                                더 보기
                            </button>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
