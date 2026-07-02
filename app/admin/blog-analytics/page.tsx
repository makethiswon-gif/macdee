"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Eye,
    Clock,
    TrendingUp,
    BarChart3,
    Loader2,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Sparkles,
} from "lucide-react";

const PERIOD_OPTIONS = [
    { value: 7, label: "7일" },
    { value: 14, label: "14일" },
    { value: 30, label: "30일" },
    { value: 90, label: "90일" },
];

interface TopPost {
    postId: string;
    title: string;
    views: number;
    visitors: number;
    avgDuration: number;
}

interface LawyerStat {
    id: string;
    name: string;
    slug: string;
    office_name: string;
    brand_color: string;
    profile_image_url: string;
    visitors: number;
    pageviews: number;
    avgDuration: number;
    aiReferrals: number;
    aiBySource: Record<string, number>;
    daily: { date: string; views: number; visitors: number }[];
    topPosts: TopPost[];
}

interface Totals {
    visitors: number;
    pageviews: number;
    avgDuration: number;
    lawyersWithTraffic: number;
    aiReferrals: number;
}

interface AnalyticsData {
    lawyers: LawyerStat[];
    totals: Totals;
    aiReferrals: { total: number; bySource: Record<string, number> };
    globalDaily: { date: string; views: number; visitors: number }[];
    period: number;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}분 ${secs > 0 ? `${secs}초` : ""}`.trim();
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins > 0 ? `${mins}분` : ""}`.trim();
}

function MiniBarChart({ data, colorHex }: { data: { views: number }[]; colorHex: string }) {
    if (data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.views), 1);
    return (
        <div className="flex items-end gap-[2px] h-10">
            {data.map((d, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                    style={{
                        height: `${Math.max((d.views / maxVal) * 100, 5)}%`,
                        background: `${colorHex}30`,
                    }}
                    title={`${d.views}뷰`}
                />
            ))}
        </div>
    );
}

export default function AdminBlogAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);
    const [expandedLawyer, setExpandedLawyer] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/blog-analytics?days=${period}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error("Failed to fetch blog analytics:", err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#3563AE]" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-[#6B7280]">데이터를 불러올 수 없습니다.</p>
            </div>
        );
    }

    const { lawyers, totals, globalDaily } = data;
    const globalMaxViews = Math.max(...globalDaily.map(d => d.views), 1);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 size={20} className="text-[#3563AE]" />
                        블로그 분석
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-1">
                        변호사별 블로그 방문자수 · 체류시간
                    </p>
                </div>
                <div className="flex gap-1 p-0.5 rounded-lg bg-[#1A1F2E]">
                    {PERIOD_OPTIONS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
                                period === p.value
                                    ? "bg-[#3563AE] text-white"
                                    : "text-[#6B7280] hover:text-white"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                {[
                    {
                        label: "총 방문자",
                        value: totals.visitors.toLocaleString(),
                        sub: "유니크 세션",
                        icon: Users,
                        color: "#3563AE",
                        gradient: "from-[#3563AE]/20 to-[#3563AE]/5",
                    },
                    {
                        label: "총 페이지뷰",
                        value: totals.pageviews.toLocaleString(),
                        sub: "전체 조회수",
                        icon: Eye,
                        color: "#8B5CF6",
                        gradient: "from-[#8B5CF6]/20 to-[#8B5CF6]/5",
                    },
                    {
                        label: "평균 체류시간",
                        value: formatDuration(totals.avgDuration),
                        sub: "방문당 평균",
                        icon: Clock,
                        color: "#14B8A6",
                        gradient: "from-[#14B8A6]/20 to-[#14B8A6]/5",
                    },
                    {
                        label: "활성 블로그",
                        value: `${totals.lawyersWithTraffic}`,
                        sub: `전체 ${lawyers.length}명 중`,
                        icon: TrendingUp,
                        color: "#F59E0B",
                        gradient: "from-[#F59E0B]/20 to-[#F59E0B]/5",
                    },
                    {
                        label: "AI 유입",
                        value: (totals.aiReferrals ?? 0).toLocaleString(),
                        sub: "ChatGPT·Perplexity 등",
                        icon: Sparkles,
                        color: "#EC4899",
                        gradient: "from-[#EC4899]/20 to-[#EC4899]/5",
                    },
                ].map((kpi) => (
                    <div
                        key={kpi.label}
                        className={`relative overflow-hidden p-4 rounded-xl bg-gradient-to-br ${kpi.gradient} border border-white/[0.06]`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <kpi.icon size={16} style={{ color: kpi.color }} />
                        </div>
                        <p className="text-lg font-bold text-white tabular-nums">
                            {kpi.value}
                        </p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">{kpi.label}</p>
                        <p className="text-[10px] text-[#4B5563] mt-0.5">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* AI 인용 유입 상세 */}
            <div className="mb-8 p-4 rounded-xl bg-gradient-to-br from-[#EC4899]/10 to-transparent border border-[#EC4899]/20">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={15} className="text-[#EC4899]" />
                    <h3 className="text-sm font-semibold text-white">AI 인용 유입</h3>
                    <span className="text-[10px] text-[#6B7280]">AI가 블로그를 인용 → 사용자가 클릭해 방문한 횟수</span>
                </div>
                {(data.aiReferrals?.total ?? 0) === 0 ? (
                    <p className="text-[12px] text-[#6B7280]">아직 AI 유입이 없습니다. AI 검색(ChatGPT·Perplexity·Gemini·Claude) 노출이 늘면 여기 집계됩니다.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(data.aiReferrals.bySource)
                            .sort((a, b) => b[1] - a[1])
                            .map(([src, cnt]) => (
                                <div key={src} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                    <span className="text-[12px] text-white font-medium">{src}</span>
                                    <span className="text-[12px] text-[#EC4899] font-bold tabular-nums">{cnt}</span>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Global Daily Trend */}
            {globalDaily.length > 0 && (
                <div className="mb-8 p-5 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={14} className="text-[#3563AE]" />
                        <h2 className="text-sm font-semibold text-white">일별 방문 추이</h2>
                        <span className="text-[10px] text-[#4B5563] ml-auto">
                            최근 {period}일
                        </span>
                    </div>
                    <div className="flex items-end gap-[3px] h-24">
                        {globalDaily.map((d, i) => (
                            <div
                                key={i}
                                className="flex-1 group relative"
                                title={`${d.date}: ${d.views}뷰 / ${d.visitors}명`}
                            >
                                <div
                                    className="w-full bg-[#3563AE]/20 hover:bg-[#3563AE]/40 transition-colors rounded-t-sm cursor-default"
                                    style={{
                                        height: `${Math.max((d.views / globalMaxViews) * 100, 3)}%`,
                                    }}
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
                                    <div className="bg-[#1A1F2E] border border-[#2A3040] rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                                        <span className="text-[#9CA3B0]">{d.date.slice(5)}</span>
                                        <br />
                                        {d.views}뷰 · {d.visitors}명
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-[#4B5563]">
                            {globalDaily[0]?.date}
                        </span>
                        <span className="text-[10px] text-[#4B5563]">
                            {globalDaily[globalDaily.length - 1]?.date}
                        </span>
                    </div>
                </div>
            )}

            {/* Lawyer Cards */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Users size={14} className="text-[#3563AE]" />
                    변호사별 블로그 통계
                </h2>

                {lawyers.length === 0 ? (
                    <div className="p-10 rounded-xl bg-[#111827] border border-[#1F2937] text-center">
                        <p className="text-[#4B5563]">등록된 변호사가 없습니다.</p>
                    </div>
                ) : (
                    lawyers.map((lawyer) => {
                        const isExpanded = expandedLawyer === lawyer.id;
                        const hasData = lawyer.pageviews > 0;
                        return (
                            <div
                                key={lawyer.id}
                                className={`rounded-xl border transition-colors ${
                                    hasData
                                        ? "bg-[#111827] border-[#1F2937] hover:border-[#2A3040]"
                                        : "bg-[#0D1117] border-[#1A1F2E]"
                                }`}
                            >
                                {/* Main row */}
                                <button
                                    onClick={() =>
                                        setExpandedLawyer(isExpanded ? null : lawyer.id)
                                    }
                                    className="w-full px-5 py-4 flex items-center gap-4 text-left"
                                    disabled={!hasData}
                                >
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        {lawyer.profile_image_url ? (
                                            <div
                                                className="w-10 h-10 rounded-xl overflow-hidden"
                                                style={{
                                                    background: `linear-gradient(135deg, ${lawyer.brand_color}20, transparent)`,
                                                }}
                                            >
                                                <img
                                                    src={lawyer.profile_image_url}
                                                    alt={lawyer.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white/80"
                                                style={{
                                                    background: `linear-gradient(135deg, ${lawyer.brand_color}40, ${lawyer.brand_color}15)`,
                                                }}
                                            >
                                                {lawyer.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name & Office */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-white truncate">
                                                {lawyer.name}
                                                <span className="text-[#4B5563] font-normal ml-1">
                                                    변호사
                                                </span>
                                            </p>
                                            <a
                                                href={`/blog/${lawyer.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[#4B5563] hover:text-[#3563AE] transition-colors"
                                            >
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                        {lawyer.office_name && (
                                            <p className="text-[11px] text-[#4B5563] truncate">
                                                {lawyer.office_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden sm:flex items-center gap-6">
                                        <div className="text-right">
                                            <p className={`text-sm font-bold tabular-nums ${hasData ? "text-white" : "text-[#374151]"}`}>
                                                {lawyer.visitors.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-[#4B5563]">방문자</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold tabular-nums ${hasData ? "text-white" : "text-[#374151]"}`}>
                                                {lawyer.pageviews.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-[#4B5563]">페이지뷰</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold tabular-nums ${(lawyer.aiReferrals ?? 0) > 0 ? "text-[#EC4899]" : "text-[#374151]"}`}>
                                                {(lawyer.aiReferrals ?? 0) > 0 ? lawyer.aiReferrals.toLocaleString() : "—"}
                                            </p>
                                            <p className="text-[10px] text-[#4B5563]">AI 유입</p>
                                        </div>
                                        <div className="text-right min-w-[70px]">
                                            <p className={`text-sm font-bold tabular-nums ${hasData ? "text-[#14B8A6]" : "text-[#374151]"}`}>
                                                {hasData ? formatDuration(lawyer.avgDuration) : "—"}
                                            </p>
                                            <p className="text-[10px] text-[#4B5563]">평균 체류</p>
                                        </div>
                                    </div>

                                    {/* Mini chart */}
                                    <div className="hidden lg:block w-24 flex-shrink-0">
                                        <MiniBarChart data={lawyer.daily} colorHex={lawyer.brand_color} />
                                    </div>

                                    {/* Expand arrow */}
                                    {hasData && (
                                        <div className="flex-shrink-0 text-[#4B5563]">
                                            {isExpanded ? (
                                                <ChevronUp size={16} />
                                            ) : (
                                                <ChevronDown size={16} />
                                            )}
                                        </div>
                                    )}
                                </button>

                                {/* Mobile stats row */}
                                <div className="sm:hidden px-5 pb-3 flex items-center gap-6">
                                    <div>
                                        <span className={`text-sm font-bold tabular-nums ${hasData ? "text-white" : "text-[#374151]"}`}>
                                            {lawyer.visitors}
                                        </span>
                                        <span className="text-[10px] text-[#4B5563] ml-1">방문자</span>
                                    </div>
                                    <div>
                                        <span className={`text-sm font-bold tabular-nums ${hasData ? "text-white" : "text-[#374151]"}`}>
                                            {lawyer.pageviews}
                                        </span>
                                        <span className="text-[10px] text-[#4B5563] ml-1">뷰</span>
                                    </div>
                                    <div>
                                        <span className={`text-sm font-bold tabular-nums ${hasData ? "text-[#14B8A6]" : "text-[#374151]"}`}>
                                            {hasData ? formatDuration(lawyer.avgDuration) : "—"}
                                        </span>
                                        <span className="text-[10px] text-[#4B5563] ml-1">체류</span>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && hasData && (
                                    <div className="px-5 pb-5 border-t border-[#1F2937] pt-4">
                                        {/* Top posts */}
                                        {lawyer.topPosts.length > 0 && (
                                            <div>
                                                <h3 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mb-3">
                                                    인기 포스트 TOP {lawyer.topPosts.length}
                                                </h3>
                                                <div className="space-y-2">
                                                    {lawyer.topPosts.map((post, i) => (
                                                        <div
                                                            key={post.postId}
                                                            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#0B0F1A]/50"
                                                        >
                                                            <span className="text-[11px] text-[#4B5563] font-bold tabular-nums w-5">
                                                                {i + 1}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[13px] text-[#D1D5DB] truncate">
                                                                    {post.title}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-[11px] flex-shrink-0">
                                                                <span className="text-[#9CA3B0] tabular-nums">
                                                                    <Eye size={10} className="inline mr-1 opacity-50" />
                                                                    {post.views}
                                                                </span>
                                                                <span className="text-[#9CA3B0] tabular-nums">
                                                                    <Users size={10} className="inline mr-1 opacity-50" />
                                                                    {post.visitors}
                                                                </span>
                                                                <span className="text-[#14B8A6] tabular-nums">
                                                                    <Clock size={10} className="inline mr-1 opacity-50" />
                                                                    {formatDuration(post.avgDuration)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Daily chart for this lawyer */}
                                        {lawyer.daily.length > 0 && (
                                            <div className="mt-5">
                                                <h3 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mb-3">
                                                    일별 추이
                                                </h3>
                                                <div className="flex items-end gap-[2px] h-16">
                                                    {lawyer.daily.map((d, i) => {
                                                        const max = Math.max(
                                                            ...lawyer.daily.map((x) => x.views),
                                                            1
                                                        );
                                                        return (
                                                            <div
                                                                key={i}
                                                                className="flex-1 rounded-t-sm"
                                                                style={{
                                                                    height: `${Math.max((d.views / max) * 100, 5)}%`,
                                                                    background: `${lawyer.brand_color}30`,
                                                                }}
                                                                title={`${d.date}: ${d.views}뷰`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex justify-between mt-1">
                                                    <span className="text-[9px] text-[#4B5563]">
                                                        {lawyer.daily[0]?.date}
                                                    </span>
                                                    <span className="text-[9px] text-[#4B5563]">
                                                        {lawyer.daily[lawyer.daily.length - 1]?.date}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Empty state */}
            {totals.pageviews === 0 && (
                <div className="mt-8 p-8 rounded-xl bg-[#3563AE]/[0.03] border border-[#3563AE]/10 text-center">
                    <p className="text-[#6B7280] text-sm">
                        📊 아직 블로그 방문 데이터가 없습니다.
                    </p>
                    <p className="text-[#4B5563] text-xs mt-2">
                        블로그 방문자 추적이 활성화되었습니다. 방문이 발생하면 여기에 데이터가 표시됩니다.
                    </p>
                </div>
            )}
        </div>
    );
}
