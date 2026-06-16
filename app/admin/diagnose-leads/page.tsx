"use client";

import { useEffect, useState } from "react";
import { Stethoscope, Loader2, ExternalLink } from "lucide-react";

interface Lead {
    id: string;
    name: string;
    field: string;
    phone: string;
    email: string;
    blogUrl: string;
    score: number | null;
    status: string;
    created_at: string;
}

const STATUS_OPTIONS = [
    { value: "unread", label: "신규" },
    { value: "contacted", label: "연락완료" },
    { value: "closed", label: "종료" },
];

export default function DiagnoseLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        fetch("/api/admin/diagnose-leads", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setLeads(d.leads || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: string) => {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
        await fetch("/api/admin/diagnose-leads", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id, status }),
        });
    };

    const scoreColor = (s: number | null) =>
        s == null ? "#6B7280" : s >= 75 ? "#34D399" : s >= 55 ? "#FBBF24" : "#F87171";

    const newCount = leads.filter((l) => l.status === "unread").length;

    return (
        <div className="max-w-6xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#3563AE]/15 flex items-center justify-center">
                    <Stethoscope size={18} className="text-[#3563AE]" />
                </div>
                <h1 className="text-xl font-bold text-white">무료 진단 리드</h1>
                {newCount > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">
                        신규 {newCount}
                    </span>
                )}
            </div>
            <p className="text-[13px] text-[#6B7280] mb-7">무료 AI 진단을 받은 변호사 리드입니다. 진단 직후라 관심도가 높습니다 — 빠르게 후속 연락하세요.</p>

            {loading ? (
                <div className="flex items-center gap-2 text-[#6B7280] text-sm py-10">
                    <Loader2 size={16} className="animate-spin" /> 불러오는 중…
                </div>
            ) : leads.length === 0 ? (
                <div className="bg-[#0F1320] border border-[#1A2035] rounded-xl p-10 text-center text-[#6B7280] text-sm">
                    아직 진단 리드가 없습니다.
                </div>
            ) : (
                <div className="bg-[#0F1320] border border-[#1A2035] rounded-xl overflow-hidden">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="text-[#6B7280] text-[11px] uppercase tracking-wider border-b border-[#1A2035]">
                                <th className="text-left font-medium px-4 py-3">점수</th>
                                <th className="text-left font-medium px-4 py-3">이름 / 분야</th>
                                <th className="text-left font-medium px-4 py-3">연락처</th>
                                <th className="text-left font-medium px-4 py-3">블로그</th>
                                <th className="text-left font-medium px-4 py-3">신청일</th>
                                <th className="text-left font-medium px-4 py-3">상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((l) => (
                                <tr key={l.id} className="border-b border-[#1A2035]/60 hover:bg-[#141A2C]">
                                    <td className="px-4 py-3">
                                        <span className="font-bold" style={{ color: scoreColor(l.score) }}>
                                            {l.score ?? "-"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-white font-medium">{l.name}</div>
                                        {l.field && <div className="text-[#6B7280] text-[11px]">{l.field}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-[#9CA3B0]">
                                        <div>{l.phone || "-"}</div>
                                        {l.email && <div className="text-[#6B7280] text-[11px]">{l.email}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {l.blogUrl ? (
                                            <a href={l.blogUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#3563AE] hover:underline max-w-[180px] truncate">
                                                <span className="truncate">{l.blogUrl.replace(/^https?:\/\//, "")}</span>
                                                <ExternalLink size={11} className="shrink-0" />
                                            </a>
                                        ) : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-[#6B7280]">
                                        {new Date(l.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={STATUS_OPTIONS.some((s) => s.value === l.status) ? l.status : "unread"}
                                            onChange={(e) => updateStatus(l.id, e.target.value)}
                                            className="bg-[#0B0F1A] border border-[#1A2035] rounded-md px-2 py-1 text-[12px] text-white focus:outline-none focus:border-[#3563AE]"
                                        >
                                            {STATUS_OPTIONS.map((s) => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
