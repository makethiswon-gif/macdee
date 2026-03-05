"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Eye,
    MousePointerClick,
    MessageSquare,
    TrendingUp,
    Upload,
    FileText,
    Rocket,
    BookOpen,
    Instagram,
    Globe,
    Search,
    Loader2,
    BarChart3,
} from "lucide-react";

const CHANNEL_META: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
    blog: { label: "네이버 블로그", icon: BookOpen, color: "#03C75A" },
    instagram: { label: "인스타그램", icon: Instagram, color: "#E1306C" },
    google: { label: "구글 SEO", icon: Globe, color: "#4285F4" },
    macdee: { label: "AI 검색", icon: Search, color: "#3563AE" },
};

const PERIOD_OPTIONS = [
    { value: 7, label: "7일" },
    { value: 14, label: "14일" },
    { value: 30, label: "30일" },
    { value: 90, label: "90일" },
];

interface AnalyticsData {
    overview: {
        totalUploads: number;
        totalContents: number;
        totalPublished: number;
        totalViews: number;
        totalClicks: number;
        totalInquiries: number;
        ctr: string;
    };
    channelStats: Record<string, {
        contents: number;
        published: number;
        views: number;
        clicks: number;
        inquiries: number;
    }>;
    dailyData: Record<string, { views: number; clicks: number; inquiries: number }>;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/analytics?days=${period}`);
        const json = await res.json();
        setData(json);
        setLoading(false);
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading || !data) {
        return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#3563AE]" /></div>;
    }

    const { overview, channelStats, dailyData } = data;
    const dailyEntries = Object.entries(dailyData).sort(([a], [b]) => a.localeCompare(b));
    const maxViews = Math.max(...dailyEntries.map(([, d]) => d.views), 1);

    const overviewCards = [
        { label: "총 조회수", value: overview.totalViews.toLocaleString(), icon: Eye, color: "#3563AE" },
        { label: "총 클릭수", value: overview.totalClicks.toLocaleString(), icon: MousePointerClick, color: "#10B981" },
        { label: "상담 문의", value: overview.totalInquiries.toLocaleString(), icon: MessageSquare, color: "#F59E0B" },
        { label: "CTR", value: `${overview.ctr}%`, icon: TrendingUp, color: "#8B5CF6" },
        { label: "업로드", value: overview.totalUploads.toString(), icon: Upload, color: "#6B7280" },
        { label: "콘텐츠", value: overview.totalContents.toString(), icon: FileText, color: "#EC4899" },
        { label: "발행됨", value: overview.totalPublished.toString(), icon: Rocket, color: "#14B8A6" },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F2937]">애널리틱스</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">콘텐츠 성과를 한눈에 확인합니다.</p>
                </div>
                <div className="flex gap-1 p-0.5 rounded-lg bg-[#E8EBF0]/50">
                    {PERIOD_OPTIONS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${period === p.value ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview cards */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {overviewCards.map((card, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="p-4 rounded-xl bg-white border border-[#E8EBF0]"
                    >
                        <card.icon size={16} style={{ color: card.color }} />
                        <p className="mt-2 text-xl font-bold text-[#1F2937] tabular-nums">{card.value}</p>
                        <p className="text-[11px] text-[#9CA3B0] mt-0.5">{card.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Simple bar chart */}
            {dailyEntries.length > 0 && (
                <div className="mt-8 p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 size={16} className="text-[#3563AE]" />
                        <h2 className="text-sm font-semibold text-[#1F2937]">일별 조회수</h2>
                    </div>
                    <div className="flex items-end gap-[3px] h-32">
                        {dailyEntries.map(([date, d], i) => (
                            <div
                                key={i}
                                className="flex-1 group relative"
                                title={`${date}: ${d.views}회`}
                            >
                                <div
                                    className="w-full bg-[#3563AE]/15 hover:bg-[#3563AE]/30 transition-colors rounded-t-sm"
                                    style={{ height: `${Math.max((d.views / maxViews) * 100, 4)}%` }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-[#C0C0C0]">{dailyEntries[0]?.[0]}</span>
                        <span className="text-[10px] text-[#C0C0C0]">{dailyEntries[dailyEntries.length - 1]?.[0]}</span>
                    </div>
                </div>
            )}

            {/* Channel breakdown */}
            <div className="mt-8">
                <h2 className="text-sm font-semibold text-[#374151] mb-4">📊 채널별 성과</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(CHANNEL_META).map(([key, ch]) => {
                        const stats = channelStats[key] || { contents: 0, published: 0, views: 0, clicks: 0, inquiries: 0 };
                        return (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-2xl bg-white border border-[#E8EBF0]"
                            >
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ background: `${ch.color}12` }}
                                    >
                                        <ch.icon size={15} style={{ color: ch.color }} />
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: ch.color }}>{ch.label}</span>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { label: "콘텐츠", value: stats.contents },
                                        { label: "발행", value: stats.published },
                                        { label: "조회", value: stats.views },
                                        { label: "문의", value: stats.inquiries },
                                    ].map((s, i) => (
                                        <div key={i}>
                                            <p className="text-lg font-bold text-[#1F2937] tabular-nums">{s.value}</p>
                                            <p className="text-[10px] text-[#9CA3B0]">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Empty state hint */}
            {overview.totalViews === 0 && overview.totalPublished === 0 && (
                <div className="mt-8 p-8 rounded-2xl bg-[#3563AE]/[0.03] border border-[#3563AE]/10 text-center">
                    <p className="text-sm text-[#374151]">
                        🚀 콘텐츠를 발행하면 여기에 실시간 성과가 표시됩니다.
                    </p>
                </div>
            )}
        </div>
    );
}
