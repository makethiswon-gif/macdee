"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Filter } from "lucide-react";

interface Content {
    id: string;
    channel: string;
    title: string;
    status: string;
    created_at: string;
    lawyer_name: string;
    office_name: string;
}

const CHANNEL_LABELS: Record<string, { label: string; color: string }> = {
    blog: { label: "블로그", color: "text-blue-400 bg-blue-400/10" },
    instagram: { label: "인스타", color: "text-pink-400 bg-pink-400/10" },
    macdee: { label: "SEO", color: "text-emerald-400 bg-emerald-400/10" },
    google: { label: "구글", color: "text-amber-400 bg-amber-400/10" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: "초안", color: "text-[#6B7280] bg-[#1F2937]" },
    review: { label: "검토중", color: "text-amber-400 bg-amber-400/10" },
    approved: { label: "승인", color: "text-blue-400 bg-blue-400/10" },
    published: { label: "발행됨", color: "text-emerald-400 bg-emerald-400/10" },
    failed: { label: "실패", color: "text-red-400 bg-red-400/10" },
};

export default function AdminContentsPage() {
    const [contents, setContents] = useState<Content[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [channelFilter, setChannelFilter] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (statusFilter) params.set("status", statusFilter);
        if (channelFilter) params.set("channel", channelFilter);

        fetch(`/api/admin/contents?${params}`)
            .then((res) => res.json())
            .then((data) => {
                setContents(data.contents || []);
                setTotal(data.total || 0);
            })
            .finally(() => setLoading(false));
    }, [page, statusFilter, channelFilter]);

    const filtered = search
        ? contents.filter(
            (c) =>
                c.title?.includes(search) ||
                c.lawyer_name?.includes(search)
        )
        : contents;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText size={20} className="text-[#06B6D4]" />
                        콘텐츠 관리
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-1">전체 {total}개</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                        <input
                            type="text"
                            placeholder="제목, 변호사 검색"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg bg-[#1A1F2E] border border-[#2A3040] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] w-48"
                        />
                    </div>
                    <select
                        value={channelFilter}
                        onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-[#1A1F2E] border border-[#2A3040] text-white text-sm focus:outline-none"
                    >
                        <option value="">전체 채널</option>
                        <option value="blog">블로그</option>
                        <option value="instagram">인스타</option>
                        <option value="macdee">SEO</option>
                        <option value="google">구글</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-[#1A1F2E] border border-[#2A3040] text-white text-sm focus:outline-none"
                    >
                        <option value="">전체 상태</option>
                        <option value="draft">초안</option>
                        <option value="published">발행됨</option>
                        <option value="failed">실패</option>
                    </select>
                    <Filter size={14} className="text-[#4B5563]" />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="rounded-xl bg-[#111827] border border-[#1F2937] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1F2937]">
                                <th className="text-left px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">제목</th>
                                <th className="text-left px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">변호사</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">채널</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">상태</th>
                                <th className="text-right px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">생성일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((content) => {
                                const ch = CHANNEL_LABELS[content.channel] || { label: content.channel, color: "text-[#6B7280] bg-[#1F2937]" };
                                const st = STATUS_MAP[content.status] || { label: content.status, color: "text-[#6B7280] bg-[#1F2937]" };
                                return (
                                    <tr key={content.id} className="border-b border-[#1F2937] hover:bg-[#1A1F2E] transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-white truncate max-w-[280px]">{content.title || "제목 없음"}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-[#9CA3B0]">{content.lawyer_name}</p>
                                            <p className="text-[10px] text-[#4B5563]">{content.office_name}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ch.color}`}>
                                                {ch.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-[11px] text-[#6B7280]">
                                            {new Date(content.created_at).toLocaleDateString("ko-KR")}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-[#4B5563]">
                                        콘텐츠가 없습니다
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
                                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs text-[#9CA3B0] bg-[#1A1F2E] rounded-lg disabled:opacity-30">이전</button>
                                <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total} className="px-3 py-1 text-xs text-[#9CA3B0] bg-[#1A1F2E] rounded-lg disabled:opacity-30">다음</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
