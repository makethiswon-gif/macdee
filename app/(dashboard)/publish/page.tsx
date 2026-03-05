"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BookOpen,
    Instagram,
    Globe,
    Search,
    Copy,
    Check,
    Loader2,
    Rocket,
    ExternalLink,
    CheckCircle2,
    Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const CHANNEL_META: Record<string, { label: string; icon: typeof BookOpen; color: string; method: string }> = {
    blog: { label: "네이버 블로그", icon: BookOpen, color: "#03C75A", method: "원클릭 복사 → 수동 발행" },
    instagram: { label: "인스타그램", icon: Instagram, color: "#E1306C", method: "Graph API 자동 발행" },
    google: { label: "구글 SEO", icon: Globe, color: "#4285F4", method: "자동 발행" },
    macdee: { label: "AI 검색", icon: Search, color: "#3563AE", method: "자동 발행" },
};

interface Content {
    id: string;
    channel: string;
    title: string;
    body: string;
    status: string;
    created_at: string;
}

interface Publication {
    id: string;
    channel: string;
    status: string;
    external_url: string | null;
    published_at: string;
    contents: { title: string; channel: string } | null;
}

export default function PublishPage() {
    const [approved, setApproved] = useState<Content[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        const [contentsRes, pubRes] = await Promise.all([
            fetch("/api/contents"),
            fetch("/api/publish"),
        ]);
        const contentsData = await contentsRes.json();
        const pubData = await pubRes.json();
        setApproved((contentsData.contents || []).filter((c: Content) => c.status === "approved"));
        setPublications(pubData.publications || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePublish = async (contentId: string) => {
        setPublishing(contentId);
        try {
            await fetch("/api/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content_id: contentId }),
            });
            await fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setPublishing(null);
        }
    };

    const handlePublishAll = async () => {
        for (const c of approved) {
            await handlePublish(c.id);
        }
    };

    const handleCopy = (id: string, body: string) => {
        navigator.clipboard.writeText(body);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#3563AE]" /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F2937]">발행</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">승인된 콘텐츠를 채널에 발행합니다.</p>
                </div>
                {approved.length > 0 && (
                    <button
                        onClick={handlePublishAll}
                        disabled={!!publishing}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] disabled:opacity-50 transition-colors shadow-md shadow-[#3563AE]/15"
                    >
                        <Rocket size={14} /> 전체 발행
                    </button>
                )}
            </div>

            {/* Approved contents - ready to publish */}
            {approved.length > 0 ? (
                <div className="mt-8">
                    <p className="text-sm font-semibold text-[#374151] mb-4">📋 발행 대기 ({approved.length}건)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {approved.map((c) => {
                            const ch = CHANNEL_META[c.channel] || CHANNEL_META.blog;
                            const isPublishing = publishing === c.id;
                            return (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 rounded-2xl bg-white border border-[#E8EBF0] hover:shadow-md transition-shadow"
                                >
                                    {/* Channel header */}
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ background: `${ch.color}12` }}
                                        >
                                            <ch.icon size={15} style={{ color: ch.color }} />
                                        </div>
                                        <div>
                                            <span className="text-[13px] font-semibold" style={{ color: ch.color }}>{ch.label}</span>
                                            <p className="text-[10px] text-[#9CA3B0]">{ch.method}</p>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <p className="text-sm font-medium text-[#1F2937] truncate">{c.title}</p>

                                    {/* Preview */}
                                    <p className="mt-1 text-[12px] text-[#9CA3B0] line-clamp-2 leading-relaxed">
                                        {c.body.slice(0, 120)}...
                                    </p>

                                    {/* Actions */}
                                    <div className="mt-4 flex items-center gap-2">
                                        {c.channel === "blog" ? (
                                            /* Naver: Copy for manual publish */
                                            <button
                                                onClick={() => handleCopy(c.id, c.body)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors"
                                                style={{ background: `${ch.color}12`, color: ch.color }}
                                            >
                                                {copied === c.id ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 본문 복사 → 네이버 발행</>}
                                            </button>
                                        ) : (
                                            /* Others: Auto publish */
                                            <button
                                                onClick={() => handlePublish(c.id)}
                                                disabled={isPublishing}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-colors"
                                                style={{ background: ch.color }}
                                            >
                                                {isPublishing ? <><Loader2 size={12} className="animate-spin" /> 발행 중...</> : <><Rocket size={12} /> 발행</>}
                                            </button>
                                        )}

                                        {/* Also copy for Naver after copying */}
                                        {c.channel === "blog" && (
                                            <button
                                                onClick={() => handlePublish(c.id)}
                                                disabled={isPublishing}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#6B7280] bg-[#F3F4F6] rounded-lg hover:bg-[#E5E7EB] transition-colors"
                                            >
                                                {isPublishing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                발행 완료
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="mt-8 p-12 rounded-2xl bg-white border border-[#E8EBF0] text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#3563AE]/[0.06] flex items-center justify-center">
                        <Rocket size={24} className="text-[#3563AE]" />
                    </div>
                    <p className="text-sm font-semibold text-[#374151]">발행 대기 중인 콘텐츠가 없습니다</p>
                    <p className="text-xs text-[#9CA3B0] mt-1">콘텐츠를 먼저 생성하고 승인해주세요</p>
                </div>
            )}

            {/* Publication history */}
            {publications.length > 0 && (
                <div className="mt-12">
                    <p className="text-sm font-semibold text-[#374151] mb-4">📊 발행 이력</p>
                    <div className="bg-white rounded-2xl border border-[#E8EBF0] divide-y divide-[#E8EBF0] overflow-hidden">
                        <AnimatePresence>
                            {publications.map((p, i) => {
                                const ch = CHANNEL_META[p.channel] || CHANNEL_META.blog;
                                return (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="flex items-center gap-4 p-4"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${ch.color}12` }}
                                        >
                                            <ch.icon size={14} style={{ color: ch.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#1F2937] truncate">
                                                {p.contents?.title || "제목 없음"}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px] font-medium" style={{ color: ch.color }}>{ch.label}</span>
                                                <span className="text-[#D1D5DB]">·</span>
                                                <span className="text-[11px] text-[#9CA3B0] flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatDistanceToNow(new Date(p.published_at), { addSuffix: true, locale: ko })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md text-emerald-600 bg-emerald-50">
                                                발행됨
                                            </span>
                                            {p.external_url && (
                                                <a href={p.external_url} target="_blank" className="text-[#9CA3B0] hover:text-[#3563AE] transition-colors">
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}
