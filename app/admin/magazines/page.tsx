"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Search, Eye, Pencil, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";

interface Magazine {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    status: string;
    view_count: number;
    seo_score: number;
    created_at: string;
    published_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: "초안", color: "text-[#6B7280] bg-[#1F2937]" },
    published: { label: "발행됨", color: "text-emerald-400 bg-emerald-400/10" },
    archived: { label: "보관", color: "text-amber-400 bg-amber-400/10" },
};

export default function AdminMagazinesPage() {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchMagazines = () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (statusFilter) params.set("status", statusFilter);

        fetch(`/api/admin/magazines?${params}`)
            .then((res) => res.json())
            .then((data) => {
                setMagazines(data.magazines || []);
                setTotal(data.total || 0);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMagazines(); }, [page, statusFilter]);

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        await fetch(`/api/admin/magazines?id=${id}`, { method: "DELETE" });
        fetchMagazines();
    };

    const handleTogglePublish = async (magazine: Magazine) => {
        const newStatus = magazine.status === "published" ? "draft" : "published";
        await fetch("/api/admin/magazines", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: magazine.id, status: newStatus }),
        });
        fetchMagazines();
    };

    const filtered = search
        ? magazines.filter((m) => m.title.includes(search) || m.category.includes(search))
        : magazines;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen size={20} className="text-[#F59E0B]" />
                        매거진 관리
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-1">전체 {total}개</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                        <input type="text" placeholder="제목 검색" value={search} onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg bg-[#1A1F2E] border border-[#2A3040] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] w-48" />
                    </div>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-lg bg-[#1A1F2E] border border-[#2A3040] text-white text-sm focus:outline-none">
                        <option value="">전체 상태</option>
                        <option value="draft">초안</option>
                        <option value="published">발행됨</option>
                    </select>
                    <Link href="/admin/magazines/write"
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#3563AE] text-white text-sm rounded-lg hover:bg-[#2A4F8A] transition-colors">
                        <Plus size={14} /> 새 글 작성
                    </Link>
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
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">카테고리</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">SEO</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">조회수</th>
                                <th className="text-center px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">상태</th>
                                <th className="text-right px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((m) => {
                                const st = STATUS_MAP[m.status] || STATUS_MAP.draft;
                                const seoColor = m.seo_score >= 70 ? "text-emerald-400" : m.seo_score >= 40 ? "text-amber-400" : "text-red-400";
                                return (
                                    <tr key={m.id} className="border-b border-[#1F2937] hover:bg-[#1A1F2E] transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-white truncate max-w-[300px]">{m.title}</p>
                                            <p className="text-[10px] text-[#4B5563] mt-0.5">{m.published_at ? new Date(m.published_at).toLocaleDateString("ko-KR") : new Date(m.created_at).toLocaleDateString("ko-KR")}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-[11px] px-2 py-0.5 rounded-full text-[#9CA3B0] bg-[#1F2937]">{m.category}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-sm font-bold ${seoColor}`}>{m.seo_score}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-[#9CA3B0]">
                                            <span className="flex items-center justify-center gap-1"><Eye size={12} /> {m.view_count}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => handleTogglePublish(m)} className={`text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 ${st.color}`}>
                                                {st.label}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Link href={`/magazine/${m.slug}`} target="_blank"
                                                    className="p-1.5 rounded-md hover:bg-[#1F2937] text-[#6B7280] hover:text-white transition-colors">
                                                    <Eye size={14} />
                                                </Link>
                                                <Link href={`/admin/magazines/write?id=${m.id}`}
                                                    className="p-1.5 rounded-md hover:bg-[#1F2937] text-[#6B7280] hover:text-white transition-colors">
                                                    <Pencil size={14} />
                                                </Link>
                                                <button onClick={() => handleDelete(m.id)}
                                                    className="p-1.5 rounded-md hover:bg-red-500/10 text-[#6B7280] hover:text-red-400 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-[#4B5563]">
                                        <Sparkles size={20} className="mx-auto mb-2 text-[#F59E0B]" />
                                        매거진 기사가 없습니다. 새 글을 작성해 보세요!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {total > 20 && (
                        <div className="px-4 py-3 border-t border-[#1F2937] flex items-center justify-between">
                            <p className="text-[11px] text-[#6B7280]">{(page - 1) * 20 + 1}~{Math.min(page * 20, total)} / {total}</p>
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
