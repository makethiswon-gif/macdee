"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Upload,
    FileText,
    Rocket,
    Eye,
    BookOpen,
    Instagram,
    Globe,
    Search,
    Wand2,
    ArrowRight,
    ArrowUpRight,
    Loader2,
    Sparkles,
    TrendingUp,
    Zap,
} from "lucide-react";

const CHANNEL_META: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
    blog: { label: "네이버 블로그", icon: BookOpen, color: "#03C75A" },
    instagram: { label: "인스타그램", icon: Instagram, color: "#E1306C" },
    google: { label: "구글 SEO", icon: Globe, color: "#4285F4" },
    macdee: { label: "AI 검색", icon: Search, color: "#3563AE" },
};

export default function DashboardPage() {
    const [userName, setUserName] = useState("");
    const [stats, setStats] = useState({ uploads: 0, contents: 0, published: 0, views: 0, clicks: 0, inquiries: 0 });
    const [recentContents, setRecentContents] = useState<{ id: string; title: string; channel: string; status: string; created_at: string }[]>([]);
    const [pendingUploads, setPendingUploads] = useState(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: lawyer } = await supabase.from("lawyers").select("id, name").eq("user_id", user.id).single();
        if (!lawyer) { setLoading(false); return; }
        setUserName(lawyer.name);

        const [uploadsRes, contentsRes, pubsRes] = await Promise.all([
            supabase.from("uploads").select("id, status", { count: "exact" }).eq("lawyer_id", lawyer.id),
            supabase.from("contents").select("id, title, channel, status, created_at").eq("lawyer_id", lawyer.id).order("created_at", { ascending: false }).limit(5),
            supabase.from("publications").select("id", { count: "exact" }).eq("lawyer_id", lawyer.id),
        ]);

        const uploads = uploadsRes.data || [];
        const contents = contentsRes.data || [];
        const published = pubsRes.data || [];

        setPendingUploads(uploads.filter((u) => u.status === "processing").length);
        setRecentContents(contents);
        setStats({
            uploads: uploads.length,
            contents: contents.length,
            published: published.length,
            views: 0, clicks: 0, inquiries: 0,
        });
        setLoading(false);
    }, [supabase]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={24} className="animate-spin text-[#3563AE]" />
                    <p className="text-[12px] text-white/20">로딩 중...</p>
                </div>
            </div>
        );
    }

    const quickCards = [
        { label: "총 업로드", value: stats.uploads, icon: Upload, color: "#3563AE", gradient: "from-[#3563AE]/20 to-[#3563AE]/5" },
        { label: "생성 콘텐츠", value: stats.contents, icon: FileText, color: "#8B5CF6", gradient: "from-[#8B5CF6]/20 to-[#8B5CF6]/5" },
        { label: "발행 완료", value: stats.published, icon: Rocket, color: "#10B981", gradient: "from-[#10B981]/20 to-[#10B981]/5" },
        { label: "이번 주 조회", value: stats.views, icon: Eye, color: "#F59E0B", gradient: "from-[#F59E0B]/20 to-[#F59E0B]/5" },
    ];

    const timeGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "좋은 아침이에요";
        if (h < 18) return "좋은 오후에요";
        return "좋은 저녁이에요";
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* ── Hero Greeting ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[13px] text-white/25 font-medium">{timeGreeting()}</p>
                        <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold text-white/90 tracking-tight">
                            {userName} <span className="text-white/25 font-light">변호사님</span>
                        </h1>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3563AE]/10 border border-[#3563AE]/20">
                        <Sparkles size={12} className="text-[#3563AE]" />
                        <span className="text-[11px] text-[#6B94E0] font-medium">AI 마케팅 가동 중</span>
                    </div>
                </div>
            </motion.div>

            {/* ── Stats Grid ── */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickCards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                    >
                        <div className={`group relative p-5 rounded-2xl bg-gradient-to-br ${card.gradient} border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 overflow-hidden`}>
                            {/* Ambient glow */}
                            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: card.color }} />

                            <card.icon size={18} style={{ color: card.color }} className="opacity-70" />
                            <p className="mt-4 text-[28px] font-bold text-white/90 tabular-nums tracking-tight">{card.value}</p>
                            <p className="text-[11px] text-white/30 font-medium mt-1">{card.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Quick Actions ── */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Upload CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <Link
                        href="/upload"
                        className="group flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-[#3563AE] to-[#1E3A6E] border border-[#3563AE]/30 hover:border-[#3563AE]/60 hover:shadow-lg hover:shadow-[#3563AE]/10 transition-all duration-300"
                    >
                        <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/15 transition-colors">
                            <Upload size={20} className="text-white/80" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-semibold text-white/90">자료 업로드</p>
                            <p className="text-[12px] text-white/40 mt-0.5">판결문, 녹취, 메모를 업로드하세요</p>
                        </div>
                        <ArrowRight size={16} className="text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                </motion.div>

                {/* AI Generate CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Link
                        href="/contents"
                        className="group flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300"
                    >
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Wand2 size={20} className="text-purple-400/80" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-semibold text-white/80">AI 콘텐츠 관리</p>
                            <p className="text-[12px] text-white/30 mt-0.5">
                                {pendingUploads > 0
                                    ? `${pendingUploads}건 생성 대기 중`
                                    : "4채널 자동 생성된 콘텐츠 관리"}
                            </p>
                        </div>
                        <ArrowRight size={16} className="text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                </motion.div>
            </div>

            {/* ── Pipeline Status ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-6 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
            >
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-[#3563AE]" />
                    <span className="text-[12px] font-semibold text-white/40">콘텐츠 파이프라인</span>
                </div>
                <div className="flex items-center gap-0">
                    {[
                        { label: "업로드", value: stats.uploads, color: "#3563AE" },
                        { label: "생성", value: stats.contents, color: "#8B5CF6" },
                        { label: "발행", value: stats.published, color: "#10B981" },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center flex-1">
                            <div className="flex-1 text-center">
                                <p className="text-[22px] font-bold tabular-nums" style={{ color: step.color + "CC" }}>{step.value}</p>
                                <p className="text-[10px] text-white/25 mt-0.5 font-medium">{step.label}</p>
                            </div>
                            {i < 2 && (
                                <div className="flex items-center px-2">
                                    <div className="w-8 h-px bg-white/[0.08]" />
                                    <Zap size={10} className="text-white/10 mx-1" />
                                    <div className="w-8 h-px bg-white/[0.08]" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Recent Contents ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[13px] font-semibold text-white/40">최근 콘텐츠</h2>
                    <Link href="/contents" className="text-[11px] text-[#3563AE] font-medium hover:text-[#6B94E0] transition-colors flex items-center gap-1">
                        전체 보기 <ArrowUpRight size={11} />
                    </Link>
                </div>

                {recentContents.length === 0 ? (
                    <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] border-dashed text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
                            <FileText size={20} className="text-white/15" />
                        </div>
                        <p className="text-[13px] text-white/30 font-medium">아직 생성된 콘텐츠가 없습니다</p>
                        <p className="text-[11px] text-white/15 mt-1">자료를 업로드하면 AI가 4채널 콘텐츠를 자동 생성합니다</p>
                        <Link
                            href="/upload"
                            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 text-[12px] font-semibold text-white bg-[#3563AE] rounded-lg hover:bg-[#2A4F8A] transition-colors"
                        >
                            <Upload size={13} /> 업로드 시작
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
                        {recentContents.map((c, i) => {
                            const ch = CHANNEL_META[c.channel] || CHANNEL_META.blog;
                            return (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.55 + i * 0.03 }}
                                >
                                    <Link
                                        href={`/contents/${c.id}`}
                                        className="group flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${ch.color}15` }}
                                        >
                                            <ch.icon size={14} style={{ color: ch.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-white/70 truncate group-hover:text-white/90 transition-colors">{c.title}</p>
                                            <p className="text-[10px] font-medium mt-0.5" style={{ color: ch.color + "80" }}>{ch.label}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${c.status === "published" ? "text-blue-400/80 bg-blue-500/10" :
                                                c.status === "approved" ? "text-emerald-400/80 bg-emerald-500/10" :
                                                    c.status === "review" ? "text-amber-400/80 bg-amber-500/10" :
                                                        "text-white/30 bg-white/[0.04]"
                                            }`}>
                                            {c.status === "published" ? "발행됨" : c.status === "approved" ? "승인됨" : c.status === "review" ? "검토 중" : "초안"}
                                        </span>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
