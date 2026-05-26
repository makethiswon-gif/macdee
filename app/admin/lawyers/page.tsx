"use client";

import { useState, useEffect } from "react";
import { Users, Search, Mail, MapPin, Briefcase, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Lawyer {
    id: string;
    name: string;
    email: string;
    phone: string;
    specialty: string[];
    region: string;
    office_name: string;
    experience_years: number;
    plan: string;
    created_at: string;
    uploads_count: number;
    contents_count: number;
    subscription: { plan: string; status: string } | null;
}

const PLAN_OPTIONS = [
    { value: "free", label: "무료" },
    { value: "30", label: "30건" },
    { value: "50", label: "50건" },
    { value: "100", label: "100건" },
    { value: "pro", label: "프로" },
    { value: "unlimited", label: "무제한" },
];

const PLAN_LABELS: Record<string, string> = Object.fromEntries(
    PLAN_OPTIONS.map((p) => [p.value, p.label])
);

export default function AdminLawyersPage() {
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/lawyers?page=${page}`)
            .then((res) => res.json())
            .then((data) => {
                setLawyers(data.lawyers || []);
                setTotal(data.total || 0);
            })
            .finally(() => setLoading(false));
    }, [page]);

    const handlePlanChange = async (lawyerId: string, newPlan: string) => {
        setUpdatingId(lawyerId);
        try {
            const res = await fetch("/api/admin/lawyers", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lawyer_id: lawyerId, plan: newPlan }),
            });
            if (res.ok) {
                const result = await res.json();
                setLawyers((prev) =>
                    prev.map((l) =>
                        l.id === lawyerId ? { ...l, plan: result.plan } : l
                    )
                );
                const planLabel = PLAN_LABELS[result.plan] || result.plan;
                toast.success(`${result.name || "변호사"} → ${planLabel} 변경 완료`);
            } else {
                const data = await res.json();
                toast.error(`플랜 변경 실패: ${data.error}`);
            }
        } catch {
            toast.error("플랜 변경 중 오류가 발생했습니다.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteLawyer = async (lawyerId: string, lawyerName: string) => {
        if (!confirm(`정말 ${lawyerName} 변호사를 탈퇴 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }
        setDeletingId(lawyerId);
        try {
            const res = await fetch(`/api/admin/lawyers?id=${lawyerId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(`탈퇴 처리 실패: ${data.error || "서버 오류"}`);
                return;
            }
            setLawyers((prev) => prev.filter((lawyer) => lawyer.id !== lawyerId));
            setTotal((prev) => Math.max(0, prev - 1));
            toast.success(`${lawyerName} 변호사가 탈퇴 처리되었습니다.`);
        } catch {
            toast.error("탈퇴 처리 중 오류가 발생했습니다.");
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = search
        ? lawyers.filter(
            (l) =>
                l.name.includes(search) ||
                l.email?.includes(search) ||
                l.office_name?.includes(search)
        )
        : lawyers;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-[#3563AE]" />
                        변호사 관리
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-1">전체 {total}명</p>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                    <input
                        type="text"
                        placeholder="이름, 이메일, 사무소 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-lg bg-[#1A1F2E] border border-[#2A3040] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] w-60"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="rounded-xl bg-[#111827] border border-[#1F2937] overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead>
                            <tr className="border-b border-[#1F2937]">
                                <th className="text-left px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">변호사</th>
                                <th className="text-left px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">사무소</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">업로드</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">콘텐츠</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">요금제</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">관리</th>
                                <th className="text-right px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">가입일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((lawyer) => {
                                const currentPlan = lawyer.plan || lawyer.subscription?.plan || "free";
                                return (
                                    <tr key={lawyer.id} className="border-b border-[#1F2937] hover:bg-[#1A1F2E] transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-white">{lawyer.name}</p>
                                            <p className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                                                <Mail size={10} /> {lawyer.email || "—"}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-[#9CA3B0] flex items-center gap-1">
                                                <Briefcase size={12} /> {lawyer.office_name || "—"}
                                            </p>
                                            {lawyer.region && (
                                                <p className="text-[11px] text-[#4B5563] flex items-center gap-1 mt-0.5">
                                                    <MapPin size={10} /> {lawyer.region}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-white font-medium">{lawyer.uploads_count}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-white font-medium">{lawyer.contents_count}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <select
                                                value={currentPlan}
                                                onChange={(e) => handlePlanChange(lawyer.id, e.target.value)}
                                                disabled={updatingId === lawyer.id}
                                                aria-label={`${lawyer.name} 요금제`}
                                                className={`text-[11px] px-2 py-1 rounded-lg font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3563AE] ${
                                                    updatingId === lawyer.id ? "opacity-50" : ""
                                                } ${
                                                    currentPlan === "unlimited" || currentPlan === "pro"
                                                        ? "text-emerald-400 bg-emerald-400/10"
                                                        : currentPlan !== "free"
                                                        ? "text-blue-400 bg-blue-400/10"
                                                        : "text-[#6B7280] bg-[#1F2937]"
                                                }`}
                                            >
                                                {PLAN_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="inline-flex items-center gap-2 justify-center">
                                                <button
                                                    onClick={() => handleDeleteLawyer(lawyer.id, lawyer.name)}
                                                    disabled={deletingId === lawyer.id}
                                                    className={`px-2 py-1 rounded-lg text-[11px] font-medium border border-red-500 text-red-300 bg-red-500/10 hover:bg-red-500/15 transition-colors flex items-center gap-1 ${deletingId === lawyer.id ? "opacity-40 cursor-not-allowed" : ""}`}
                                                >
                                                    <Trash2 size={12} /> 탈퇴
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-[11px] text-[#6B7280]">
                                            {new Date(lawyer.created_at).toLocaleDateString("ko-KR")}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-[#4B5563]">
                                        변호사 데이터가 없습니다
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {total > 20 && (
                        <div className="px-4 py-3 border-t border-[#1F2937] flex items-center justify-between">
                            <p className="text-[11px] text-[#6B7280]">
                                {(page - 1) * 20 + 1}~{Math.min(page * 20, total)} / 전체 {total}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 text-xs text-[#9CA3B0] bg-[#1A1F2E] rounded-lg disabled:opacity-30"
                                >
                                    이전
                                </button>
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page * 20 >= total}
                                    className="px-3 py-1 text-xs text-[#9CA3B0] bg-[#1A1F2E] rounded-lg disabled:opacity-30"
                                >
                                    다음
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
