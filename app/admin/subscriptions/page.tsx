"use client";

import { useState, useEffect } from "react";
import { CreditCard, TrendingUp, DollarSign, Users } from "lucide-react";

interface Stats {
    activeSubscriptions: number;
    monthlyRevenue: number;
    planDistribution: Record<string, number>;
}

const PLAN_INFO: Record<string, { name: string; price: number; color: string }> = {
    "30": { name: "월 30건", price: 49000, color: "#3563AE" },
    "50": { name: "월 50건", price: 69000, color: "#8B5CF6" },
    "100": { name: "월 100건", price: 119000, color: "#06B6D4" },
    unlimited: { name: "무제한", price: 179000, color: "#10B981" },
};

export default function AdminSubscriptionsPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((res) => res.json())
            .then((data) => setStats(data.stats))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
            </div>
        );
    }

    const totalSubs = stats?.activeSubscriptions || 0;
    const revenue = stats?.monthlyRevenue || 0;
    const annualProjected = revenue * 12;
    const distribution = stats?.planDistribution || {};

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <CreditCard size={20} className="text-[#F59E0B]" />
                    구독 & 매출
                </h1>
                <p className="text-sm text-[#6B7280] mt-1">결제 및 구독 현황</p>
            </div>

            {/* Revenue cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign size={16} className="text-[#F59E0B]" />
                        <span className="text-xs text-[#6B7280]">월간 매출 (MRR)</span>
                    </div>
                    <p className="text-2xl font-bold text-white">₩{revenue.toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-[#10B981]" />
                        <span className="text-xs text-[#6B7280]">연간 매출 예상 (ARR)</span>
                    </div>
                    <p className="text-2xl font-bold text-white">₩{annualProjected.toLocaleString()}</p>
                </div>
                <div className="p-5 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={16} className="text-[#3563AE]" />
                        <span className="text-xs text-[#6B7280]">유료 구독자 수</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{totalSubs}명</p>
                </div>
            </div>

            {/* Plan breakdown */}
            <div className="p-6 rounded-xl bg-[#111827] border border-[#1F2937]">
                <h2 className="text-sm font-semibold text-white mb-6">요금제별 현황</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(PLAN_INFO).map(([key, plan]) => {
                        const count = distribution[key] || 0;
                        const planRevenue = count * plan.price;
                        return (
                            <div key={key} className="p-4 rounded-xl bg-[#0B0F1A] border border-[#1F2937]">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-white">{plan.name}</span>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: plan.color }} />
                                </div>
                                <p className="text-3xl font-bold text-white mb-1">{count}</p>
                                <p className="text-[11px] text-[#6B7280]">구독자</p>
                                <div className="mt-3 pt-3 border-t border-[#1F2937]">
                                    <p className="text-xs text-[#9CA3B0]">
                                        ₩{plan.price.toLocaleString()}/월 × {count}명
                                    </p>
                                    <p className="text-sm font-semibold mt-0.5" style={{ color: plan.color }}>
                                        ₩{planRevenue.toLocaleString()}/월
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
