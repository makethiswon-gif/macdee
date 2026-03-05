"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Upload,
    FileText,
    TrendingUp,
    CreditCard,
    Send,
    Clock,
    ArrowUpRight,
} from "lucide-react";

interface Stats {
    totalLawyers: number;
    totalUploads: number;
    totalContents: number;
    publishedContents: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
    planDistribution: Record<string, number>;
}

interface RecentLawyer {
    id: string;
    name: string;
    email: string;
    office_name: string;
    created_at: string;
}

interface RecentUpload {
    id: string;
    type: string;
    title: string;
    status: string;
    created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
    pdf: "📄 PDF",
    audio: "🎙️ 녹취",
    memo: "📝 메모",
    url: "🔗 URL",
    faq: "❓ FAQ",
};

const STATUS_COLORS: Record<string, string> = {
    processing: "text-amber-400 bg-amber-400/10",
    ready: "text-emerald-400 bg-emerald-400/10",
    failed: "text-red-400 bg-red-400/10",
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentLawyers, setRecentLawyers] = useState<RecentLawyer[]>([]);
    const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((res) => res.json())
            .then((data) => {
                setStats(data.stats);
                setRecentLawyers(data.recentLawyers || []);
                setRecentUploads(data.recentUploads || []);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
            </div>
        );
    }

    const kpiCards = [
        { label: "전체 변호사", value: stats?.totalLawyers || 0, icon: Users, color: "#3563AE" },
        { label: "총 업로드", value: stats?.totalUploads || 0, icon: Upload, color: "#8B5CF6" },
        { label: "생성 콘텐츠", value: stats?.totalContents || 0, icon: FileText, color: "#06B6D4" },
        { label: "발행 완료", value: stats?.publishedContents || 0, icon: Send, color: "#10B981" },
        { label: "유료 구독", value: stats?.activeSubscriptions || 0, icon: CreditCard, color: "#F59E0B" },
        { label: "월간 매출", value: `₩${(stats?.monthlyRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: "#EF4444" },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-xl font-bold text-white">대시보드</h1>
                <p className="text-sm text-[#6B7280] mt-1">macdee 플랫폼 운영 현황</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
                {kpiCards.map((kpi) => (
                    <div
                        key={kpi.label}
                        className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <kpi.icon size={16} style={{ color: kpi.color }} />
                            <ArrowUpRight size={12} className="text-[#4B5563]" />
                        </div>
                        <p className="text-lg font-bold text-white tabular-nums">
                            {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
                        </p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">{kpi.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Lawyers */}
                <div className="p-5 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Users size={14} className="text-[#3563AE]" />
                            최근 가입 변호사
                        </h2>
                    </div>
                    <div className="space-y-2.5">
                        {recentLawyers.length === 0 ? (
                            <p className="text-sm text-[#4B5563] text-center py-6">아직 가입한 변호사가 없습니다</p>
                        ) : (
                            recentLawyers.slice(0, 5).map((lawyer) => (
                                <div key={lawyer.id} className="flex items-center justify-between py-2 border-b border-[#1F2937] last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-white">{lawyer.name}</p>
                                        <p className="text-[11px] text-[#6B7280]">
                                            {lawyer.office_name || lawyer.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                                        <Clock size={11} />
                                        {new Date(lawyer.created_at).toLocaleDateString("ko-KR")}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Uploads */}
                <div className="p-5 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Upload size={14} className="text-[#8B5CF6]" />
                            최근 업로드
                        </h2>
                    </div>
                    <div className="space-y-2.5">
                        {recentUploads.length === 0 ? (
                            <p className="text-sm text-[#4B5563] text-center py-6">아직 업로드가 없습니다</p>
                        ) : (
                            recentUploads.slice(0, 5).map((upload) => (
                                <div key={upload.id} className="flex items-center justify-between py-2 border-b border-[#1F2937] last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">{TYPE_LABELS[upload.type] || upload.type}</span>
                                        <p className="text-sm text-white truncate max-w-[180px]">
                                            {upload.title || "제목 없음"}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[upload.status] || "text-gray-400 bg-gray-400/10"}`}>
                                        {upload.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Plan Distribution */}
            {stats?.planDistribution && Object.keys(stats.planDistribution).length > 0 && (
                <div className="mt-6 p-5 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <CreditCard size={14} className="text-[#F59E0B]" />
                        요금제 분포
                    </h2>
                    <div className="flex gap-4">
                        {Object.entries(stats.planDistribution).map(([plan, count]) => (
                            <div key={plan} className="flex-1 p-3 rounded-lg bg-[#0B0F1A] text-center">
                                <p className="text-lg font-bold text-white">{count}</p>
                                <p className="text-[11px] text-[#6B7280]">{plan === "30" ? "월30건" : plan === "50" ? "월50건" : plan === "100" ? "월100건" : plan === "unlimited" ? "무제한" : plan}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
