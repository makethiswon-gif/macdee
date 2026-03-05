"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
    Upload,
    FileText,
    Send,
    Eye,
    ArrowRight,
    Clock,
    Sparkles,
    Rocket,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface UploadItem {
    id: string;
    type: string;
    title: string | null;
    status: string;
    created_at: string;
}

interface DashboardHomeProps {
    lawyerName: string;
    uploads: UploadItem[];
    stats: {
        uploads: number;
        contents: number;
        publications: number;
    };
}

const TYPE_LABELS: Record<string, string> = {
    pdf: "판결문 PDF",
    audio: "상담 녹취",
    memo: "메모",
    url: "뉴스 링크",
    faq: "FAQ",
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
    processing: { label: "처리 중", color: "text-amber-400/80", bg: "bg-amber-500/10" },
    ready: { label: "완료", color: "text-emerald-400/80", bg: "bg-emerald-500/10" },
    failed: { label: "실패", color: "text-red-400/80", bg: "bg-red-500/10" },
};

export default function DashboardHome({ lawyerName, uploads, stats }: DashboardHomeProps) {
    const STATS = [
        { label: "총 업로드", value: stats.uploads, icon: Upload, color: "#3563AE", gradient: "from-[#3563AE]/20 to-[#3563AE]/5" },
        { label: "생성된 콘텐츠", value: stats.contents, icon: FileText, color: "#8B5CF6", gradient: "from-[#8B5CF6]/20 to-[#8B5CF6]/5" },
        { label: "발행 완료", value: stats.publications, icon: Rocket, color: "#10B981", gradient: "from-[#10B981]/20 to-[#10B981]/5" },
        { label: "이번 주 조회수", value: 0, icon: Eye, color: "#F59E0B", gradient: "from-[#F59E0B]/20 to-[#F59E0B]/5" },
    ];

    const timeGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "좋은 아침이에요";
        if (h < 18) return "좋은 오후에요";
        return "좋은 저녁이에요";
    };

    return (
        <div>
            {/* Welcome */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <p className="text-[13px] text-white/25 font-medium">{timeGreeting()}</p>
                <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold text-white/90 tracking-tight">
                    {lawyerName} <span className="text-white/25 font-light">변호사님</span>
                </h1>
            </motion.div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {STATS.map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                    >
                        <div className={`group relative p-5 rounded-2xl bg-gradient-to-br ${s.gradient} border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 overflow-hidden`}>
                            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: s.color }} />
                            <s.icon size={18} style={{ color: s.color }} className="opacity-70" />
                            <p className="mt-4 text-[28px] font-bold text-white/90 tabular-nums tracking-tight">{s.value}</p>
                            <p className="text-[11px] text-white/30 font-medium mt-1">{s.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick start */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-6"
            >
                <Link
                    href="/upload"
                    className="group flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-[#3563AE] to-[#1E3A6E] border border-[#3563AE]/30 text-white hover:shadow-lg hover:shadow-[#3563AE]/10 hover:border-[#3563AE]/50 transition-all duration-300"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles size={22} className="text-white/80" />
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-white/90">새 콘텐츠 만들기</p>
                            <p className="text-[12px] text-white/40 mt-0.5">판결문, 녹취, 메모를 업로드하면 AI가 자동 생성합니다</p>
                        </div>
                    </div>
                    <ArrowRight size={18} className="text-white/20 group-hover:translate-x-1 group-hover:text-white/50 transition-all" />
                </Link>
            </motion.div>

            {/* Recent uploads */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-8"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[13px] font-semibold text-white/40">최근 업로드</h2>
                    {uploads.length > 0 && (
                        <Link href="/contents" className="text-[11px] font-medium text-[#3563AE] hover:text-[#6B94E0] transition-colors">모두 보기</Link>
                    )}
                </div>

                {uploads.length === 0 ? (
                    <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/[0.06] border-dashed text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
                            <Upload size={20} className="text-white/15" />
                        </div>
                        <p className="text-[13px] font-medium text-white/30">아직 업로드한 파일이 없습니다</p>
                        <p className="text-[11px] text-white/15 mt-1">판결문, 녹취, 메모를 업로드해보세요</p>
                        <Link
                            href="/upload"
                            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 text-[12px] font-semibold text-white bg-[#3563AE] rounded-lg hover:bg-[#2A4F8A] transition-colors"
                        >
                            <Upload size={13} /> 업로드 시작
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
                        {uploads.map((u) => {
                            const st = STATUS_STYLES[u.status] || STATUS_STYLES.processing;
                            return (
                                <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                                    <div className="w-9 h-9 rounded-lg bg-[#3563AE]/10 flex items-center justify-center flex-shrink-0">
                                        <FileText size={16} className="text-[#3563AE]/70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-white/70 truncate">{u.title || "제목 없음"}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-white/25">{TYPE_LABELS[u.type] || u.type}</span>
                                            <span className="text-white/10">·</span>
                                            <span className="text-[10px] text-white/25 flex items-center gap-1">
                                                <Clock size={9} />
                                                {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: ko })}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${st.color} ${st.bg}`}>
                                        {st.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
